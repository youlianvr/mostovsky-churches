/* Страница объекта и служебные виды вокруг неё: фото с атрибуцией, локатор
 * района, панель фактов, кнопки внешних карт, «как добраться», источники,
 * переходы к соседним остановкам. Данные только читаются (подписи — из
 * data.js), разметка берётся из js/dom.js, схема района — из js/map-geometry.js.
 * Размеры фото приходят из данных, поэтому браузер резервирует место заранее. */
(function () {
  "use strict";
  var H = window.ChurchHtml;
  var R = window.ChurchRouter;
  var G = window.ChurchMapGeometry;

  /* Внешние карты: порядок координат в URL — часть публичного поведения,
   * поэтому ссылки собираются в одном месте. */
  function buildMapLinks(church) {
    return {
      yandex: "https://yandex.ru/maps/?pt=" + church.coords.lon + "," + church.coords.lat + "&z=17",
      osm: "https://www.openstreetmap.org/?mlat=" + church.coords.lat + "&mlon=" + church.coords.lon + "&zoom=17"
    };
  }

  /* Фото с атрибуцией: «Фото: автор, лицензия» со ссылкой на файл. */
  function photoHtml(church) {
    var parts = church.photoCredit.split(" — ");
    var credit = parts.length > 1
      ? '<a href="' + H.escape(parts[1]) + '" target="_blank" rel="noopener">' + H.escape(parts[0]) + "</a>"
      : H.escape(parts[0]);
    return '<figure class="church-photo"><img src="' + H.escape(church.photo) + '" alt="' +
      H.escape(church.name) + '" width="' + church.photoSize[0] + '" height="' + church.photoSize[1] + '" loading="lazy" decoding="async"><figcaption>Фото: ' + credit + "</figcaption></figure>";
  }

  /* Локатор: контур района со всеми остановками, текущая — крупнее и с
   * подписью. Размеры даны в единицах схемы (viewBox 1000 × 620), поэтому
   * остаются читаемыми, когда SVG уменьшается до ширины телефона. */
  function locatorHtml(church) {
    var points = ROUTE.map(function (slug, index) {
      var c = R.findChurchBySlug(slug);
      var p = G.project(c.coords.lat, c.coords.lon);
      return {
        settlement: c.settlement,
        current: c.slug === church.slug,
        step: index + 1,
        x: p.x,
        y: p.y
      };
    });
    var markers = points.map(function (p) {
      var width = p.current ? 62 : 44;
      var height = Math.round(width * 1.15);
      return '<g class="locator-point' + (p.current ? " is-current" : "") +
        '" transform="translate(' + p.x.toFixed(1) + "," + p.y.toFixed(1) + ')">' +
        '<circle r="' + (p.current ? 36 : 26) + '"/>' +
        H.icon("locator-icon", 'x="' + (-width / 2) + '" y="' + (-height / 2) +
          '" width="' + width + '" height="' + height + '"') +
        "</g>";
    }).join("");
    var current = points.filter(function (p) { return p.current; })[0];
    var label = current
      ? '<text class="locator-label" x="' + (current.x + 44).toFixed(1) + '" y="' + (current.y + 15).toFixed(1) + '">' +
        H.escape(current.settlement) + "</text>"
      : "";
    return '<figure class="locator-map"><svg viewBox="0 0 ' + G.W + " " + G.H + '" aria-hidden="true" focusable="false">' +
      '<path class="locator-district" d="' + G.pathString(G.DISTRICT, true) + '"/>' +
      '<path class="locator-river" d="' + G.pathString(G.RIVER, false) + '"/>' +
      markers + label + "</svg>" +
      "<figcaption>Положение на схеме района: " + H.escape(church.settlement) + "</figcaption></figure>";
  }

  function factsHtml(church, confession) {
    return '<dl class="fact-panel"><dt>Населённый пункт</dt><dd>' + H.escape(church.settlement) + "</dd>" +
      "<dt>Год постройки</dt><dd>" + H.escape(church.built) + "</dd>" +
      "<dt>Конфессия</dt><dd>" + confession + "</dd>" +
      "<dt>Статус</dt><dd>" + H.escape(church.status) + "</dd>" +
      "<dt>Адрес</dt><dd>" + H.escape(church.address) + "</dd></dl>";
  }

  function mapButtonsHtml(church) {
    var links = buildMapLinks(church);
    return '<p class="map-buttons"><a class="btn" href="' + links.yandex + '" target="_blank" rel="noopener">Открыть на Яндекс.Картах</a> ' +
      '<a class="btn btn-ghost" href="' + links.osm + '" target="_blank" rel="noopener">Открыть в OpenStreetMap</a></p>';
  }

  /* Краткая справка о посещении: дорога, службы, контакт настоятеля. */
  function visitHtml(church) {
    var tel = '<a href="tel:' + H.escape(church.phone.replace(/[^+\d]/g, "")) + '">' + H.escape(church.phone) + "</a>";
    return '<section class="visit-panel"><h2>Как добраться</h2><dl class="visit-facts">' +
      "<dt>Дорога</dt><dd>" + H.escape(church.gettingThere) + "</dd>" +
      "<dt>Автобус</dt><dd>" + H.escape(church.logistics.bus) + "</dd>" +
      "<dt>Богослужения</dt><dd>" + H.escape(church.services) + "</dd>" +
      "<dt>Настоятель</dt><dd>" + H.escape(church.rector) + ", " + tel + "</dd></dl>" +
      '<p class="visit-note">Расписание автобусов и богослужений лучше уточнить перед поездкой: рейсы и службы меняются.</p>' +
      '<p class="visit-links"><a href="#/logistika">Логистика маршрута</a> · <a href="#/spravka">Справочная информация</a></p></section>';
  }

  function sourcesHtml(church) {
    var items = church.sources.map(function (source) { return "<li>" + H.escape(source) + "</li>"; }).join("");
    return '<section class="source-panel"><h2>Источники</h2><ul class="sources">' + items + "</ul></section>";
  }

  function neighboursHtml(church) {
    var nb = R.routeNeighbours(church);
    return '<nav class="route-nav" aria-label="Навигация по маршруту">' +
      '<a class="btn btn-ghost" href="#/' + nb.prev.slug + '">← ' + H.escape(nb.prev.shortName) + "</a>" +
      '<a class="btn" href="#/' + nb.next.slug + '">' + H.escape(nb.next.shortName) + " →</a></nav>";
  }

  function render(church) {
    var confession = CONFESSIONS[church.confession];
    var facts = church.facts.map(function (fact) { return "<li>" + H.escape(fact) + "</li>"; }).join("");
    var history = church.history.map(function (paragraph) { return "<p>" + H.escape(paragraph) + "</p>"; }).join("");
    H.paint('<p class="crumbs"><a href="#/">Нитка маршрута</a> → <a href="#/opis">Описание</a> → <strong>' +
      H.escape(church.name) + "</strong></p>" +
      '<article class="church-page"><header class="church-head">' +
      '<p class="church-eyebrow">Остановка ' + church.routeStep + " из " + ROUTE.length + "</p>" +
      "<h1>" + H.escape(church.name) + "</h1>" +
      '<p class="church-subtitle">' + H.icon() + " " + H.escape(church.settlement) + " · " + confession + "</p>" +
      '<p class="church-lead">' + H.escape(church.appeal) + "</p></header>" +
      '<div class="church-side">' + photoHtml(church) + locatorHtml(church) + factsHtml(church, confession) +
      mapButtonsHtml(church) + "</div>" +
      '<div class="church-body"><h2>История</h2>' + history +
      '<h2>Интересные факты</h2><ul class="facts-list">' + facts + "</ul>" +
      visitHtml(church) + sourcesHtml(church) + "</div>" +
      neighboursHtml(church) + "</article>",
      H.escape(church.name) + " — " + H.escape(church.settlement) + " · Храмы Мостовского района");
  }

  function notFound() {
    H.paint('<h1>Храм не найден</h1><p>Такой страницы нет. Возможно, ссылка устарела.</p>' +
      '<p><a class="btn" href="#/">Вернуться к маршруту</a> ' +
      '<a class="btn btn-ghost" href="#/opis">Описание маршрута</a></p>',
      "Страница не найдена — Храмы Мостовского района");
  }

  window.ChurchPage = { render: render, notFound: notFound, buildMapLinks: buildMapLinks };
})();
