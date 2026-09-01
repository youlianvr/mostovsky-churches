/* ============================================================
 * Храмы Мостовского района — приложение
 * Этап 3: заготовка роутинга #/slug (функции-хелперы).
 * Полноценный рендер страниц — этап 4, карта — этап 5.
 * ============================================================ */

(function () {
  "use strict";

  /* --- Хелперы роутинга --- */

  /* Разбор hash: "#/slug" → "slug"; "#/" или пусто → "" (главная) */
  function parseRoute() {
    var hash = window.location.hash || "#/";
    var route = hash.replace(/^#\//, "").split("?")[0];
    return route.replace(/\/+$/, "");   // "#/lunno-sv-anna" → "lunno-sv-anna"
  }

  /* Поиск объекта храма по slug. Возвращает объект из CHURCHES или null. */
  function findChurchBySlug(slug) {
    var i;
    for (i = 0; i < CHURCHES.length; i++) {
      if (CHURCHES[i].slug === slug) {
        return CHURCHES[i];
      }
    }
    return null;
  }

  /* Ссылки «Открыть на карте»: Яндекс.Карты (основная) + OSM (запасная).
   * Формат Яндекс: https://yandex.ru/maps/?pt=lon,lat&z=17 */
  function buildMapLinks(church) {
    var lon = church.coords.lon, lat = church.coords.lat;
    return {
      yandex: "https://yandex.ru/maps/?pt=" + lon + "," + lat + "&z=17",
      osm: "https://www.openstreetmap.org/?mlat=" + lat + "&mlon=" + lon + "&zoom=17"
    };
  }

  /* Соседние шаги маршрута: { prev: church|null, next: church|null } */
  function routeNeighbours(church) {
    var idx = ROUTE.indexOf(church.slug);
    if (idx === -1) { return { prev: null, next: null }; }
    return {
      prev: idx > 0 ? findChurchBySlug(ROUTE[idx - 1]) : null,
      next: idx < ROUTE.length - 1 ? findChurchBySlug(ROUTE[idx + 1]) : null
    };
  }

  /* --- Рендер (заглушки этапа 3; полный рендер — этап 4) --- */

  var app = document.getElementById("app");

  function renderHomeStub() {
    app.innerHTML =
      "<section class=\"hero\"><h1>Храмы Мостовского района</h1>" +
      "<p>Каркас сайта (этап 3): данные заполнены, рендер страниц — на этапе 4.</p></section>";
  }

  function renderChurchStub(church) {
    app.innerHTML =
      "<p class=\"crumbs\"><a href=\"#/\">Главная</a> → Маршрут → <strong>" + church.name + "</strong></p>" +
      "<h1>" + church.name + "</h1>" +
      "<p>Страница храма рендерится на этапе 4. Данные для «" + church.slug + "» заполнены.</p>";
  }

  function renderNotFound() {
    app.innerHTML =
      "<h1>Храм не найден</h1>" +
      "<p>Такой страницы нет. <a href=\"#/\">Вернуться на главную</a>.</p>";
  }

  /* --- Обработчик маршрута --- */

  function handleRoute() {
    var route = parseRoute();

    if (route === "" || route === "map") {
      renderHomeStub();                 // карта-схема появится на этапе 5
    } else if (route === "about") {
      window.location.href = "about.html";
    } else {
      var church = findChurchBySlug(route);
      if (church) {
        renderChurchStub(church);
      } else {
        renderNotFound();
      }
    }
  }

  window.addEventListener("hashchange", handleRoute);
  window.addEventListener("DOMContentLoaded", handleRoute);

  /* Экспорт хелперов (для этапов 4–5) */
  window.ChurchApp = {
    parseRoute: parseRoute,
    findChurchBySlug: findChurchBySlug,
    buildMapLinks: buildMapLinks,
    routeNeighbours: routeNeighbours
  };
})();
