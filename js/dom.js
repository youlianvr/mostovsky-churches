/* DOM-инструменты отделов: оболочка страницы, экранирование, карточка
 * остановки, строка списка, таблица. Единственное место, где строки данных
 * превращаются в разметку и где пишется содержимое #app, поэтому экранирование
 * и повторяющаяся разметка живут здесь, а не в каждом отделе. Никаких знаний
 * о схеме данных: на вход — готовые строки, на выход — кусок HTML. */
(function () {
  "use strict";

  function escape(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* Отрисовка страницы: содержимое + заголовок вкладки. Единственный вход
   * в #app — все отделы и страницы храмов рисуются через него. */
  function paint(html, title) {
    var app = document.getElementById("app");
    if (!app) { return null; }
    app.innerHTML = html;
    if (title) { document.title = title; }
    return app;
  }

  /* Иконка церкви — единый условный знак (js/church-icon.js).
   * modifier — класс-размер (.stop-icon, .map-marker-icon, .locator-icon…),
   * attrs — положение и размер в единицах схемы для иконок внутри <svg>. */
  function icon(modifier, attrs) {
    if (!window.ChurchIcon) { return ""; }
    return window.ChurchIcon.svg("church-icon " + (modifier || "stop-icon"), attrs);
  }

  function stepNumber(index) {
    return '<span class="route-step">' + (index + 1) + "</span>";
  }

  function titleLink(slug, text) {
    return '<a class="route-name" href="#/' + escape(slug) + '">' + escape(text) + "</a>";
  }

  /* Строка списка остановок: номер, иконка, название, пояснение, действие.
   * Используется и в «Нитке маршрута», и в списке объектов на схеме. */
  function stopRow(options) {
    return '<li data-slug="' + escape(options.slug) + '">' +
      stepNumber(options.index) + icon() +
      titleLink(options.slug, options.title) +
      '<span class="route-settlement">' + escape(options.meta) + "</span>" +
      options.action + "</li>";
  }

  /* Карточка объекта в отделах «Описание» и «Справочная информация»:
   * шапка с номером и иконкой плюс произвольное тело. Заголовок либо
   * ссылкой на страницу храма, либо простым текстом. */
  function stopCard(options) {
    var heading = options.titleHref
      ? '<h3><a href="#/' + escape(options.titleHref.slug) + '">' + escape(options.titleHref.text) + "</a></h3>"
      : "<h3>" + escape(options.title) + "</h3>";
    return '<article class="card stop-card"><header class="stop-head">' +
      stepNumber(options.index) + icon() + heading +
      '<p class="stop-meta">' + escape(options.meta) + "</p></header>" +
      options.body + "</article>";
  }

  /* Таблица с горизонтальной прокруткой: headers — список строк,
   * rows — список массивов уже готовых ячеек HTML. */
  function table(headers, rows) {
    var head = "<tr>" + headers.map(function (cell) { return "<th>" + escape(cell) + "</th>"; }).join("") + "</tr>";
    var body = rows.map(function (cells) {
      return "<tr>" + cells.map(function (cell) { return "<td>" + cell + "</td>"; }).join("") + "</tr>";
    }).join("");
    return '<div class="table-scroll"><table class="data-table"><thead>' + head + "</thead><tbody>" + body + "</tbody></table></div>";
  }

  /* Текущий раздел в шапке. Навигация — статический HTML, поэтому подсветку
   * ставит скрипт; и делает это тот же модуль, что пишет #app, — другого
   * места, где меняется документ, в проекте нет. */
  function markCurrent(href) {
    Array.prototype.forEach.call(document.querySelectorAll(".navbar-links a"), function (link) {
      if (link.getAttribute("href") === href) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  window.ChurchHtml = {
    escape: escape,
    markCurrent: markCurrent,
    paint: paint,
    icon: icon,
    stopRow: stopRow,
    stopCard: stopCard,
    table: table
  };
})();
