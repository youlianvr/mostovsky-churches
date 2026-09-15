/* Page views: HTML presentation only. Routing and map state live elsewhere.
 * Отделы страницы = обязательные элементы Блока 1 «Дорогами духовности»:
 * нитка маршрута, карта-схема, описание, логистика, справочная информация,
 * фотоотчёт. Каждый отдел — своя функция render* и свой адрес #/… */
(function () {
  "use strict";
  function resolveApp() { return document.getElementById("app"); }
  var R = window.ChurchRouter;

  function escapeHtml(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  /* Один условный знак на весь сайт — иконка церкви (js/church-icon.js);
   * modifier-класс задаёт размер и место, цвета берёт из .church-icon. */
  function markerHtml() {
    return window.ChurchIcon ? window.ChurchIcon.svg("church-icon stop-icon") : "";
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
  /* Отдел «Справочная информация» на странице храма: дорога, службы, контакты. */
  function visitHtml(church) {
    if (!church.gettingThere && !church.services) { return ""; }
    var tel = church.phone ? '<a href="tel:' + escapeHtml(church.phone.replace(/[^+\d]/g, "")) + '">' + escapeHtml(church.phone) + '</a>' : "";
    var rectorLine = church.rector ? "<dt>Настоятель</dt><dd>" + escapeHtml(church.rector) + (tel ? ", " + tel : "") + "</dd>" : "";
    var servicesLine = church.services ? "<dt>Богослужения</dt><dd>" + escapeHtml(church.services) + "</dd>" : "";
    var thereLine = church.gettingThere ? "<dt>Дорога</dt><dd>" + escapeHtml(church.gettingThere) + "</dd>" : "";
    return '<section class="visit-panel"><h2>Как добраться</h2><dl class="visit-facts">' +
      thereLine + servicesLine + rectorLine + "</dl>" +
      '<p class="visit-note">Расписание автобусов и богослужений лучше уточнить перед поездкой: рейсы и службы меняются.</p>' +
      '<p class="visit-links"><a href="#/logistika">Логистика маршрута</a> · <a href="#/spravka">Справочная информация</a></p></section>';
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
      return schema.querySelector('[data-slug="' + slug + '"]');
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
  /* Locator on a church page: the district outline with all three stops, the
     current one marked by a larger icon and a label. Sizes are in schema user
     units (viewBox 1000 × 620), so they stay legible when the SVG shrinks to a
     phone; the label names the settlement — short enough not to be clipped. */
  function locatorHtml(church) {
    if (!window.ChurchMapGeometry) { return ""; }
    var G = window.ChurchMapGeometry;
    var pts = ROUTE.map(function (slug) {
      var c = R.findChurchBySlug(slug);
      var p = G.project(c.coords.lat, c.coords.lon);
      return { settlement: c.settlement, x: p.x, y: p.y, current: c.slug === church.slug };
    });
    var markers = pts.map(function (p) {
      var width = p.current ? 62 : 44;
      var height = Math.round(width * 1.15);
      var halo = p.current ? 36 : 26;
      return '<g class="locator-point' + (p.current ? " is-current" : "") + '" transform="translate(' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ')">' +
        '<circle r="' + halo + '"/>' +
        (window.ChurchIcon ? window.ChurchIcon.svg("church-icon locator-icon",
          'x="' + (-width / 2) + '" y="' + (-height / 2) + '" width="' + width + '" height="' + height + '"') : "") +
        '</g>';
    }).join("");
    var cur = pts.filter(function (p) { return p.current; })[0];
    var label = cur ? '<text class="locator-label" x="' + (cur.x + 44).toFixed(1) + '" y="' + (cur.y + 15).toFixed(1) + '">' +
      escapeHtml(cur.settlement) + '</text>' : "";
    return '<figure class="locator-map"><svg viewBox="0 0 ' + G.W + ' ' + G.H +
      '" aria-hidden="true" focusable="false">' +
      '<path class="locator-district" d="' + G.pathString(G.DISTRICT, true) + '"/>' +
      '<path class="locator-river" d="' + G.pathString(G.RIVER, false) + '"/>' +
      markers + label + '</svg>' +
      '<figcaption>Положение на схеме района: ' + escapeHtml(church.settlement) + '</figcaption></figure>';
  }
  /* Отдел 1 «Нитка маршрута»: порядок остановок и перегоны. */
  function routeCardHtml(church, index) {
    return '<li data-slug="' + church.slug + '"><span class="route-step">' + (index + 1) + '</span>' + markerHtml() +
      '<a class="route-name" href="#/' + church.slug + '">' + escapeHtml(church.name) + '</a>' +
      '<span class="route-settlement">' + escapeHtml(church.settlement) + ' · ' + escapeHtml(church.built) + '</span>' +
      '<a class="btn btn-ghost" href="#/' + church.slug + '">Открыть описание</a></li>';
  }
  function legRowHtml(leg, index) {
    return '<tr><td>' + (index + 1) + '</td><td>' + escapeHtml(leg.from) + ' → ' + escapeHtml(leg.toSettlement) + '</td>' +
      '<td>' + escapeHtml(leg.mode) + '</td><td>' + escapeHtml(leg.road) + '</td>' +
      '<td>' + escapeHtml(leg.time) + (leg.walk ? '<br><span class="cell-note">' + escapeHtml(leg.walk) + '</span>' : '') + '</td></tr>';
  }
  function renderRoute() {
    var app = resolveApp();
    if (!app) { return; }
    var items = ROUTE.map(function (slug, index) { return routeCardHtml(R.findChurchBySlug(slug), index); }).join("");
    var legs = ROUTE_LEGS.map(legRowHtml).join("");
    app.innerHTML = '<section class="hero">' + heroRibbonHtml() +
      '<p class="eyebrow">Блок 1 · Дорогами духовности</p>' +
      '<h1>Нитка маршрута: Гродно → Гудевичи → Лунно → Дубно → Мосты</h1>' +
      '<p>Три сельские церкви XIX века в Мостовском районе Гродненской области: Гудевичи (1852), Лунно (1889) и Дубно (1844). Маршрут начинается в Гродно и идёт с запада на восток: от шатровой колокольни Гудевичей к «крепостному» храму Лунно и дальше к самому крупному храму тройки в Дубно, а заканчивается в Мостах — районном центре.</p>' +
      '<p class="hero-guide"><strong>С чего начать:</strong> посмотрите <a href="#/map">карту-схему</a>, затем откройте <a href="#/opis">описание</a> каждой остановки.</p></section>' +
      '<section><h2>Остановки маршрута</h2><ol class="route-list">' + items + '</ol></section>' +
      '<section><h2>Перегоны</h2><div class="table-scroll"><table class="data-table"><thead><tr><th>№</th><th>Участок</th><th>Способ</th><th>Расстояние</th><th>Время</th></tr></thead><tbody>' + legs + '</tbody></table></div>' +
      '<p class="data-note">Расстояния — маршруты OpenStreetMap; время в пути — оценка, пешее посчитано по 4,5 км/ч. Подробнее — в разделе <a href="#/logistika">«Логистика»</a>.</p></section>' +
      sectionNavHtml("");
    document.title = "Нитка маршрута — Храмы Мостовского района";
  }
  function renderChurch(church) {
    var app = resolveApp();
    if (!app) { return; }
    var confession = "православный храм";
    var facts = church.facts.map(function (fact) { return '<li>' + escapeHtml(fact) + '</li>'; }).join("");
    document.title = escapeHtml(church.name) + ' — ' + escapeHtml(church.settlement) + ' · Храмы Мостовского района';
    app.innerHTML = '<p class="crumbs"><a href="#/">Нитка маршрута</a> → <a href="#/opis">Описание</a> → <strong>' + escapeHtml(church.name) + '</strong></p><article class="church-page"><header class="church-head"><p class="church-eyebrow">Остановка ' + church.routeStep + ' из ' + ROUTE.length + '</p><h1>' + escapeHtml(church.name) + '</h1><p class="church-subtitle">' + markerHtml() + ' ' + escapeHtml(church.settlement) + ' · ' + confession + '</p>' + (church.appeal ? '<p class="church-lead">' + escapeHtml(church.appeal) + '</p>' : '') + '</header><div class="church-side">' + photoHtml(church) + locatorHtml(church) + factsHtml(church, confession) + mapButtonsHtml(church) + '</div><div class="church-body"><h2>История</h2>' + church.history.map(function (paragraph) { return '<p>' + escapeHtml(paragraph) + '</p>'; }).join("") + '<h2>Интересные факты</h2><ul class="facts-list">' + facts + '</ul>' + visitHtml(church) + sourcesHtml(church) + '</div>' + neighboursHtml(church) + '</article>';
  }
  /* Переходы между отделами Блока 1 — внизу каждой страницы. */
  var SECTIONS = [
    { href: "#/", id: "", label: "Нитка маршрута" },
    { href: "#/map", id: "map", label: "Карта-схема" },
    { href: "#/opis", id: "opis", label: "Описание" },
    { href: "#/logistika", id: "logistika", label: "Логистика" },
    { href: "#/spravka", id: "spravka", label: "Справочная информация" },
    { href: "#/foto", id: "foto", label: "Фотоотчёт" }
  ];
  function sectionNavHtml(current) {
    var links = SECTIONS.filter(function (s) { return s.id !== current; }).map(function (s) {
      return '<a class="btn btn-ghost" href="' + s.href + '">' + escapeHtml(s.label) + '</a>';
    }).join(" ");
    return '<nav class="section-nav" aria-label="Другие разделы проекта">' + links + '</nav>';
  }
  /* Отдел 2 «Карта-схема». */
  function renderMap() {
    var app = resolveApp();
    if (!app) { return; }
    var list = ROUTE.map(function (slug, index) {
      var c = R.findChurchBySlug(slug);
      return '<li data-slug="' + c.slug + '"><span class="route-step">' + (index + 1) + '</span>' + markerHtml() +
        '<a class="route-name" href="#/' + c.slug + '">' + escapeHtml(c.name) + '</a>' +
        '<span class="route-settlement">' + escapeHtml(c.settlement) + ' · ' + c.coords.lat.toFixed(4) + ', ' + c.coords.lon.toFixed(4) + '</span>' +
        '<a class="btn btn-ghost" href="#/' + c.slug + '">Открыть</a></li>';
    }).join("");
    app.innerHTML = '<h1>Карта-схема маршрута</h1>' +
      '<p class="page-lead">Схематичная карта Мостовского района: иконки церквей — три остановки маршрута, пунктирная линия — порядок движения. Номер на иконке — шаг маршрута, клик по иконке открывает страницу храма.</p>' +
      '<section class="map-schema" aria-label="Схема маршрута"></section>' +
      '<section><h2>Объекты на схеме</h2><ol class="route-list">' + list + '</ol></section>' +
      '<p class="data-note">Схема условная: контур района, река Неман, леса и дороги даны обобщённо — это не навигационная карта. Точные координаты каждого храма открываются кнопками «Открыть на Яндекс.Картах» на странице храма.</p>' +
      sectionNavHtml("map");
    document.title = "Карта-схема — Храмы Мостовского района";
    var schema = document.querySelector(".map-schema");
    if (schema && window.ChurchMap) { window.ChurchMap.renderSchema(schema); }
    wireMapListSync(schema);
  }
  /* Отдел 3 «Описание»: историческая справка и обоснование привлекательности. */
  function opisCardHtml(church, index) {
    var facts = church.facts.slice(0, 3).map(function (fact) { return '<li>' + escapeHtml(fact) + '</li>'; }).join("");
    return '<article class="card stop-card"><header class="stop-head"><span class="route-step">' + (index + 1) + '</span>' + markerHtml() +
      '<h3><a href="#/' + church.slug + '">' + escapeHtml(church.name) + '</a></h3>' +
      '<p class="stop-meta">' + escapeHtml(church.settlement) + ' · ' + escapeHtml(church.built) + ' · ' + escapeHtml(church.status) + '</p></header>' +
      '<p class="stop-appeal">' + escapeHtml(church.appeal || "") + '</p>' +
      '<p>' + escapeHtml(church.history[0]) + '</p><ul class="facts-list">' + facts + '</ul>' +
      '<p><a class="btn btn-ghost" href="#/' + church.slug + '">Подробная страница храма</a> <a class="btn btn-ghost" href="#/logistika">Как добраться</a></p></article>';
  }
  function renderOpis() {
    var app = resolveApp();
    if (!app) { return; }
    var cards = ROUTE.map(function (slug, index) { return opisCardHtml(R.findChurchBySlug(slug), index); }).join("");
    var paragraphs = ['Маршрут компактный: от Гродно до первой остановки 52,8 км, между церквями — 12,7 км и 16,3 км, а от последней до Мостов 14,6 км. За один день группа успевает увидеть три разных памятника XIX века: ретроспективно-русскую церковь с шатровой колокольней 1909 года в Гудевичах, «крепостную» церковь с чертами ренессанса и готики в Лунно и один из крупнейших сельских храмов района с 35-метровым куполом в Дубно.', 'Все три храма — действующие приходы, поэтому поездку можно совместить с богослужением: расписания и телефоны настоятелей собраны в разделе «Справочная информация». Дорога проходит через Мосты — районный центр, где есть кафе и магазины, а в самих деревнях пунктов питания нет.', 'Маршрут проходится на автомобиле, пригородном автобусе или частично пешком: перегоны Гудевичи — Лунно и Лунно — Дубно связаны дорогой и подходят для пешего перехода.'].map(function (text) { return '<p>' + escapeHtml(text) + '</p>'; }).join("");
    app.innerHTML = '<h1>Описание маршрута</h1>' +
      '<p class="page-lead">Текстовая часть проекта: краткая историческая справка по каждому объекту и обоснование привлекательности маршрута.</p>' +
      '<section class="card"><h2>Почему этот маршрут привлекателен</h2>' + paragraphs + '</section>' +
      '<section><h2>Остановки: историческая справка</h2><div class="stop-cards">' + cards + '</div></section>' +
      sectionNavHtml("opis");
    document.title = "Описание — Храмы Мостовского района";
  }
  /* Отдел 4 «Логистика»: способы передвижения и расстояния. */
  function renderLogistika() {
    var app = resolveApp();
    if (!app) { return; }
    var rows = ROUTE.map(function (slug, index) {
      var c = R.findChurchBySlug(slug);
      return '<tr><td>' + (index + 1) + ' · ' + escapeHtml(c.settlement) + '</td>' +
        '<td>' + escapeHtml(c.logistics.fromGrodno.road) + '<br><span class="cell-note">' + escapeHtml(c.logistics.fromGrodno.car) + ' на машине</span></td>' +
        '<td>' + escapeHtml(c.logistics.fromMosty.road) + '<br><span class="cell-note">' + escapeHtml(c.logistics.fromMosty.car) + ' на машине</span></td>' +
        '<td>' + escapeHtml(c.logistics.bus) + '</td>' +
        '<td>' + escapeHtml(c.logistics.walk) + '</td></tr>';
    }).join("");
    var legs = ROUTE_LEGS.map(legRowHtml).join("");
    var modes = ['<strong>Автомобилем.</strong> Самый удобный вариант для группы: полный круг Гродно — Гудевичи — Лунно — Дубно — Мосты — Гродно составляет около 160 км.', '<strong>Автобусом.</strong> Пригородные рейсы отходят от автостанции в Мостах ко всем трём остановкам; расписание уточняйте в кассе автостанции перед поездкой.', '<strong>Пешком.</strong> Между соседними сёлами можно идти пешком: Гудевичи — Лунно 12,7 км (≈2 ч 50 мин), Лунно — Дубно 16,3 км (≈3 ч 40 мин). Пешие расчёты даны по скорости 4,5 км/ч и не учитывают привалы и рельеф.'].map(function (text) { return '<p>' + text + '</p>'; }).join("");
    app.innerHTML = '<h1>Логистика маршрута</h1>' +
      '<p class="page-lead">Способы передвижения и расстояния до каждой остановки — от Гродно (областной центр) и от Мостов (районный центр).</p>' +
      '<section><h2>Сколько ехать до каждого храма</h2><div class="table-scroll"><table class="data-table"><thead><tr><th>Остановка</th><th>От Гродно</th><th>От Мостов</th><th>Автобус</th><th>Пешком</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="data-note">Расстояния — по дорожным маршрутам OpenStreetMap, время на автомобиле — оценка без учёта остановок и погоды. На телефоне таблицу можно прокрутить вбок.</p></section>' +
      '<section><h2>Перегоны между остановками</h2><div class="table-scroll"><table class="data-table"><thead><tr><th>№</th><th>Участок</th><th>Способ</th><th>Расстояние</th><th>Время</th></tr></thead><tbody>' + legs + '</tbody></table></div></section>' +
      '<section class="card"><h2>Способы передвижения</h2>' + modes + '</section>' +
      sectionNavHtml("logistika");
    document.title = "Логистика — Храмы Мостовского района";
  }
  /* Отдел 5 «Справочная информация»: контакты приходов и пункты питания. */
  function contactCardHtml(church, index) {
    var tel = church.phone ? '<a href="tel:' + church.phone.replace(/[^+\d]/g, "") + '">' + escapeHtml(church.phone) + '</a>' : '';
    return '<article class="card stop-card"><header class="stop-head"><span class="route-step">' + (index + 1) + '</span>' + markerHtml() +
      '<h3>' + escapeHtml(church.name) + '</h3><p class="stop-meta">' + escapeHtml(church.settlement) + '</p></header>' +
      '<dl class="fact-panel"><dt>Настоятель</dt><dd>' + escapeHtml(church.rector) + '</dd>' +
      '<dt>Телефон</dt><dd>' + tel + '</dd>' +
      '<dt>Адрес</dt><dd>' + escapeHtml(church.address) + '</dd>' +
      '<dt>Богослужения</dt><dd>' + escapeHtml(church.services) + '</dd>' +
      (church.parishNote ? '<dt>Приход</dt><dd>' + escapeHtml(church.parishNote) + '</dd>' : '') +
      '<dt>Питание</dt><dd>' + escapeHtml(church.food) + '</dd></dl>' +
      '<p><a class="btn btn-ghost" href="#/' + church.slug + '">Страница храма</a></p></article>';
  }
  function sourceCheckHtml() {
    var items = [
      { done: true, text: 'orthos.org — карточки храмов: настоятели, расписание, телефоны' },
      { done: true, text: '«Достопримечательности Мостовского района» — официальный туристический сборник района' },
      { done: true, text: 'planetabelarus.by — координаты и описания объектов' },
      { done: true, text: 'sobory.ru — каталог православных храмов' },
      { done: true, text: 'OpenStreetMap — дорожные маршруты и километраж' },
      { done: false, text: 'Беседа со священником или старожилом — запись интервью' }
    ];
    var done = items.filter(function (item) { return item.done; }).length;
    var list = items.map(function (item) {
      return '<li class="source-check' + (item.done ? ' is-done' : '') + '"><span class="check-mark" aria-hidden="true">' + (item.done ? '✓' : '☐') + '</span> ' + escapeHtml(item.text) + '</li>';
    }).join("");
    return '<section class="card"><h2>Список источников</h2>' +
      '<p class="page-lead">Критерии конкурса требуют не менее пяти источников, включая беседу со священником или старожилом. Готово ' + done + ' из ' + items.length + '.</p>' +
      '<ul class="source-checks">' + list + '</ul>' +
      '<p class="data-note">Незакрытые пункты завершает автор проекта: запись беседы собирается во время поездки.</p></section>';
  }
  function renderSpravka() {
    var app = resolveApp();
    if (!app) { return; }
    var contacts = ROUTE.map(function (slug, index) { return contactCardHtml(R.findChurchBySlug(slug), index); }).join("");
    var places = FOOD.places.map(function (place) {
      return '<li>' + escapeHtml(place.name) + ' — ' + escapeHtml(place.address) + '</li>';
    }).join("");
    app.innerHTML = '<h1>Справочная информация</h1><p class="page-lead">Контакты приходов, расписание богослужений и ближайшие пункты питания — всё, что нужно знать перед поездкой.</p>' +
      '<section><h2>Приходы и контакты</h2><div class="stop-cards">' + contacts + '</div></section>' +
      '<section class="card"><h2>Где поесть</h2><p>' + escapeHtml(FOOD.note) + '</p><ul class="facts-list">' + places + '</ul></section>' +
      sourceCheckHtml() + sectionNavHtml("spravka");
    document.title = "Справочная информация — Храмы Мостовского района";
  }
  /* Отдел 6 «Фотоотчёт»: слоты под личные фотографии участников. */
  var VISIT_KINDS = ['участники на фоне храма', 'процесс движения по маршруту'];
  function reportSlotHtml(church, kind, index) {
    var photos = church.visitPhotos || [];
    var photo = photos[index];
    if (photo && photo.src) {
      return '<figure class="report-slot is-filled"><img src="' + escapeHtml(photo.src) + '" alt="' + escapeHtml(church.shortName + ' — ' + kind) + '" loading="lazy">' +
        '<figcaption><strong>' + escapeHtml(church.shortName) + '</strong><br>' + escapeHtml(kind) +
        (photo.credit ? '<br><span class="slot-meta">' + escapeHtml(photo.credit) + '</span>' : '') + '</figcaption></figure>';
    }
    return '<figure class="report-slot"><div class="report-slot-frame" role="img" aria-label="Фотография добавляется после поездки">' +
      '<span class="slot-plus" aria-hidden="true">+</span><span class="slot-caption">Фото добавляется</span></div>' +
      '<figcaption><strong>' + escapeHtml(church.shortName) + '</strong><br>' + escapeHtml(kind) +
      '<br><span class="slot-meta">после поездки: файл в img/photos/visit/ и строка в data.js</span></figcaption></figure>';
  }
  function renderFoto() {
    var app = resolveApp();
    if (!app) { return; }
    var slots = "";
    ROUTE.forEach(function (slug) {
      var church = R.findChurchBySlug(slug);
      VISIT_KINDS.forEach(function (kind, index) { slots += reportSlotHtml(church, kind, index); });
    });
    app.innerHTML = '<h1>Фотоотчёт о посещении</h1><p class="page-lead">Отдел подтверждает личное посещение объектов: участники на фоне храмов и процесс движения по маршруту. Слоты заполняются после поездки — в них встанут фотографии авторов проекта.</p>' +
      '<section><h2>Кадры, которые нужно сделать</h2><div class="report-grid">' + slots + '</div></section>' +
      '<section class="card"><h2>Как добавить фотографии</h2><ol class="facts-list">' +
      '<li>Снять участников на фоне каждого из трёх храмов и в пути между ними.</li>' +
      '<li>Положить файлы в папку <code>img/photos/visit/</code>, например <code>gudevichi-1.jpg</code>.</li>' +
      '<li>Добавить их в <code>js/data.js</code> в поле храма <code>visitPhotos</code>: <code>{ src: "img/photos/visit/gudevichi-1.jpg", credit: "фото автора, дата" }</code>.</li>' +
      '<li>Обновить страницу: слот заменится фотографией автоматически.</li></ol>' +
      '<p class="data-note">Пока слоты пустые, страница честно показывает, что фотоотчёт ещё не снят: чужие фотографии из интернета здесь не используются.</p></section>' +
      sectionNavHtml("foto");
    document.title = "Фотоотчёт — Храмы Мостовского района";
  }
  function renderNotFound() {
    var app = resolveApp();
    if (!app) { return; }
    document.title = "Страница не найдена — Храмы Мостовского района";
    app.innerHTML = '<h1>Храм не найден</h1><p>Такой страницы нет. Возможно, ссылка устарела.</p><p><a class="btn" href="#/">Вернуться к маршруту</a> <a class="btn btn-ghost" href="#/opis">Описание маршрута</a></p>';
  }

  window.ChurchViews = {
    renderRoute: renderRoute, renderMap: renderMap, renderOpis: renderOpis,
    renderLogistika: renderLogistika, renderSpravka: renderSpravka, renderFoto: renderFoto,
    renderChurch: renderChurch, renderNotFound: renderNotFound,
    buildMapLinks: buildMapLinks, sections: SECTIONS
  };
})();
