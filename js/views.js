/* Page views: HTML presentation only. Routing and map state live elsewhere. */
(function () {
  "use strict";
  function resolveApp() { return document.getElementById("app"); }
  var R = window.ChurchRouter;

  function escapeHtml(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function markerHtml(church) {
    var label = "православный храм";
    return '<span class="marker-sample orthodox" title="' + label + '" aria-label="' + label + '"></span>';
  }
  function photoHtml(church) {
    if (!church.placeholder && church.photo) {
      var parts = church.photoCredit.split(" — ");
      var text = parts[0] || church.photoCredit;
      var url = parts.length > 1 ? parts[1] : "";
      var credit = url ? '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + escapeHtml(text) + '</a>' : escapeHtml(text);
      var reviewNote = church.needsLicenseReview ? ' <span class="photo-review-note">(источник уточняется)</span>' : '';
      return '<figure class="church-photo"><img src="' + escapeHtml(church.photo) + '" alt="' + escapeHtml(church.name) + '" loading="lazy"><figcaption>Фото: ' + credit + reviewNote + '</figcaption></figure>';
    }
    if (window.ChurchMapGeometry) {
      /* Honest placeholder: an excerpt of the district scheme centered on
         this stop, so the card carries real information instead of empty text. */
      var G = window.ChurchMapGeometry;
      var p = G.project(church.coords.lat, church.coords.lon);
      var w = 360, h = 220;
      var cx = Math.min(Math.max(p.x, w / 2), G.W - w / 2);
      var cy = Math.min(Math.max(p.y, h / 2), G.H - h / 2);
      return '<div class="photo-placeholder photo-placeholder--map" role="img" aria-label="Фото храма уточняется; фрагмент схемы района с отметкой храма">' +
        '<svg viewBox="' + (cx - w / 2).toFixed(0) + ' ' + (cy - h / 2).toFixed(0) + ' ' + w + ' ' + h + '" aria-hidden="true" focusable="false">' +
        '<path class="ph-district" d="' + G.pathString(G.DISTRICT, true) + '"/>' +
        '<path class="ph-river" d="' + G.pathString(G.RIVER, false) + '"/>' +
        '</svg>' +
        '<span class="ph-marker" aria-hidden="true"></span>' +
        '<span class="ph-caption">Фото уточняется</span></div>';
    }
    return '<div class="photo-placeholder" role="img" aria-label="Фото храма уточняется">Фото уточняется</div>';
  }
  function buildMapLinks(church) {
    return {
      yandex: "https://yandex.ru/maps/?pt=" + church.coords.lon + "," + church.coords.lat + "&z=17",
      osm: "https://www.openstreetmap.org/?mlat=" + church.coords.lat + "&mlon=" + church.coords.lon + "&zoom=17"
    };
  }
  function sourcesHtml(church) {
    return '<section class="source-panel"><h2>Источники</h2><ul class="sources">' + church.sources.map(function (source) { return '<li>' + escapeHtml(source) + '</li>'; }).join("") + '</ul></section>';
  }
  function mapButtonsHtml(church) {
    var links = buildMapLinks(church);
    return '<p class="map-buttons"><a class="btn" href="' + links.yandex + '" target="_blank" rel="noopener">Открыть на Яндекс.Картах</a> <a class="btn btn-ghost" href="' + links.osm + '" target="_blank" rel="noopener">Открыть в OpenStreetMap</a></p>' +
      (church.coordsNote ? '<p class="coords-note">⚠ ' + escapeHtml(church.coordsNote) + '</p>' : '');
  }
  function factsHtml(church, confession) {
    var year = '<dt>Год постройки</dt><dd>' + escapeHtml(church.built) + (church.builtNote ? '<div class="note-inline">' + escapeHtml(church.builtNote) + '</div>' : '') + '</dd>';
    return '<dl class="fact-panel"><dt>Населённый пункт</dt><dd>' + escapeHtml(church.settlement) + '</dd>' + year + '<dt>Конфессия</dt><dd>' + confession + '</dd>' +
      (church.status ? '<dt>Статус</dt><dd>' + escapeHtml(church.status) + '</dd>' : '') + (church.address ? '<dt>Адрес</dt><dd>' + escapeHtml(church.address) + '</dd>' : '') + '</dl>';
  }
  function neighboursHtml(church) {
    var nb = R.routeNeighbours(church);
    return '<nav class="route-nav" aria-label="Навигация по маршруту">' +
      (nb.prev ? '<a class="btn btn-ghost" href="#/' + nb.prev.slug + '">← ' + escapeHtml(nb.prev.shortName || nb.prev.name) + '</a>' : '<span></span>') +
      (nb.next ? '<a class="btn" href="#/' + nb.next.slug + '">' + escapeHtml(nb.next.shortName || nb.next.name) + ' →</a>' : '') + '</nav>';
  }
  /* Map <-> list hover sync: hovering a route card lights up its marker
     and vice versa. Mouse-only events, so touch is unaffected. */
  function wireMapListSync(schema) {
    if (!schema) { return; }
    function markerFor(slug) {
      return schema.querySelector('[data-slug="' + slug + '"]') || schema.querySelector("[data-cluster]");
    }
    function itemFor(slug) {
      return document.querySelector('.route-list li[data-slug="' + slug + '"]');
    }
    Array.prototype.forEach.call(document.querySelectorAll(".route-list li[data-slug]"), function (li) {
      li.addEventListener("mouseenter", function () {
        var m = markerFor(li.getAttribute("data-slug"));
        if (m) { m.classList.add("is-highlighted"); }
      });
      li.addEventListener("mouseleave", function () {
        var m = markerFor(li.getAttribute("data-slug"));
        if (m) { m.classList.remove("is-highlighted"); }
      });
    });
    Array.prototype.forEach.call(schema.querySelectorAll("[data-slug]"), function (m) {
      m.addEventListener("mouseenter", function () {
        var li = itemFor(m.getAttribute("data-slug"));
        if (li) {
          li.classList.add("is-active");
          if (li.scrollIntoView) { li.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
        }
      });
      m.addEventListener("mouseleave", function () {
        var li = itemFor(m.getAttribute("data-slug"));
        if (li) { li.classList.remove("is-active"); }
      });
    });
  }
  /* Decorative route-line ribbon for the hero: same projected points as the
     big schema, squashed and rendered as a dashed ochre line with stops. */
  function heroRibbonHtml() {
    if (!window.ChurchMapGeometry) { return ""; }
    var G = window.ChurchMapGeometry;
    var pts = ROUTE.map(function (slug) {
      var c = R.findChurchBySlug(slug);
      var p = G.project(c.coords.lat, c.coords.lon);
      return { x: p.x, y: p.y };
    });
    var w = 1000, h = 90, sx = w / G.W;
    var minY = Math.min.apply(null, pts.map(function (p) { return p.y; }));
    var maxY = Math.max.apply(null, pts.map(function (p) { return p.y; }));
    var sy = (h - 24) / Math.max(maxY - minY, 1);
    var flat = pts.map(function (p) {
      return (p.x * sx).toFixed(1) + "," + (12 + (p.y - minY) * sy).toFixed(1);
    });
    var dots = flat.map(function (xy, i) {
      var coord = xy.split(",");
      return '<circle cx="' + coord[0] + '" cy="' + coord[1] + '" r="' + (i === 0 || i === flat.length - 1 ? 5 : 3.5) + '"/>';
    }).join("");
    return '<svg class="hero-ribbon" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true" focusable="false">' +
      '<polyline class="hero-ribbon-line" points="' + flat.join(" ") + '"/>' + dots + '</svg>';
  }
  /* Locator map: the district outline with the current stop highlighted.
     Reuses the same projected geometry as the home schema — no new assets. */
  function locatorHtml(church) {
    if (!window.ChurchMapGeometry) { return ""; }
    var G = window.ChurchMapGeometry;
    var pts = ROUTE.map(function (slug) {
      var c = R.findChurchBySlug(slug);
      var p = G.project(c.coords.lat, c.coords.lon);
      return { name: c.shortName, x: p.x, y: p.y, current: c.slug === church.slug };
    });
    var circles = pts.map(function (p) {
      return '<circle class="locator-point' + (p.current ? " is-current" : "") +
        '" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (p.current ? 11 : 6) + '"/>';
    }).join("");
    var cur = pts.filter(function (p) { return p.current; })[0];
    var label = cur ? '<text class="locator-label" x="' + (cur.x + 16).toFixed(1) + '" y="' + (cur.y + 5).toFixed(1) + '">' +
      escapeHtml(church.shortName) + '</text>' : "";
    return '<figure class="locator-map"><svg viewBox="0 0 ' + G.W + ' ' + G.H +
      '" aria-hidden="true" focusable="false">' +
      '<path class="locator-district" d="' + G.pathString(G.DISTRICT, true) + '"/>' +
      '<path class="locator-river" d="' + G.pathString(G.RIVER, false) + '"/>' +
      circles + label + '</svg>' +
      '<figcaption>Положение на схеме района: ' + escapeHtml(church.settlement) + '</figcaption></figure>';
  }
  function renderHome() {
    var app = resolveApp();
    if (!app) { return; }
    var items = ROUTE.map(function (slug, index) {
      var church = R.findChurchBySlug(slug);
      return '<li data-slug="' + church.slug + '"><span class="route-step">' + (index + 1) + '</span>' + markerHtml(church) +
        '<a class="route-name" href="#/' + church.slug + '">' + escapeHtml(church.name) + '</a><span class="route-settlement">' + escapeHtml(church.settlement) + '</span><a class="btn btn-ghost" href="#/' + church.slug + '">Открыть</a></li>';
    }).join("");
    app.innerHTML = '<section class="hero">' + heroRibbonHtml() + '<p class="eyebrow">Исторический маршрут · 3 остановки</p><h1>Храмы Мостовского района</h1><p>Маршрут по трём православным храмам Мостовского района Гродненской области — Гудевичи, Пески и Дубно: сельские церкви XIX века, каждая со своей историей и характером.</p><p class="hero-guide"><strong>С чего начать:</strong> выберите номер на схеме или откройте остановку ниже.</p></section><section class="map-schema" aria-label="Схема маршрута"><div class="legend"><span class="legend-item"><span class="marker-sample orthodox"></span> православный храм</span></div></section><section><h2>Остановки маршрута</h2><ol class="route-list">' + items + '</ol></section>';
    document.title = "Храмы Мостовского района";
    var schema = document.querySelector(".map-schema");
    if (schema && window.ChurchMap) { window.ChurchMap.renderSchema(schema); }
    wireMapListSync(schema);
  }
  function renderChurch(church) {
    var app = resolveApp();
    if (!app) { return; }
    var confession = "православный храм";
    var facts = church.facts.map(function (fact) { return '<li>' + escapeHtml(fact) + '</li>'; }).join("");
    document.title = escapeHtml(church.name) + ' — ' + escapeHtml(church.settlement) + ' · Храмы Мостовского района';
    app.innerHTML = '<p class="crumbs"><a href="#/">Главная</a> → <a href="#/">Маршрут</a> → <strong>' + escapeHtml(church.name) + '</strong></p><article class="church-page"><header class="church-head"><p class="church-eyebrow">Остановка ' + church.routeStep + ' из ' + ROUTE.length + '</p><h1>' + escapeHtml(church.name) + '</h1><p class="church-subtitle">' + markerHtml(church) + ' ' + escapeHtml(church.settlement) + ' · ' + confession + '</p></header><div class="church-side">' + photoHtml(church) + locatorHtml(church) + factsHtml(church, confession) + mapButtonsHtml(church) + '</div><div class="church-body"><h2>История</h2>' + church.history.map(function (paragraph) { return '<p>' + escapeHtml(paragraph) + '</p>'; }).join("") + '<h2>Интересные факты</h2><ul class="facts-list">' + facts + '</ul>' + sourcesHtml(church) + '</div>' + neighboursHtml(church) + '</article>';
  }
  function renderNotFound() {
    var app = resolveApp();
    if (!app) { return; }
    app.innerHTML = '<h1>Храм не найден</h1><p>Такой страницы нет. Возможно, ссылка устарела.</p><p><a class="btn" href="#/">Вернуться к маршруту</a></p>';
  }

  window.ChurchViews = {
    renderHome: renderHome, renderChurch: renderChurch, renderNotFound: renderNotFound,
    buildMapLinks: buildMapLinks
  };
})();
