/* Шесть отделов Блока 1 «Дорогами духовности» — обязательные элементы из
 * Положения о конкурсе: нитка маршрута, карта-схема, описание, логистика,
 * справочная информация, фотоотчёт. Каждый отдел — чистая функция «данные →
 * HTML»; владельцы состояния лежат в других модулях: контент в data.js,
 * порядок маршрута и поиск объекта в router.js, схема в map.js / map-geometry.js,
 * разметка-повтор и запись в #app в dom.js. Список отделов ниже — единственный
 * источник и для диспетчера (app.js), и для переходов между отделами. */
(function () {
  "use strict";
  var H = window.ChurchHtml;
  var R = window.ChurchRouter;

  function church(slug) { return R.findChurchBySlug(slug); }

  function sectionNavHtml(currentId) {
    var links = SECTIONS.filter(function (s) { return s.id !== currentId; }).map(function (s) {
      return '<a class="btn btn-ghost" href="' + s.href + '">' + H.escape(s.label) + "</a>";
    }).join(" ");
    return '<nav class="section-nav" aria-label="Другие разделы проекта">' + links + "</nav>";
  }

  function paragraphs(list) {
    return list.map(function (text) { return "<p>" + H.escape(text) + "</p>"; }).join("");
  }

  /* ---------- 1. Нитка маршрута ---------- */
  function renderRoute() {
    var stops = ROUTE.map(function (slug, index) {
      var c = church(slug);
      return H.stopRow({
        slug: c.slug,
        index: index,
        title: c.name,
        meta: c.settlement + " · " + c.built,
        action: '<a class="btn btn-ghost" href="#/' + c.slug + '">Открыть описание</a>'
      });
    }).join("");
    var legs = H.table(["№", "Участок", "Способ", "Расстояние", "Время"], ROUTE_LEGS.map(legCells));
    H.paint('<section class="hero">' +
      '<p class="eyebrow">Блок 1 · Дорогами духовности</p>' +
      '<h1>Нитка маршрута: Гродно → Гудевичи → Лунно → Дубно → Мосты</h1>' +
      '<p>Три сельские церкви XIX века в Мостовском районе Гродненской области: Гудевичи (1852), Лунно (1889) и Дубно (1844). Маршрут начинается в Гродно и идёт с запада на восток: от шатровой колокольни Гудевичей к «крепостному» храму Лунно и дальше к самому крупному храму тройки в Дубно, а заканчивается в Мостах — районном центре.</p>' +
      '<p class="hero-guide"><strong>С чего начать:</strong> посмотрите <a href="#/map">карту-схему</a>, затем откройте <a href="#/opis">описание</a> каждой остановки.</p></section>' +
      '<section><h2>Остановки маршрута</h2><ol class="route-list">' + stops + "</ol></section>" +
      '<section><h2>Перегоны</h2>' + legs +
      '<p class="data-note">Расстояния — маршруты OpenStreetMap; время в пути — оценка, пешее посчитано по 4,5 км/ч. Подробнее — в разделе <a href="#/logistika">«Логистика»</a>.</p></section>' +
      sectionNavHtml(""),
      "Нитка маршрута — Храмы Мостовского района");
  }

  function legCells(leg, index) {
    return [
      "" + (index + 1),
      H.escape(leg.from) + " → " + H.escape(leg.toSettlement),
      H.escape(leg.mode),
      H.escape(leg.road),
      H.escape(leg.time) + (leg.walk ? '<br><span class="cell-note">' + H.escape(leg.walk) + "</span>" : "")
    ];
  }

  /* ---------- 2. Карта-схема ---------- */
  /* Наведение на строку списка подсвечивает метку и наоборот: это поведение
   * страницы, поэтому живёт рядом с разметкой списка, а не в отрисовщике SVG. */
  function wireListSync(schema) {
    Array.prototype.forEach.call(document.querySelectorAll(".route-list li[data-slug]"), function (li) {
      var marker = schema.querySelector('[data-slug="' + li.getAttribute("data-slug") + '"]');
      if (!marker) { return; }
      li.addEventListener("mouseenter", function () { marker.classList.add("is-highlighted"); });
      li.addEventListener("mouseleave", function () { marker.classList.remove("is-highlighted"); });
      marker.addEventListener("mouseenter", function () { li.classList.add("is-active"); });
      marker.addEventListener("mouseleave", function () { li.classList.remove("is-active"); });
    });
  }

  function renderMap() {
    var list = ROUTE.map(function (slug, index) {
      var c = church(slug);
      return H.stopRow({
        slug: c.slug,
        index: index,
        title: c.name,
        meta: c.settlement + " · " + c.coords.lat.toFixed(4) + ", " + c.coords.lon.toFixed(4),
        action: '<a class="btn btn-ghost" href="#/' + c.slug + '">Открыть</a>'
      });
    }).join("");
    H.paint('<h1>Карта-схема маршрута</h1>' +
      '<p class="page-lead">Схематичная карта Мостовского района: иконки церквей — три остановки маршрута, пунктирная линия — порядок движения. Номер на иконке — шаг маршрута, клик по иконке открывает страницу храма.</p>' +
      '<section class="map-schema" aria-label="Схема маршрута"></section>' +
      '<section><h2>Объекты на схеме</h2><ol class="route-list">' + list + "</ol></section>" +
      '<p class="data-note">Схема условная: контур района, река Неман, леса и дороги даны обобщённо — это не навигационная карта. Точные координаты каждого храма открываются кнопками «Открыть на Яндекс.Картах» на странице храма.</p>' +
      sectionNavHtml("map"),
      "Карта-схема — Храмы Мостовского района");
    var schema = document.querySelector(".map-schema");
    if (!schema || !window.ChurchMap) { return; }
    window.ChurchMap.renderSchema(schema);
    wireListSync(schema);
  }

  /* ---------- 3. Описание ---------- */
  function renderOpis() {
    var cards = ROUTE.map(function (slug, index) {
      var c = church(slug);
      var facts = c.facts.slice(0, 3).map(function (fact) { return "<li>" + H.escape(fact) + "</li>"; }).join("");
      return H.stopCard({
        index: index,
        titleHref: { slug: c.slug, text: c.name },
        meta: c.settlement + " · " + c.built + " · " + c.status,
        body: '<p class="stop-appeal">' + H.escape(c.appeal) + "</p>" +
          "<p>" + H.escape(c.history[0]) + '</p><ul class="facts-list">' + facts + "</ul>" +
          '<p><a class="btn btn-ghost" href="#/' + c.slug + '">Подробная страница храма</a>' +
          ' <a class="btn btn-ghost" href="#/logistika">Как добраться</a></p>'
      });
    }).join("");
    H.paint('<h1>Описание маршрута</h1>' +
      '<p class="page-lead">Текстовая часть проекта: краткая историческая справка по каждому объекту и обоснование привлекательности маршрута.</p>' +
      '<section class="card"><h2>Почему этот маршрут привлекателен</h2>' + paragraphs(ROUTE_APPEAL) + "</section>" +
      '<section><h2>Остановки: историческая справка</h2><div class="stop-cards">' + cards + "</div></section>" +
      sectionNavHtml("opis"),
      "Описание — Храмы Мостовского района");
  }

  /* ---------- 4. Логистика ---------- */
  /* Карточка транспортного узла: имя, адрес, телефон и часы — из BUS. */
  function hubCard(hub) {
    return '<div class="stop-card"><div class="stop-head"><h3>' + H.escape(hub.name) + "</h3></div>" +
      '<dl class="fact-panel"><dt>Адрес</dt><dd>' + H.escape(hub.address) + "</dd>" +
      "<dt>Телефон</dt><dd>" + H.escape(hub.phone) + "</dd>" +
      "<dt>Часы работы</dt><dd>" + H.escape(hub.hours) + "</dd></dl></div>";
  }

  /* Остановки тройки: что видит человек на остановке — направление, номера
   * маршрутов, время, дни и путь до храма. Данные целиком из BUS_STOPS. */
  function busStopsSection() {
    var blocks = BUS_STOPS.map(function (entry) {
      var c = church(entry.slug);
      var trips = entry.trips.map(function (trip) {
        return "<dt>" + H.escape(trip.to) + "</dt><dd>" + H.escape(trip.routes) +
          '<br><span class="cell-note">' + H.escape(trip.times) + "</span></dd>";
      }).join("");
      return '<article class="card"><h3>' + H.escape(c.settlement) + " — " + H.escape(entry.stop) + "</h3>" +
        '<dl class="bus-trips">' + trips + "</dl>" +
        '<p class="data-note">' + H.escape(entry.toChurch) + ". Номер остановки в приложении «Транспорт BY»: " + H.escape(entry.stopId) + ".</p></article>";
    }).join("");
    return '<section><h2>Автобусы у остановок маршрута</h2>' +
      '<p class="page-lead">Время указано для самой остановки, дни недели — по расписанию областного оператора пассажирских перевозок; номера рейсов в приложении «Транспорт BY» могут отличаться.</p>' +
      blocks +
      '<p class="data-note">Расписания остановок опубликованы на сайте перевозчика (ГП «Оператор пассажирских перевозок», файлы по маршрутам Мостовского района), маршруты и время сверены по приложению «Транспорт BY» ' +
      H.escape(BUS.checked) + ". Рейсы ходят не каждый день: перед поездкой подтверждайте отправление в кассе или по телефону.</p></section>";
  }

  function renderLogistika() {
    var rows = ROUTE.map(function (slug, index) {
      var c = church(slug);
      return [
        (index + 1) + " · " + H.escape(c.settlement),
        H.escape(c.logistics.fromGrodno.road) + '<br><span class="cell-note">' + H.escape(c.logistics.fromGrodno.car) + " на машине</span>",
        H.escape(c.logistics.fromMosty.road) + '<br><span class="cell-note">' + H.escape(c.logistics.fromMosty.car) + " на машине</span>"
      ];
    });
    H.paint('<h1>Логистика маршрута</h1>' +
      '<p class="page-lead">Способы передвижения и расстояния до каждой остановки — от Гродно (областной центр) и от Мостов (районный центр).</p>' +
      '<section><h2>Сколько ехать до каждого храма</h2>' +
      H.table(["Остановка", "От Гродно (центр)", "От Мостов (центр)"], rows) +
      '<p class="data-note">Расстояния — по дорожным маршрутам OpenStreetMap от центров городов; время на автомобиле — оценка без учёта остановок и погоды. От автовокзала Гродно (ул. Ожешко, 25) путь длиннее: до Гудевичей около 59 км. На телефоне таблицу можно прокрутить вбок.</p></section>' +
      "<section><h2>Перегоны между остановками</h2>" +
      H.table(["№", "Участок", "Способ", "Расстояние", "Время"], ROUTE_LEGS.map(legCells)) + "</section>" +
      '<section class="card"><h2>Где начинается маршрут: автовокзал Гродно и автостанция «Мосты»</h2>' +
      '<div class="stop-cards">' + hubCard(BUS.grodno) + hubCard(BUS.mosty) + "</div>" +
      "<p>" + H.escape(BUS.note) + "</p>" +
      '<p class="data-note">Проверено ' + H.escape(BUS.checked) + ". Источник: " + H.escape(BUS.source) + "</p></section>" +
      busStopsSection() +
      '<section class="card"><h2>Способы передвижения</h2>' +
      TRANSPORT_MODES.map(function (text) { return "<p>" + text + "</p>"; }).join("") + "</section>" +
      sectionNavHtml("logistika"),
      "Логистика — Храмы Мостовского района");
  }

  /* ---------- 5. Справочная информация ---------- */
  function sourceChecklistHtml() {
    var items = SOURCES.items;
    var done = items.filter(function (item) { return item.done; }).length;
    var list = items.map(function (item) {
      return '<li class="source-check' + (item.done ? " is-done" : "") + '">' +
        '<span class="check-mark" aria-hidden="true">' + (item.done ? "✓" : "☐") + "</span> " +
        H.escape(item.text) + "</li>";
    }).join("");
    return '<section class="card"><h2>Список источников</h2>' +
      '<p class="page-lead">' + H.escape(SOURCES.requiredNote) + " Готово " + done + " из " + items.length + ".</p>" +
      '<ul class="source-checks">' + list + "</ul>" +
      '<p class="data-note">Незакрытые пункты завершает автор проекта: запись беседы собирается во время поездки.</p></section>';
  }

  function renderSpravka() {
    var contacts = ROUTE.map(function (slug, index) {
      var c = church(slug);
      var tel = '<a href="tel:' + H.escape(c.phone.replace(/[^+\d]/g, "")) + '">' + H.escape(c.phone) + "</a>";
      return H.stopCard({
        index: index,
        title: c.name,
        meta: c.settlement,
        body: '<dl class="fact-panel"><dt>Настоятель</dt><dd>' + H.escape(c.rector) + "</dd>" +
          "<dt>Телефон</dt><dd>" + tel + "</dd>" +
          "<dt>Адрес</dt><dd>" + H.escape(c.address) + "</dd>" +
          "<dt>Богослужения</dt><dd>" + H.escape(c.services) + "</dd>" +
          (c.parishNote ? "<dt>Приход</dt><dd>" + H.escape(c.parishNote) + "</dd>" : "") +
          "<dt>Питание</dt><dd>" + H.escape(c.food) + "</dd></dl>" +
          '<p><a class="btn btn-ghost" href="#/' + c.slug + '">Страница храма</a></p>'
      });
    }).join("");
    var places = FOOD.places.map(function (place) {
      var tail = place.hours ? ", " + place.hours : "";
      var mark = place.checked
        ? '<span class="cell-note"> — адрес и часы сверены с OpenStreetMap ' + H.escape(BUS.checked) + "</span>"
        : '<span class="cell-note"> — место указано по ранним записям, проверьте перед поездкой</span>';
      return "<li>" + H.escape(place.name) + " — " + H.escape(place.address) + H.escape(tail) + mark + "</li>";
    }).join("");
    H.paint('<h1>Справочная информация</h1>' +
      '<p class="page-lead">Контакты приходов, расписание богослужений и ближайшие пункты питания — всё, что нужно знать перед поездкой.</p>' +
      '<section><h2>Приходы и контакты</h2><div class="stop-cards">' + contacts + "</div></section>" +
      '<section class="card"><h2>Где поесть</h2><p>' + H.escape(FOOD.note) + '</p><ul class="facts-list">' + places + "</ul>" +
      '<p class="data-note">' + H.escape(FOOD.source) + "</p></section>" +
      sourceChecklistHtml() + sectionNavHtml("spravka"),
      "Справочная информация — Храмы Мостовского района");
  }

  /* ---------- 6. Фотоотчёт ---------- */
  function photoSlotHtml(c, kind, index) {
    var photo = (c.visitPhotos || [])[index];
    if (photo && photo.src) {
      return '<figure class="report-slot is-filled"><img src="' + H.escape(photo.src) + '" alt="' +
        H.escape(c.shortName + " — " + kind) + '" loading="lazy"><figcaption><strong>' + H.escape(c.shortName) +
        "</strong><br>" + H.escape(kind) + (photo.credit ? '<br><span class="slot-meta">' + H.escape(photo.credit) + "</span>" : "") +
        "</figcaption></figure>";
    }
    return '<figure class="report-slot"><div class="report-slot-frame" role="img" aria-label="Фотография добавляется после поездки">' +
      '<span class="slot-plus" aria-hidden="true">+</span><span class="slot-caption">Фото добавляется</span></div>' +
      "<figcaption><strong>" + H.escape(c.shortName) + "</strong><br>" + H.escape(kind) +
      '<br><span class="slot-meta">после поездки: файл в img/photos/visit/ и строка в data.js</span></figcaption></figure>';
  }

  function renderFoto() {
    var slots = "";
    ROUTE.forEach(function (slug) {
      var c = church(slug);
      PHOTO_REPORT.kinds.forEach(function (kind, index) { slots += photoSlotHtml(c, kind, index); });
    });
    H.paint("<h1>Фотоотчёт о посещении</h1>" +
      '<p class="page-lead">' + H.escape(PHOTO_REPORT.lead) + "</p>" +
      '<section><h2>Кадры, которые нужно сделать</h2><div class="report-grid">' + slots + "</div></section>" +
      '<section class="card"><h2>Как добавить фотографии</h2><ol class="facts-list">' +
      PHOTO_REPORT.howto.map(function (step) { return "<li>" + H.escape(step) + "</li>"; }).join("") + "</ol>" +
      '<p class="data-note">' + H.escape(PHOTO_REPORT.note) + "</p></section>" +
      sectionNavHtml("foto"),
      "Фотоотчёт — Храмы Мостовского района");
  }

  /* Единственный список отделов: адрес, подпись и отрисовка в одном месте.
   * app.js берёт отсюда маршруты, поэтому добавить седьмой отдел — значит
   * дописать одну строку здесь (плюс ссылку в шапке index.html). */
  var SECTIONS = [
    { id: "", href: "#/", label: "Нитка маршрута", render: renderRoute },
    { id: "map", href: "#/map", label: "Карта-схема", render: renderMap },
    { id: "opis", href: "#/opis", label: "Описание", render: renderOpis },
    { id: "logistika", href: "#/logistika", label: "Логистика", render: renderLogistika },
    { id: "spravka", href: "#/spravka", label: "Справочная информация", render: renderSpravka },
    { id: "foto", href: "#/foto", label: "Фотоотчёт", render: renderFoto }
  ];

  function findSection(id) {
    for (var i = 0; i < SECTIONS.length; i++) {
      if (SECTIONS[i].id === id) { return SECTIONS[i]; }
    }
    return null;
  }

  window.ChurchSections = { list: SECTIONS, find: findSection };
})();
