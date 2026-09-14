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
      return '<figure class="church-photo"><img src="' + escapeHtml(church.photo) + '" alt="' + escapeHtml(church.name) + '" loading="lazy"><figcaption>Фото: ' + credit + '</figcaption></figure>';
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
  function renderHome() {
    var app = resolveApp();
    if (!app) { return; }
    var items = ROUTE.map(function (slug, index) {
      var church = R.findChurchBySlug(slug);
      return '<li data-slug="' + church.slug + '"><span class="route-step">' + (index + 1) + '</span>' + markerHtml(church) +
        '<a class="route-name" href="#/' + church.slug + '">' + escapeHtml(church.name) + '</a><span class="route-settlement">' + escapeHtml(church.settlement) + '</span><a class="btn btn-ghost" href="#/' + church.slug + '">Открыть</a></li>';
    }).join("");
    app.innerHTML = '<section class="hero"><p class="eyebrow">Исторический маршрут · 12 остановок</p><h1>Храмы Мостовского района</h1><p>Маршрут по 12 православным храмам Мостовского района Гродненской области — от старейшей церкви 1801 года в Самуйловичах до новейшего храма 2022 года в Куриловичах.</p><p class="hero-guide"><strong>С чего начать:</strong> выберите номер на схеме или откройте остановку ниже.</p></section><section class="map-schema" aria-label="Схема маршрута"><div class="legend"><span class="legend-item"><span class="marker-sample orthodox"></span> православный храм</span></div></section><section><h2>Остановки маршрута</h2><ol class="route-list">' + items + '</ol></section>';
    var schema = document.querySelector(".map-schema");
    if (schema && window.ChurchMap) { window.ChurchMap.renderSchema(schema); }
    wireMapListSync(schema);
  }
  function renderChurch(church) {
    var app = resolveApp();
    if (!app) { return; }
    var confession = "православный храм";
    var facts = church.facts.map(function (fact) { return '<li>' + escapeHtml(fact) + '</li>'; }).join("");
    app.innerHTML = '<p class="crumbs"><a href="#/">Главная</a> → <a href="#/">Маршрут</a> → <strong>' + escapeHtml(church.name) + '</strong></p><article class="church-page"><header class="church-head"><h1>' + escapeHtml(church.name) + '</h1><p class="church-subtitle">' + markerHtml(church) + ' ' + escapeHtml(church.settlement) + ' · ' + confession + '</p></header><div class="church-side">' + photoHtml(church) + factsHtml(church, confession) + mapButtonsHtml(church) + '</div><div class="church-body"><h2>История</h2>' + church.history.map(function (paragraph) { return '<p>' + escapeHtml(paragraph) + '</p>'; }).join("") + '<h2>Интересные факты</h2><ul class="facts-list">' + facts + '</ul>' + sourcesHtml(church) + '</div>' + neighboursHtml(church) + '</article>';
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
