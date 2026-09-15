/* Versioned behavior contract for the no-build vanilla app. Run: node tests/contract.js */
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var problems = [];
var appEl = { innerHTML: "" };

global.window = { location: { hash: "#/" }, addEventListener: function () {}, scrollTo: function () {} };
global.document = { getElementById: function () { return appEl; }, querySelector: function () { return null; } };

eval(fs.readFileSync(path.join(root, "js/church-icon.js"), "utf8"));
eval(fs.readFileSync(path.join(root, "js/data.js"), "utf8"));
eval(fs.readFileSync(path.join(root, "js/router.js"), "utf8"));
eval(fs.readFileSync(path.join(root, "js/map-geometry.js"), "utf8"));
eval(fs.readFileSync(path.join(root, "js/views.js"), "utf8"));
eval(fs.readFileSync(path.join(root, "js/app.js"), "utf8"));

function check(condition, message) { if (!condition) problems.push(message); }
function count(html, needle) { return (html.match(new RegExp(needle, "g")) || []).length; }
var Router = window.ChurchRouter;
var Views = window.ChurchViews;
function find(slug) { return Router.findChurchBySlug(slug); }

/* Data boundary: the approved focus set is exactly 3 objects
 * (owner decision 2026-09-15: Гудевичи, Лунно, Дубно — the trio of the
 * competition block 1 «Дорогами духовности»). */
var APPROVED = ["gudevichi-rozhdestva", "lunno-predtechi", "dubno-nikolaya"];
check(CHURCHES.length === 3, "CHURCHES must contain 3 objects");
check(ROUTE.length === 3, "ROUTE must contain 3 steps");
check(new Set(ROUTE).size === 3, "ROUTE must not duplicate slugs");
check(ROUTE.join(",") === APPROVED.join(","), "ROUTE must be gudevichi, lunno, dubno in order");
ROUTE.forEach(function (slug, i) {
  check(find(slug) !== null, "ROUTE step " + (i + 1) + " has no object");
  check(find(slug).routeStep === i + 1, slug + ": routeStep must be " + (i + 1));
});
/* Every kept object must have a verified photo — that is the point of the focus set. */
CHURCHES.forEach(function (church) {
  check(!church.placeholder, church.slug + ": focus set must not contain placeholders");
  check(!!church.photo && !!church.photoCredit, church.slug + ": photo and credit required");
});

/* Competition contract: the six mandatory elements of block 1 are the site's
 * sections, in the wording of the competition document. */
var SECTIONS = ["Нитка маршрута", "Карта-схема", "Описание", "Логистика", "Справочная информация", "Фотоотчёт"];
check(Views.sections.map(function (s) { return s.label; }).join("|") === SECTIONS.join("|"),
  "the six block-1 sections must exist in the document's order");
var indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
Views.sections.forEach(function (s) {
  check(indexHtml.indexOf('href="' + s.href + '"') !== -1,
    "navbar must link section " + s.label + " (" + s.href + ")");
});

/* Route boundary: neighbors and hash parsing. */
var first = find(ROUTE[0]);
var last = find(ROUTE[2]);
check(Router.routeNeighbours(first).prev === last, "first previous must wrap to last");
check(Router.routeNeighbours(last).next === first, "last next must wrap to first");
check(Router.parseRoute() === "", "empty hash must select home");
window.location.hash = "#/map";
check(Router.parseRoute() === "map", "#/map must parse as map");
window.location.hash = "#/logistika";
check(Router.parseRoute() === "logistika", "#/logistika must parse as logistika");
window.location.hash = "#/unknown-slug";
check(Router.parseRoute() === "unknown-slug", "slug hash must parse literally");
check(find("unknown-slug") === null, "unknown slug must not resolve");

/* External map contract: coordinate order is part of the public URL behavior. */
CHURCHES.forEach(function (church) {
  var links = Views.buildMapLinks(church);
  check(links.yandex === "https://yandex.ru/maps/?pt=" + church.coords.lon + "," + church.coords.lat + "&z=17", "Yandex URL mismatch: " + church.slug);
  check(links.osm === "https://www.openstreetmap.org/?mlat=" + church.coords.lat + "&mlon=" + church.coords.lon + "&zoom=17", "OSM URL mismatch: " + church.slug);
});

/* Logistics contract: every route object is reachable from both the
 * district centre and the regional centre, by car, bus and on foot. */
