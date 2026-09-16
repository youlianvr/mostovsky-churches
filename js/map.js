/* Интерфейс карты-схемы: единственный владелец SVG-разметки схемы, её
 * подписей и поведения (клик, клавиатура, горизонтальная прокрутка).
 * Данные приходят извне: точки считает map-geometry по порядку из роутера.
 * Геометрия подложки — настоящая (OpenStreetMap); на схеме обязательна
 * атрибуция данных OSM. */
(function () {
  "use strict";
  var G = window.ChurchMapGeometry;
  var R = window.ChurchRouter;
  var H = window.ChurchHtml;

  function markerLabel(point) {
    var x = (point.x + 27).toFixed(1), y = (point.y - 14).toFixed(1);
    return '<text class="map-marker-label" x="' + x + '" y="' + y + '">' + H.escape(point.label) + '</text>';
  }

  /* Иконка стоит над точкой: низ иконки совпадает с координатой храма. */
  function marker(point) {
    var x = point.x.toFixed(1), y = point.y.toFixed(1);
    return '<a class="map-marker-g" href="#/' + H.escape(point.slug) + '" data-slug="' + H.escape(point.slug) +
      '" data-step="' + point.step + '" role="link" tabindex="0" aria-label="' +
      H.escape(point.name + ', ' + point.settlement) + '">' +
      '<g transform="translate(' + x + ',' + y + ')">' +
      '<circle class="map-marker-halo" cx="0" cy="-20" r="25" aria-hidden="true"/>' +
      H.icon("map-marker-icon", 'x="-20" y="-44" width="40" height="46"') +
      '<circle class="map-marker-badge" cx="15" cy="-5" r="10" aria-hidden="true"/>' +
      '<text class="map-marker-num" x="15" y="-5" aria-hidden="true">' + point.step + '</text>' +
      '</g>' + markerLabel(point) + '</a>';
  }

  function legendHtml() {
    return '<div class="legend">' +
      '<span class="legend-item">' + H.icon("legend-icon") +
      '<span>остановка маршрута: иконка церкви с номером шага</span></span>' +
      '<span class="legend-item"><span class="legend-route"></span><span>нитка маршрута</span></span>' +
      '</div>';
  }

  function backgroundHtml() {
    var riverMid = G.RIVER[0][Math.floor(G.RIVER[0].length / 2)];
    var riverPos = G.pointString(riverMid[1], riverMid[0]).split(",");
    return '<g class="map-background" aria-hidden="true" pointer-events="none">' +
      '<path class="map-district" pointer-events="none" d="' + G.pathString(G.DISTRICT, true) + '"/>' +
      '<path class="map-river" d="' + G.RIVER.map(function (part) { return G.pathString(part, false); }).join(" ") + '"/>' +
      '<text class="map-water-label" x="' + riverPos[0] + '" y="' + (parseFloat(riverPos[1]) - 8) + '">р. Неман</text>' +
      G.ROADS.map(function (road) { return '<path class="map-road" d="' + G.pathString(road, false) + '"/>'; }).join("") +
      '</g>';
  }

  function svgHtml(points) {
    var routeLine = points.map(function (p) { return p.x.toFixed(1) + "," + p.y.toFixed(1); }).join(" ");
    return '<svg viewBox="0 0 ' + G.W + ' ' + G.H + '" xmlns="http://www.w3.org/2000/svg" role="img" ' +
      'aria-label="Схема маршрута по трём храмам Мостовского района">' +
      backgroundHtml() +
      '<polyline class="map-route-line-casing" points="' + routeLine + '"/>' +
      '<polyline class="map-route-line" points="' + routeLine + '"/>' +
      points.map(marker).join("") + '</svg>';
  }

  /* Аффорданс горизонтальной прокрутки: подсказка и краевые тени видны
   * только пока схема действительно не помещается по ширине. */
  function wireScrollAffordance(box) {
    if (!box) { return; }
    function update() {
      var max = box.scrollWidth - box.clientWidth;
      if (max <= 2) {
        box.classList.remove("is-scrollable", "is-at-start", "is-at-end");
        return;
      }
      box.classList.add("is-scrollable");
      box.classList.toggle("is-at-start", box.scrollLeft <= 2);
      box.classList.toggle("is-at-end", box.scrollLeft >= max - 2);
    }
    box.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* Иконка — обычная ссылка, но в SVG она внутри <a>; дублируем активацию
   * с клавиатуры для надёжности. */
  function wireActivation(element) {
    function open(target) {
      var group = target && target.closest ? target.closest("[data-slug]") : null;
      if (!group) { return false; }
      window.location.hash = "#/" + group.getAttribute("data-slug");
      return true;
    }
    element.addEventListener("click", function (event) { open(event.target); });
    element.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") { return; }
      if (open(event.target)) { event.preventDefault(); }
    });
  }

  function renderSchema(element) {
    var points = G.routePoints(ROUTE.map(R.findChurchBySlug));
    element.innerHTML = svgHtml(points) + legendHtml() +
      '<p class="map-attribution">Геометрия района, река и дороги — ' +
      '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">' +
      '© OpenStreetMap contributors</a> (ODbL 1.0)</p>' +
      '<p class="map-scroll-hint" aria-hidden="true">Схема широкая — прокручивайте <span class="map-scroll-arrow">→</span></p>';
    wireScrollAffordance(element);
    wireActivation(element);
  }

  window.ChurchMap = { renderSchema: renderSchema };
})();
