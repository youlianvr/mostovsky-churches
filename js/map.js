/* SVG map interface: church-stop icons, route line, marker interaction.
 * Иконка церкви — общий рисунок из js/church-icon.js: одна и та же форма
 * стоит на схеме, в легенде и в списках остановок. */
(function () {
  "use strict";
  var G = window.ChurchMapGeometry;

  function escapeAttr(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function churchIcon(attrs) {
    return window.ChurchIcon.svg("church-icon", attrs);
  }

  function markerLabel(point) {
    var x = (point.x + 27).toFixed(1), y = (point.y - 14).toFixed(1);
    return '<text class="map-marker-label" data-step="' + point.step + '" data-mx="' + x + '" data-my="' + y +
      '" x="' + x + '" y="' + y + '">' + escapeAttr(point.shortName) + '</text>';
  }

  function singleMarkup(point) {
    var x = point.x.toFixed(1), y = point.y.toFixed(1);
    return '<a class="map-marker-g" href="#/' + escapeAttr(point.slug) + '" data-slug="' + escapeAttr(point.slug) +
      '" data-step="' + point.step + '" role="link" tabindex="0" aria-label="' +
      escapeAttr(point.name + ', ' + point.settlement) + '">' +
      '<g transform="translate(' + x + ',' + y + ')">' +
      '<circle class="map-marker-halo" cx="0" cy="-20" r="25" aria-hidden="true"/>' +
      /* Обёртка <g> нужна и для заливки иконки, и для замера bbox при расстановке подписей. */
      '<g class="map-marker-icon">' + churchIcon('x="-20" y="-44" width="40" height="46"') + '</g>' +
      '<circle class="map-marker-badge" cx="15" cy="-5" r="10" aria-hidden="true"/>' +
      '<text class="map-marker-num" x="15" y="-5" aria-hidden="true">' + point.step + '</text>' +
      '</g>' + markerLabel(point) + '</a>';
  }

  function legendHtml() {
    return '<div class="legend">' +
      '<span class="legend-item">' + window.ChurchIcon.svg("church-icon legend-icon") +
      '<span>остановка маршрута: иконка церкви с номером шага</span></span>' +
      '<span class="legend-item"><span class="legend-route"></span><span>нитка маршрута</span></span>' +
      '</div>';
  }

  function renderSvg(data) {
    var mid = Math.floor(G.RIVER.length / 2);
    var riverMid = G.pointString(G.RIVER[mid][1], G.RIVER[mid][0]).split(",");
    var routePoints = data.points.map(function (p) { return p.x.toFixed(1) + "," + p.y.toFixed(1); }).join(" ");
    return '<svg viewBox="0 0 ' + G.W + ' ' + G.H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Схема маршрута по трём храмам Мостовского района">' +
      '<g class="map-background" aria-hidden="true" pointer-events="none">' +
      '<path class="map-district" pointer-events="none" d="' + G.pathString(G.DISTRICT, true) + '"/>' +
      G.FORESTS.map(function (forest) {
        var center = G.project(forest[1], forest[0]);
        return '<ellipse class="map-forest" cx="' + center.x.toFixed(1) + '" cy="' + center.y.toFixed(1) + '" rx="' + forest[2] + '" ry="' + forest[3] + '"/>';
      }).join("") +
      '<path class="map-river" d="' + G.pathString(G.RIVER, false) + '"/>' +
      '<text class="map-water-label" x="' + riverMid[0] + '" y="' + (parseFloat(riverMid[1]) - 8) + '">р. Неман</text>' +
      G.ROADS.map(function (road) { return '<path class="map-road" d="' + G.pathString(road, false) + '"/>'; }).join("") +
      '</g>' +
      '<polyline class="map-route-line-casing" points="' + routePoints + '"/>' +
      '<polyline class="map-route-line" points="' + routePoints + '"/>' +
      data.singles.map(singleMarkup).join("") + '</svg>';
  }

  function renderSchema(el) {
    var data = G.buildSchemaData();
    el.innerHTML = renderSvg(data) + legendHtml() +
      '<p class="map-scroll-hint" aria-hidden="true">Схема широкая — прокручивайте <span class="map-scroll-arrow">→</span></p>';
    var svg = el.querySelector("svg");
    if (svg && G.resolveLabelCollisions) { G.resolveLabelCollisions(svg); }

    /* Аффорданс горизонтального скролла: подсказка и краевые тени видны
     * только пока схема действительно не помещается по ширине. */
    var scrollBox = el.classList.contains("map-schema") ? el : el.querySelector(".map-schema");
    function updateScrollState() {
      if (!scrollBox) { return; }
      var max = scrollBox.scrollWidth - scrollBox.clientWidth;
      if (max <= 2) {
        scrollBox.classList.remove("is-scrollable", "is-at-start", "is-at-end");
        return;
      }
      scrollBox.classList.add("is-scrollable");
      scrollBox.classList.toggle("is-at-start", scrollBox.scrollLeft <= 2);
      scrollBox.classList.toggle("is-at-end", scrollBox.scrollLeft >= max - 2);
    }
    if (scrollBox) {
      scrollBox.addEventListener("scroll", updateScrollState, { passive: true });
      window.addEventListener("resize", updateScrollState);
    }
    updateScrollState();

    /* Иконка — обычная ссылка, но в SVG она внутри <a>; дублируем
     * активацию с клавиатуры для надёжности. */
    el.addEventListener("click", function (event) {
      var group = event.target.closest ? event.target.closest("[data-slug]") : null;
      if (!group) { return; }
      window.location.hash = "#/" + group.getAttribute("data-slug");
    });
    el.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") { return; }
      var group = event.target;
      if (!group || !group.hasAttribute || !group.hasAttribute("data-slug")) { return; }
      event.preventDefault();
      window.location.hash = "#/" + group.getAttribute("data-slug");
    });
  }

  window.ChurchMap = { renderSchema: renderSchema, buildSchemaData: G.buildSchemaData, proj: G.project };
})();