CHURCHES.forEach(function (church) {
  check(!!church.logistics, church.slug + ": logistics required");
  check(!!(church.logistics && church.logistics.fromGrodno && church.logistics.fromGrodno.road), church.slug + ": distance from Grodno required");
  check(!!(church.logistics && church.logistics.fromMosty && church.logistics.fromMosty.road), church.slug + ": distance from Mosty required");
  check(!!(church.logistics && church.logistics.bus && church.logistics.walk), church.slug + ": bus and walk options required");
});
check(Array.isArray(ROUTE_LEGS) && ROUTE_LEGS.length >= 3, "ROUTE_LEGS must describe the itinerary");
check(!!(FOOD && FOOD.places && FOOD.places.length), "FOOD must list places to eat");

var map = window.ChurchMapGeometry.buildSchemaData();
check(map.points.length === 3, "map must expose 3 route points");
check(map.points.every(function (point, i) { return point.step === i + 1 && point.slug === ROUTE[i]; }), "map points must follow ROUTE order");
check(map.clusters.length === 0, "focus set must have no clusters");
check(map.singles.length === 3, "map must have 3 single markers");

/* Icon contract: one church icon shared by the map, the legend and the lists. */
check(typeof window.ChurchIcon.svg === "function", "ChurchIcon.svg must exist");
check(count(window.ChurchIcon.svg("church-icon"), 'class="ci-') === 4, "church icon must draw body, roof, dome and cross");
check(window.ChurchIcon.svg("stop-icon").indexOf('aria-hidden="true"') !== -1, "decorative icon must be hidden from screen readers");
check(count(window.ChurchIcon.svg("church-icon stop-icon"), 'class="church-icon stop-icon"') === 1, "modifier classes must fit in one class attribute");

/* Render boundary: page views preserve the essential public states. */
Views.renderRoute();
check(appEl.innerHTML.indexOf("Нитка маршрута") !== -1, "route page must render the itinerary");
check(count(appEl.innerHTML, 'class="route-name"') === 3, "route page must render 3 route entries");
check(count(appEl.innerHTML, "stop-icon") === 3, "route page must show a church icon per stop");
check(appEl.innerHTML.indexOf("Перегоны") !== -1, "route page must render the legs table");
Views.renderMap();
check(appEl.innerHTML.indexOf("Схема маршрута") !== -1, "map page must render the map region");
check(count(appEl.innerHTML, "stop-icon") === 3, "map page list must show a church icon per stop");
Views.renderOpis();
check(count(appEl.innerHTML, 'class="stop-appeal"') === 3, "opis page must justify the appeal of each object");
check(appEl.innerHTML.indexOf("Почему этот маршрут привлекателен") !== -1, "opis page must argue the route appeal");
Views.renderLogistika();
check(appEl.innerHTML.indexOf("От Гродно") !== -1, "logistics page must show distances from Grodno");
check(appEl.innerHTML.indexOf("От Мостов") !== -1, "logistics page must show distances from Mosty");
check(appEl.innerHTML.indexOf("Пешком") !== -1, "logistics page must mention walking");
check(appEl.innerHTML.indexOf("Автобусом") !== -1, "logistics page must mention the bus");
Views.renderSpravka();
check(appEl.innerHTML.indexOf("Настоятель") !== -1, "reference page must show parish contacts");
check(appEl.innerHTML.indexOf("Где поесть") !== -1, "reference page must show places to eat");
check(appEl.innerHTML.indexOf("Список источников") !== -1, "reference page must show the source checklist");
Views.renderFoto();
check(count(appEl.innerHTML, 'class="report-slot"') === 6, "photo report must offer two slots per stop");
check(appEl.innerHTML.indexOf("Фото добавляется") !== -1, "empty report slots must be labelled honestly");
Views.renderChurch(first);
check(appEl.innerHTML.indexOf("Открыть на Яндекс.Картах") !== -1, "church page must render Yandex link");
check(appEl.innerHTML.indexOf("OpenStreetMap") !== -1, "church page must render OSM link");
check(appEl.innerHTML.indexOf('class="church-lead"') !== -1, "church page must state why the object is worth visiting");
check(appEl.innerHTML.indexOf("Как добраться") !== -1, "church page must render visiting info");
check(count(appEl.innerHTML, 'class="locator-map"') === 1, "church page must show the district locator");
Views.renderNotFound();
check(appEl.innerHTML.indexOf("Храм не найден") !== -1, "404 view must render not-found copy");

console.log("contract v5 (block1-trio) | objects:", CHURCHES.length, "| sections:", Views.sections.length,
  "| clusters:", map.clusters.length, "| singles:", map.singles.length);
console.log("PROBLEMS:", problems.length ? problems : "none");
process.exit(problems.length ? 1 : 0);
