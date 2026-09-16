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

  /* Подпись храма ставится с той стороны иконки, где свободно:
   * по умолчанию справа, Лунно — слева (справа идёт нитка на Дубно). */
  var LABEL_LEFT = { lunno: true };

  function markerLabel(point) {
    var left = LABEL_LEFT[point.slug];
    var x = (point.x + (left ? -27 : 27)).toFixed(1);
    var anchor = left ? ' text-anchor="end"' : "";
    return '<text class="map-marker-label"' + anchor + ' x="' + x + '" y="' + (point.y - 14).toFixed(1) + '">' + H.escape(point.label) + '</text>';
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
    return '<g class="map-town" pointer-events="none">' +
      '<circle class="map-town-dot" cx="' + mosty.x.toFixed(1) + '" cy="' + mosty.y.toFixed(1) + '" r="5"/>' +
      '<text class="map-town-label" x="' + (mosty.x + 12).toFixed(1) + '" y="' + (mosty.y + 5).toFixed(1) + '">г. Мосты</text>' +
      '</g>';
  }

  /* Ярлык сидит на своей линии: стартуем с заданной доли длины и идём
   * по цепочке, пока точка не окажется внутри кадра и подальше от нитки
   * маршрута (ярлык не должен читаться как подпись нитки). */
  var REF_AT = { "М6": 0.62, "Р41": 0.95, "Р44": 0.4 };

  function refLabelAt(chains, fraction) {
    var chain = chains[0];
    if (!chain || !chain.length) { return null; }
    var start = Math.floor(chain.length * fraction);
    for (var d = 0; d < chain.length; d++) {
      var idx = start + (d % 2 === 0 ? d / 2 : -(d + 1) / 2);
      if (idx < 0 || idx >= chain.length) { continue; }
      var p = G.project(chain[idx][1], chain[idx][0]);
      /* У верхней кромки кадра проходит М6: пускаем туда подпись под линией. */
      var inFrame = p.x > 50 && p.x < G.W - 50 && p.y > 8 && p.y < G.H - 30;
      if (!inFrame) { continue; }
      var nearRoute = G.ROUTE_ROADS.some(function (leg) {
        return leg.some(function (q) {
          var r = G.project(q[1], q[0]);
          return Math.abs(r.x - p.x) < 22 && Math.abs(r.y - p.y) < 14;
        });
      });
      if (!nearRoute) { p.below = p.y < 34; return p; }
    }
    return null;
  }

  function roadRefLabels() {
    var refs = [[G.M6, "М6"], [G.R41, "Р41"], [G.R44, "Р44"]];
    return refs.map(function (item) {
      var chains = item[0].slice().sort(function (a, b) { return b.length - a.length; });
      var p = refLabelAt(chains, REF_AT[item[1]] || 0.5);
      if (!p) { return ""; }
      var ly = p.below ? p.y + 16 : p.y - 6;
      return '<text class="map-road-ref" x="' + (p.x + 6).toFixed(1) + '" y="' + ly.toFixed(1) + '">' + item[1] + '</text>';
    }).join("");
  }

  function legendHtml() {
    return '<div class="legend">' +
      '<span class="legend-item">' + H.icon("legend-icon") +
      '<span>остановка маршрута: иконка церкви с номером шага</span></span>' +
      '<span class="legend-item"><span class="legend-route"></span><span>нитка маршрута по дорогам</span></span>' +
      '<span class="legend-item"><span class="legend-road"></span><span>автодороги, М6 · Р41 · Р44</span></span>' +
      '<span class="legend-item"><span class="legend-rail"></span><span>железная дорога</span></span>' +
      '</div>';
  }

  function roadPaths(list, cls) {
    return list.map(function (road) { return '<path class="' + cls + '" d="' + G.pathString(road, false) + '"/>'; }).join("");
  }

  /* Перегон из Гродно входит в кадр слева: подписываем вход, чтобы нитка
   * не начиналась «из ниоткуда». */
  function routeEntryLabel() {
    var leg = G.ROUTE_ROADS[0];
    for (var i = 0; i < leg.length; i++) {
      if (leg[i][0] >= 24.057) {
        var p = G.project(leg[i][1], leg[i][0]);
        return '<text class="map-entry-label" x="' + (p.x + 8).toFixed(1) + '" y="' + (p.y - 8).toFixed(1) + '">из Гродно →</text>';
      }
    }
    return "";
  }

  function backgroundHtml() {
    var riverAnchor = G.project(53.478, 24.34);
    return '<g class="map-background" aria-hidden="true" pointer-events="none">' +
      '<path class="map-district" pointer-events="none" d="' + G.pathString(G.DISTRICT, true) + '"/>' +
      roadPaths(G.RAIL, "map-rail") +
      roadPaths(G.RAIL, "map-rail-crosstie") +
      roadPaths(G.R44, "map-road") +
      roadPaths(G.R41, "map-road") +
      roadPaths(G.M6, "map-motorway") +
      '<path class="map-river" d="' + G.RIVER.map(function (part) { return G.pathString(part, false); }).join(" ") + '"/>' +
      '<text class="map-water-label" x="' + riverAnchor.x.toFixed(1) + '" y="' + (riverAnchor.y - 10).toFixed(1) + '">р. Неман</text>' +
      roadRefLabels() +
      placeLabels() +
      routeEntryLabel() +
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
