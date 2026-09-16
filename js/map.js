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

  /* Неподписанные деревни схемы не засоряют: подписываем только город Мосты
   * (конечная точка маршрута) и реку. */
  function placeLabels() {
    var mosty = G.project(53.4134, 24.5428);
    return '<text class="map-town-label" x="' + mosty.x.toFixed(1) + '" y="' + (mosty.y - 14).toFixed(1) + '">г. Мосты</text>';
  }

  function legendHtml() {
    return '<div class="legend">' +
      '<span class="legend-item">' + H.icon("legend-icon") +
      '<span>остановка маршрута: иконка церкви с номером шага</span></span>' +
      '<span class="legend-item"><span class="legend-route"></span><span>нитка маршрута по дорогам</span></span>' +
      '<span class="legend-item"><span class="legend-road"></span><span>М6 · Р41 · Р44</span></span>' +
      '</div>';
  }

  function roadPaths(list, cls) {
    return list.map(function (road) { return '<path class="' + cls + '" d="' + G.pathString(road, false) + '"/>'; }).join("");
  }

  function backgroundHtml() {
    var riverPos = G.project(53.478, 24.34).x.toFixed(1) + "," + (G.project(53.478, 24.34).y - 10).toFixed(1);
    return '<g class="map-background" aria-hidden="true" pointer-events="none">' +
      '<path class="map-district" pointer-events="none" d="' + G.pathString(G.DISTRICT, true) + '"/>' +
      roadPaths(G.R44, "map-road") +
      roadPaths(G.R41, "map-road") +
      roadPaths(G.M6, "map-motorway") +
      '<path class="map-river" d="' + G.RIVER.map(function (part) { return G.pathString(part, false); }).join(" ") + '"/>' +
      '<text class="map-water-label" x="' + riverPos.split(",")[0] + '" y="' + riverPos.split(",")[1] + '">р. Неман</text>' +
      '<text class="map-road-ref" x="' + (G.project(53.438, 24.47).x + 6).toFixed(0) + '" y="' + (G.project(53.438, 24.47).y - 6).toFixed(0) + '">Р41</text>' +
      '<text class="map-road-ref" x="' + (G.project(53.637, 24.30).x + 6).toFixed(0) + '" y="' + (G.project(53.637, 24.30).y - 4).toFixed(0) + '">М6</text>' +
      '<text class="map-road-ref" x="' + (G.project(53.50, 24.05).x + 6).toFixed(0) + '" y="' + (G.project(53.50, 24.05).y - 4).toFixed(0) + '">Р44</text>' +
      placeLabels() +
      '</g>';
  }

  function svgHtml() {
    return '<svg viewBox="0 0 ' + G.W + ' ' + G.H + '" xmlns="http://www.w3.org/2000/svg" role="img" ' +
      'aria-label="Схема маршрута по трём храмам Мостовского района">' +
      backgroundHtml() +
      /* Нитка маршрута — по реальным дорогам (OSRM over OSM), четыре перегона. */
      '<g class="map-route-g">' +
      G.ROUTE_ROADS.map(function (leg) {
        return '<polyline class="map-route-line-casing" points="' +
          leg.map(function (p) { return G.pointString(p[1], p[0]); }).join(" ") + '"/>' +
          '<polyline class="map-route-line" points="' +
          leg.map(function (p) { return G.pointString(p[1], p[0]); }).join(" ") + '"/>';
      }).join("") + '</g>' +
      ROUTE.map(function (slug, index) {
        var c = R.findChurchBySlug(slug);
        var p = G.project(c.coords.lat, c.coords.lon);
        return marker({ slug: c.slug, name: c.name, settlement: c.settlement, label: G.shortLabel ? G.shortLabel(c.settlement) : c.settlement, step: index + 1, x: p.x, y: p.y });
      }).join("") +
      '</svg>';
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
    element.innerHTML = svgHtml() + legendHtml() +
      '<p class="map-attribution">Геометрия района, реки и дорог, автопуть маршрута — ' +
      '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">' +
      '© OpenStreetMap contributors</a> (ODbL 1.0), маршрут — OSRM</p>' +
      '<p class="map-scroll-hint" aria-hidden="true">Схема широкая — прокручивайте <span class="map-scroll-arrow">→</span></p>';
    wireScrollAffordance(element);
    wireActivation(element);
  }

  window.ChurchMap = { renderSchema: renderSchema };
})();
