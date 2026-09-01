/* ============================================================
 * Храмы Мостовского района — приложение
 * Скелет (этап 0). Роутинг и рендер — этап 4.
 * ============================================================ */

(function () {
  "use strict";

  var app = document.getElementById("app");

  function renderNotFound() {
    app.innerHTML = "<h1>Храм не найден</h1><p><a href=\"#/\">На главную</a></p>";
  }

  function handleRoute() {
    var hash = window.location.hash || "#/";
    if (hash === "#/" || hash === "#/map") {
      app.innerHTML = "<h1>Главная</h1><p>Каркас сайта. Содержимое — на этапах 4–6.</p>";
    } else if (hash.indexOf("#/about") === 0) {
      window.location.href = "about.html";
    } else {
      renderNotFound();
    }
  }

  window.addEventListener("hashchange", handleRoute);
  window.addEventListener("DOMContentLoaded", handleRoute);
})();
