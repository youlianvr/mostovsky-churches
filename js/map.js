/* ============================================================
 * Храмы Мостовского района — схематичная SVG-карта (этап 5)
 *
 * Схема, а не геоподложка: упрощённые контур, река, дороги, лес.
 * Координаты меток — реальные lat/lon, спроецированные линейно
 * (равноугольная проекция, район компактный).
 *
 * DG4 (дефолт): слитые точки (Мосты ×4, Лунно ×2, Пески ×2)
 * — общая метка-кластер, клик раскрывает выбор храмов.
 * Одиночные метки ведут на страницу храма напрямую.
 *
 * Линия маршрута проходит точки в порядке ROUTE (1 → 19).
 * Подписи: авторазрешение коллизий (вертикальное разведение +
 * смена стороны) — метки остаются читаемыми, в т.ч. при плотных
 * скоплениях (Белавичи/Пацевичи/Струбница на юге).
 * ============================================================ */

(function () {
  "use strict";

  var LON_MIN = 24.10, LON_MAX = 24.94;
  var LAT_MIN = 53.23, LAT_MAX = 53.55;
  var W = 1000, H = 620;

  /* --- Геометрия --- */

  function findChurch(slug) {
    var i;
    for (i = 0; i < CHURCHES.length; i++) {
      if (CHURCHES[i].slug === slug) { return CHURCHES[i]; }
    }
    return null;
  }

  function proj(lat, lon) {
    return {
      x: (lon - LON_MIN) / (LON_MAX - LON_MIN) * W,
      y: (LAT_MAX - lat) / (LAT_MAX - LAT_MIN) * H
    };
  }

  /* Нормализация НП: «д. Лунно»/«аг. Лунно» → «Лунно»; без скобок */
  function normSettlement(s) {
    return String(s)
      .replace(/^(д\.|аг\.|пос\.|г\.)\s*/i, "")
      .replace(/\s*\(.*\)$/, "")
      .trim();
  }

  /* --- Данные схемы (чистые функции — тестируются в node) --- */

  function buildSchemaData() {
    var i, p, c, pts = [], bySettlement = {};

    for (i = 0; i < ROUTE.length; i++) {
      c = findChurch(ROUTE[i]);
      p = proj(c.coords.lat, c.coords.lon);
      pts.push({
        slug: c.slug,
        name: c.name,
        settlement: c.settlement,
        shortName: normSettlement(c.settlement),
        confession: c.confession,
        step: i + 1,
        x: p.x,
        y: p.y
      });
    }

    /* Кластеры: одинаковый НП → одна группа (DG4).
     * Мосты ×4, Лунно ×2, Пески ×2; остальные — одиночные. */
    for (i = 0; i < pts.length; i++) {
      var key = pts[i].shortName;
      if (!bySettlement[key]) { bySettlement[key] = []; }
      bySettlement[key].push(pts[i]);
    }

    var clusters = [], singles = [];
    for (var k in bySettlement) {
      var members = bySettlement[k];
      if (members.length > 1) {
        var cx = 0, cy = 0, m;
        for (m = 0; m < members.length; m++) { cx += members[m].x; cy += members[m].y; }
        clusters.push({
          name: k,
          members: members,
          x: cx / members.length,
          y: cy / members.length
        });
      } else {
        singles.push(members[0]);
      }
    }
    clusters.sort(function (a, b) { return a.members[0].step - b.members[0].step; });
    singles.sort(function (a, b) { return a.step - b.step; });

    return { points: pts, clusters: clusters, singles: singles };
  }

  /* --- Статичные элементы схемы (стилизация под старую карту) --- */

  var DISTRICT = [
    [24.16, 53.52], [24.38, 53.54], [24.62, 53.53], [24.82, 53.50],
    [24.94, 53.44], [24.91, 53.35], [24.74, 53.26], [24.50, 53.24],
    [24.26, 53.25], [24.12, 53.33], [24.11, 53.44], [24.16, 53.52]
  ];

  var RIVER = [
    [24.94, 53.33], [24.78, 53.39], [24.60, 53.42], [24.54, 53.423],
    [24.42, 53.44], [24.33, 53.452], [24.26, 53.455], [24.14, 53.47], [24.10, 53.49]
  ];

  var ROADS = [
    [[24.10, 53.47], [24.26, 53.455], [24.42, 53.44], [24.54, 53.423], [24.66, 53.435], [24.78, 53.44]],
    [[24.54, 53.423], [24.54, 53.37], [24.545, 53.3274], [24.59, 53.31], [24.63, 53.355]],
    [[24.63, 53.355], [24.69, 53.32], [24.70, 53.3121], [24.76, 53.30], [24.88, 53.35]],
    [[24.54, 53.423], [24.60, 53.45], [24.68, 53.49], [24.72, 53.51]]
  ];

  var FORESTS = [
    [24.18, 53.40, 58, 34],
    [24.30, 53.30, 70, 40],
    [24.62, 53.28, 62, 30],
    [24.78, 53.42, 66, 36],
    [24.44, 53.36, 48, 26],
    [24.86, 53.30, 44, 24]
  ];

  function pt(lat, lon) { var p = proj(lat, lon); return p.x.toFixed(1) + "," + p.y.toFixed(1); }

  function riverPath() {
    var d = "M " + pt(RIVER[0][0], RIVER[0][1]);
    for (var i = 1; i < RIVER.length; i++) { d += " L " + pt(RIVER[i][0], RIVER[i][1]); }
    return d;
  }

  function districtPath() {
    var d = "M " + pt(DISTRICT[0][0], DISTRICT[0][1]);
    for (var i = 1; i < DISTRICT.length; i++) { d += " L " + pt(DISTRICT[i][0], DISTRICT[i][1]); }
    return d + " Z";
  }

  function roadPath(road) {
    var d = "M " + pt(road[0][0], road[0][1]);
    for (var i = 1; i < road.length; i++) { d += " L " + pt(road[i][0], road[i][1]); }
    return d;
  }

  /* --- Разрешение коллизий подписей ---
   * Стратегия: изначально подпись справа от метки. При пересечении
   * подпись-подпись — вертикальное разведение (верхняя выше, нижняя
   * ниже); при пересечении с чужим кружком — смена стороны.
   * Детерминированно, до 8 проходов. */
  function resolveLabelCollisions(svg) {
    var labels = Array.prototype.slice.call(svg.querySelectorAll(".map-marker-label"));
    var pass, i, j, changed;

    labels.forEach(function (t) {
      t.__side = "right";
      t.__dy = 0;
      t.__flipped = false;
    });

    function boxes() {
      var arr = [];
      labels.forEach(function (t) {
        var mx = parseFloat(t.getAttribute("data-mx"));
        var my = parseFloat(t.getAttribute("data-my"));
        var x = t.__side === "right" ? mx : mx - 36;
        var y = my + t.__dy;
        t.setAttribute("x", x);
        t.setAttribute("y", y);
        t.setAttribute("text-anchor", t.__side === "right" ? "start" : "end");
        var b = t.getBBox();
        arr.push({ type: "label", el: t, step: parseInt(t.getAttribute("data-step"), 10),
                   my: my, x: b.x, y: b.y, w: b.width, h: b.height });
      });
      Array.prototype.slice.call(svg.querySelectorAll(".map-marker")).forEach(function (c) {
        var b = c.getBBox();
        var step = 0;
        var par = c.parentNode;
        if (par && par.getAttribute) { step = parseInt(par.getAttribute("data-step"), 10) || 0; }
        arr.push({ type: "circle", step: step, x: b.x, y: b.y, w: b.width, h: b.height });
      });
      return arr;
    }

    function hit(a, b) {
      return Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 2 &&
             Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 2;
    }

    function flipSide(t) {
      t.__side = t.__side === "right" ? "left" : "right";
      t.__flipped = true;
    }

    for (pass = 0; pass < 8; pass++) {
      changed = false;
      var all = boxes();
      for (i = 0; i < all.length; i++) {
        for (j = i + 1; j < all.length; j++) {
          var a = all[i], b = all[j];
          if (!hit(a, b)) { continue; }
          if (a.type === "label" && b.type === "label") {
            /* разводим по вертикали: верхняя выше, нижняя ниже */
            var upper = a.my <= b.my ? a : b;
            var lower = upper === a ? b : a;
            if (upper.el.__dy > -42) { upper.el.__dy -= 14; changed = true; }
            else if (lower.el.__dy < 42) { lower.el.__dy += 14; changed = true; }
            else if (!upper.el.__flipped) { flipSide(upper.el); changed = true; }
          } else {
            /* подпись против кружка → смена стороны */
            var t = a.type === "label" ? a.el : b.el;
            if (t && !t.__flipped) { flipSide(t); changed = true; }
          }
        }
      }
      if (!changed) { break; }
    }
    labels.forEach(function (t) { delete t.__flipped; });
  }

  /* --- Рендер --- */

  function renderSchema(el) {
    var data = buildSchemaData();
    var i;

    var riverMid = pt(RIVER[Math.floor(RIVER.length / 2)][0], RIVER[Math.floor(RIVER.length / 2)][1]);
    var svg =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Схема маршрута по храмам Мостовского района">' +
      '<path class="map-district" d="' + districtPath() + '"/>' +
      FORESTS.map(function (f) {
        var c = proj(f[1], f[0]);
        return '<ellipse class="map-forest" cx="' + c.x.toFixed(1) + '" cy="' + c.y.toFixed(1) + '" rx="' + f[2] + '" ry="' + f[3] + '"/>';
      }).join("") +
      '<path class="map-river" d="' + riverPath() + '"/>' +
      '<text class="map-water-label" x="' + riverMid.split(",")[0] + '" y="' + (parseFloat(riverMid.split(",")[1]) - 8) + '">р. Неман</text>' +
      ROADS.map(function (r) { return '<path class="map-road" d="' + roadPath(r) + '"/>'; }).join("") +
      '<polyline class="map-route-line" points="' + data.points.map(function (p) { return p.x.toFixed(1) + "," + p.y.toFixed(1); }).join(" ") + '"/>' +
      data.clusters.map(function (cl) {
        var firstStep = cl.members[0].step;
        var label = cl.name + " · " + cl.members.length + " храма";
        return '<g class="map-cluster" data-cluster="' + cl.name + '" data-step="' + firstStep + '" role="button" tabindex="0" aria-label="' +
          cl.name + ': ' + cl.members.length + ' храма — открыть выбор">' +
          '<circle class="map-marker ' + (cl.members[0].confession === "orthodox" ? "orthodox" : "") + '" cx="' + cl.x.toFixed(1) + '" cy="' + cl.y.toFixed(1) + '" r="15"/>' +
          '<text class="map-marker-num" x="' + cl.x.toFixed(1) + '" y="' + cl.y.toFixed(1) + '">' + firstStep + '</text>' +
          '<text class="map-marker-label" data-step="' + firstStep + '" data-mx="' + (cl.x + 20) + '" data-my="' + (cl.y + 4) + '" x="' + (cl.x + 20) + '" y="' + (cl.y + 4) + '">' + label + '</text>' +
          '</g>';
      }).join("") +
      data.singles.map(function (p) {
        var conf = p.confession === "orthodox" ? "orthodox" : "";
        return '<g class="map-marker-g" data-slug="' + p.slug + '" data-step="' + p.step + '" role="link" tabindex="0" aria-label="' + p.name + '">' +
          '<circle class="map-marker ' + conf + '" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="13"/>' +
          '<text class="map-marker-num" x="' + p.x.toFixed(1) + '" y="' + p.y.toFixed(1) + '">' + p.step + '</text>' +
          '<text class="map-marker-label" data-step="' + p.step + '" data-mx="' + (p.x + 18) + '" data-my="' + (p.y + 4) + '" x="' + (p.x + 18) + '" y="' + (p.y + 4) + '">' + p.shortName + '</text>' +
          '</g>';
      }).join("") +
      '</svg>';

    el.innerHTML = svg +
      '<div class="cluster-popup" hidden>' +
        '<button type="button" class="cluster-popup-close" aria-label="Закрыть">×</button>' +
        '<h3 class="cluster-popup-title"></h3>' +
        '<ul class="cluster-popup-list"></ul>' +
      '</div>';

    resolveLabelCollisions(el.querySelector("svg"));

    var popup = el.querySelector(".cluster-popup");
    var popupTitle = el.querySelector(".cluster-popup-title");
    var popupList = el.querySelector(".cluster-popup-list");
    var popupClose = el.querySelector(".cluster-popup-close");

    function showCluster(cluster) {
      popupTitle.textContent = cluster.name + " — " + cluster.members.length + " храма";
      popupList.innerHTML = cluster.members.map(function (m) {
        var conf = m.confession === "orthodox" ? "православный" : "католический";
        return '<li><a href="#/' + m.slug + '"><span class="cluster-step">' + m.step + '</span> ' + m.name + '</a>' +
          '<span class="cluster-conf">' + conf + '</span></li>';
      }).join("");
      popup.hidden = false;
      popupList.querySelector("a").focus();
    }

    function openCluster(name) {
      for (i = 0; i < data.clusters.length; i++) {
        if (data.clusters[i].name === name) { showCluster(data.clusters[i]); return; }
      }
    }

    function openSlug(slug) {
      window.location.hash = "#/" + slug;
    }

    el.addEventListener("click", function (ev) {
      var t = ev.target;
      var g = t.closest ? t.closest("[data-slug], [data-cluster]") : null;
      if (!g) { return; }
      if (g.hasAttribute("data-slug")) { openSlug(g.getAttribute("data-slug")); }
      else { openCluster(g.getAttribute("data-cluster")); }
    });

    el.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter" && ev.key !== " ") { return; }
      var g = ev.target;
      if (!g || !g.hasAttribute) { return; }
      if (g.hasAttribute("data-slug")) { ev.preventDefault(); openSlug(g.getAttribute("data-slug")); }
      else if (g.hasAttribute("data-cluster")) { ev.preventDefault(); openCluster(g.getAttribute("data-cluster")); }
    });

    popupClose.addEventListener("click", function () { popup.hidden = true; });
  }

  window.ChurchMap = {
    renderSchema: renderSchema,
    buildSchemaData: buildSchemaData,
    proj: proj
  };
})();
