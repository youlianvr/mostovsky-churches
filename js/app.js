/* ============================================================
 * Храмы Мостовского района — приложение (этап 4: живой каркас)
 * Роутинг #/slug, страница храма, список маршрута, «не найден».
 * Карта-SVG — этап 5, UI/UX-полировка — этап 7.
 * ============================================================ */

(function () {
  "use strict";

  var app = document.getElementById("app");

  /* --- Утилиты --- */

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* Разбор hash: "#/slug" → "slug"; "#/" → "" (главная) */
  function parseRoute() {
    var hash = window.location.hash || "#/";
    return hash.replace(/^#\//, "").split("?")[0].replace(/\/+$/, "");
  }

  /* Поиск объекта храма по slug */
  function findChurchBySlug(slug) {
    var i;
    for (i = 0; i < CHURCHES.length; i++) {
      if (CHURCHES[i].slug === slug) { return CHURCHES[i]; }
    }
    return null;
  }

  /* Ссылки «Открыть на карте»: Яндекс.Карты (основная) + OSM (запасная) */
  function buildMapLinks(church) {
    var lon = church.coords.lon, lat = church.coords.lat;
    return {
      yandex: "https://yandex.ru/maps/?pt=" + lon + "," + lat + "&z=17",
      osm: "https://www.openstreetmap.org/?mlat=" + lat + "&mlon=" + lon + "&zoom=17"
    };
  }

  /* Соседние шаги по маршруту; кольцо замкнуто: последний → первый */
  function routeNeighbours(church) {
    var idx = ROUTE.indexOf(church.slug);
    if (idx === -1) { return { prev: null, next: null }; }
    var last = ROUTE.length - 1;
    return {
      prev: findChurchBySlug(ROUTE[idx > 0 ? idx - 1 : last]),
      next: findChurchBySlug(ROUTE[idx < last ? idx + 1 : 0])
    };
  }

  /* Подпись фото: «Автор …, Wikimedia Commons, CC BY-SA 3.0 — URL» */
  function splitCredit(credit) {
    var parts = credit.split(" — ");
    return {
      text: parts[0] || credit,
      url: parts.length > 1 ? parts[1] : ""
    };
  }

  /* --- Рендер --- */

  function markerHtml(church) {
    var cls = church.confession === "orthodox" ? "marker-sample orthodox" : "marker-sample";
    var label = church.confession === "orthodox" ? "православный храм" : "католический костёл";
    return "<span class=\"marker-sample " + (church.confession === "orthodox" ? "orthodox" : "") +
           "\" title=\"" + label + "\" aria-label=\"" + label + "\"></span>";
  }

  function renderHome() {
    var items = ROUTE.map(function (slug, i) {
      var c = findChurchBySlug(slug);
      return "<li>" +
        "<span class=\"route-step\">" + (i + 1) + "</span>" +
        markerHtml(c) +
        "<a class=\"route-name\" href=\"#/" + c.slug + "\">" + escapeHtml(c.name) + "</a>" +
        "<span class=\"route-settlement\">" + escapeHtml(c.settlement) + "</span>" +
        "<a class=\"btn btn-ghost\" href=\"#/" + c.slug + "\">Открыть</a>" +
        "</li>";
    }).join("");

    app.innerHTML =
      "<section class=\"hero\">" +
        "<h1>Храмы Мостовского района</h1>" +
        "<p>Маршрут по 19 храмам Мостовского района Гродненской области — " +
        "12 православных церквей и 7 католических костёлов, от старейшего деревянного " +
        "храма 1740 года до новейшей церкви 2022 года.</p>" +
      "</section>" +
      "<section class=\"map-schema\" aria-label=\"Схема маршрута\">" +
        "<p class=\"map-placeholder-note\">Схематическая карта района появится на этапе 5.</p>" +
        "<div class=\"legend\">" +
          "<span class=\"legend-item\"><span class=\"marker-sample orthodox\"></span> православный храм</span>" +
          "<span class=\"legend-item\"><span class=\"marker-sample\"></span> католический костёл</span>" +
        "</div>" +
      "</section>" +
      "<section>" +
        "<h2>Остановки маршрута</h2>" +
        "<ol class=\"route-list\">" + items + "</ol>" +
      "</section>";
  }

  function photoHtml(church) {
    if (!church.placeholder && church.photo) {
      var credit = splitCredit(church.photoCredit);
      var link = credit.url
        ? "<a href=\"" + escapeHtml(credit.url) + "\" target=\"_blank\" rel=\"noopener\">" +
          escapeHtml(credit.text) + "</a>"
        : escapeHtml(credit.text);
      return "<figure class=\"church-photo\">" +
        "<img src=\"" + escapeHtml(church.photo) + "\" alt=\"" + escapeHtml(church.name) + "\" loading=\"lazy\">" +
        "<figcaption>Фото: " + link + "</figcaption>" +
        "</figure>";
    }
    return "<div class=\"photo-placeholder\" role=\"img\" aria-label=\"Фото храма уточняется\">" +
      "Фото уточняется" +
      "</div>";
  }

  function builtHtml(church) {
    var html = "<dt>Год постройки</dt><dd>" + escapeHtml(church.built);
    if (church.builtNote) {
      html += "<div class=\"note-inline\">" + escapeHtml(church.builtNote) + "</div>";
    }
    return html + "</dd>";
  }

  function coordsNoteHtml(church) {
    if (!church.coordsNote) { return ""; }
    return "<p class=\"coords-note\">⚠ " + escapeHtml(church.coordsNote) + "</p>";
  }

  function mapButtonsHtml(church) {
    var links = buildMapLinks(church);
    return "<p class=\"map-buttons\">" +
      "<a class=\"btn\" href=\"" + links.yandex + "\" target=\"_blank\" rel=\"noopener\">Открыть на Яндекс.Картах</a> " +
      "<a class=\"btn btn-ghost\" href=\"" + links.osm + "\" target=\"_blank\" rel=\"noopener\">Открыть в OpenStreetMap</a>" +
      "</p>" + coordsNoteHtml(church);
  }

  function neighboursHtml(church) {
    var nb = routeNeighbours(church);
    var html = "<nav class=\"route-nav\" aria-label=\"Навигация по маршруту\">";
    html += nb.prev
      ? "<a class=\"btn btn-ghost\" href=\"#/" + nb.prev.slug + "\">← " + escapeHtml(nb.prev.settlement) + "</a>"
      : "<span></span>";
    html += nb.next
      ? "<a class=\"btn\" href=\"#/" + nb.next.slug + "\">" + escapeHtml(nb.next.settlement) + " →</a>"
      : "";
    return html + "</nav>";
  }

  function renderChurch(church) {
    var facts = church.facts.map(function (f) { return "<li>" + escapeHtml(f) + "</li>"; }).join("");
    var confession = church.confession === "orthodox" ? "православный храм" : "католический костёл";

    app.innerHTML =
      "<p class=\"crumbs\"><a href=\"#/\">Главная</a> → <a href=\"#/\">Маршрут</a> → <strong>" +
        escapeHtml(church.name) + "</strong></p>" +
      "<article class=\"church-page\">" +
        "<header class=\"church-head\">" +
          "<h1>" + escapeHtml(church.name) + "</h1>" +
          "<p class=\"church-subtitle\">" + markerHtml(church) + " " +
            escapeHtml(church.settlement) + " · " + confession + "</p>" +
        "</header>" +
        photoHtml(church) +
        "<dl class=\"fact-panel\">" +
          "<dt>Населённый пункт</dt><dd>" + escapeHtml(church.settlement) + "</dd>" +
          builtHtml(church) +
          "<dt>Конфессия</dt><dd>" + confession + "</dd>" +
          (church.status ? "<dt>Статус</dt><dd>" + escapeHtml(church.status) + "</dd>" : "") +
          (church.address ? "<dt>Адрес</dt><dd>" + escapeHtml(church.address) + "</dd>" : "") +
        "</dl>" +
        mapButtonsHtml(church) +
        "<h2>История</h2>" +
        church.history.map(function (p) { return "<p>" + escapeHtml(p) + "</p>"; }).join("") +
        "<h2>Интересные факты</h2>" +
        "<ul class=\"facts-list\">" + facts + "</ul>" +
        neighboursHtml(church) +
      "</article>";
  }

  function renderNotFound() {
    app.innerHTML =
      "<h1>Храм не найден</h1>" +
      "<p>Такой страницы нет. Возможно, ссылка устарела.</p>" +
      "<p><a class=\"btn\" href=\"#/\">Вернуться к маршруту</a></p>";
  }

  /* --- Роутинг --- */

  function handleRoute() {
    var route = parseRoute();

    if (route === "" || route === "map") {
      renderHome();                   // SVG-карта — этап 5
    } else if (route === "about") {
      window.location.href = "about.html";
    } else {
      var church = findChurchBySlug(route);
      if (church) { renderChurch(church); } else { renderNotFound(); }
    }
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", handleRoute);
  window.addEventListener("DOMContentLoaded", handleRoute);

  /* Экспорт хелперов (для этапов 5–8 и тестов) */
  window.ChurchApp = {
    parseRoute: parseRoute,
    findChurchBySlug: findChurchBySlug,
    buildMapLinks: buildMapLinks,
    routeNeighbours: routeNeighbours,
    renderChurch: renderChurch,
    renderNotFound: renderNotFound
  };
})();
