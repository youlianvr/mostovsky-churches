/* Page views: HTML presentation only. Routing and map state live elsewhere. */
(function () {
  "use strict";
  var app = document.getElementById("app");
  var R = window.ChurchRouter;

  function escapeHtml(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function markerHtml(church) {
    var label = church.confession === "orthodox" ? "православный храм" : "католический костёл";
    return '<span class="marker-sample ' + (church.confession === "orthodox" ? "orthodox" : "") +
      '" title="' + label + '" aria-label="' + label + '"></span>';
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
      (nb.prev ? '<a class="btn btn-ghost" href="#/' + nb.prev.slug + '">← ' + escapeHtml(nb.prev.settlement) + '</a>' : '<span></span>') +
      (nb.next ? '<a class="btn" href="#/' + nb.next.slug + '">' + escapeHtml(nb.next.settlement) + ' →</a>' : '') + '</nav>';
  }
  function renderHome() {
    var items = ROUTE.map(function (slug, index) {
      var church = R.findChurchBySlug(slug);
      return '<li><span class="route-step">' + (index + 1) + '</span>' + markerHtml(church) +
        '<a class="route-name" href="#/' + church.slug + '">' + escapeHtml(church.name) + '</a><span class="route-settlement">' + escapeHtml(church.settlement) + '</span><a class="btn btn-ghost" href="#/' + church.slug + '">Открыть</a></li>';
    }).join("");
    app.innerHTML = '<section class="hero"><p class="eyebrow">Исторический маршрут · 19 остановок</p><h1>Храмы Мостовского района</h1><p>Маршрут по 19 храмам Мостовского района Гродненской области — 12 православных церквей и 7 католических костёлов, от старейшего деревянного храма 1740 года до новейшей церкви 2022 года.</p><p class="hero-guide"><strong>С чего начать:</strong> выберите номер на схеме или откройте остановку ниже.</p></section><section class="map-schema" aria-label="Схема маршрута"><div class="legend"><span class="legend-item"><span class="marker-sample orthodox"></span> православный храм</span><span class="legend-item"><span class="marker-sample"></span> католический костёл</span></div></section><section><h2>Остановки маршрута</h2><ol class="route-list">' + items + '</ol></section>';
    var schema = document.querySelector(".map-schema");
    if (schema && window.ChurchMap) { window.ChurchMap.renderSchema(schema); }
  }
  function renderChurch(church) {
    var confession = church.confession === "orthodox" ? "православный храм" : "католический костёл";
    var facts = church.facts.map(function (fact) { return '<li>' + escapeHtml(fact) + '</li>'; }).join("");
    app.innerHTML = '<p class="crumbs"><a href="#/">Главная</a> → <a href="#/">Маршрут</a> → <strong>' + escapeHtml(church.name) + '</strong></p><article class="church-page"><header class="church-head"><h1>' + escapeHtml(church.name) + '</h1><p class="church-subtitle">' + markerHtml(church) + ' ' + escapeHtml(church.settlement) + ' · ' + confession + '</p></header>' + photoHtml(church) + factsHtml(church, confession) + mapButtonsHtml(church) + '<h2>История</h2>' + church.history.map(function (paragraph) { return '<p>' + escapeHtml(paragraph) + '</p>'; }).join("") + '<h2>Интересные факты</h2><ul class="facts-list">' + facts + '</ul>' + sourcesHtml(church) + neighboursHtml(church) + '</article>';
  }
  function renderNotFound() {
    app.innerHTML = '<h1>Храм не найден</h1><p>Такой страницы нет. Возможно, ссылка устарела.</p><p><a class="btn" href="#/">Вернуться к маршруту</a></p>';
  }

  window.ChurchViews = {
    renderHome: renderHome, renderChurch: renderChurch, renderNotFound: renderNotFound,
    buildMapLinks: buildMapLinks
  };
})();
