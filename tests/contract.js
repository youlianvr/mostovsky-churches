/* Behavior contract for the no-build vanilla app. Run: node tests/contract.js
 *
 * Modules are read from index.html and executed in the page's own order, so the
 * test fails if the page and the app drift apart. Every check stands for a
 * requirement (competition block 1, its nav, or a page behavior), not for an
 * internal function name. */
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var problems = [];
function check(ok, message) { if (!ok) { problems.push(message); } }
function count(html, needle) { return (html.match(new RegExp(needle, "g")) || []).length; }

var indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
var aboutHtml = fs.readFileSync(path.join(root, "about.html"), "utf8");

/* --- the app's module list: exactly what index.html loads, in its order --- */
var modules = [];
indexHtml.replace(/<script src="([^"]+)"[^>]*><\/script>/g, function (all, src) {
  modules.push(src.replace(/\?.*$/, ""));
  return all;
});

/* --- minimal DOM: one #app writer, one .map-schema box, page listeners --- */
function element() {
  return {
    innerHTML: "", scrollLeft: 0, scrollWidth: 0, clientWidth: 0,
    classList: { add: function () {}, remove: function () {}, toggle: function () {} },
    addEventListener: function () {}, getAttribute: function () { return null; },
    querySelector: function () { return null; }, querySelectorAll: function () { return []; }
  };
}
var appEl = element();
var mapBox = element();
var listeners = {};
global.window = {
  location: { hash: "#/", replace: function (url) { this.hash = url; } },
  addEventListener: function (type, handler) { (listeners[type] = listeners[type] || []).push(handler); },
  scrollTo: function () {}
};
global.document = {
  title: "",
  getElementById: function (id) { return id === "app" ? appEl : null; },
  querySelector: function (selector) { return selector === ".map-schema" ? mapBox : null; },
  querySelectorAll: function () { return []; }
};
function fire(type) { (listeners[type] || []).forEach(function (handler) { handler(); }); }

/* Direct eval at module top level: the app's own globals land in this file. */
eval(modules.map(function (file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}).join(";"));

var H = window.ChurchHtml;
var R = window.ChurchRouter;
var G = window.ChurchMapGeometry;
var sections = window.ChurchSections.list;
function section(id) { return window.ChurchSections.find(id); }
function find(slug) { return R.findChurchBySlug(slug); }

/* --- structure: one implementation, one writer of #app --- */
var jsDir = path.join(root, "js");
var writers = fs.readdirSync(jsDir).filter(function (file) {
  return /getElementById\("app"\)/.test(fs.readFileSync(path.join(jsDir, file), "utf8"));
});
check(writers.join(",") === "dom.js", "#app must be written by js/dom.js alone, got: " + writers.join(","));
check(!/views\.js|ChurchViews/.test(indexHtml + aboutHtml), "pages must not load the removed implementation");
check(/<script/.test(indexHtml), "index.html must load the app");
check(!/<script/.test(aboutHtml), "about.html is static and must not load app code");

/* --- block 1: five section pages in the nav; the sixth required element,
 * the photo report, must render on every church page (checked below) --- */
var REQUIRED_LABELS = ["Нитка маршрута", "Карта-схема", "Описание", "Логистика", "Справочная информация"];
check(sections.map(function (s) { return s.label; }).join("|") === REQUIRED_LABELS.join("|"),
  "the nav must carry the five section pages in the document's order");
sections.forEach(function (item) {
  check(indexHtml.indexOf('href="' + item.href + '"') !== -1, "navbar must link " + item.label + " (" + item.href + ")");
});

/* --- objects: Гудевичи → Лунно → Дубно, no removed object left --- */
var TRIO = ["gudevichi-rozhdestva", "lunno-predtechi", "dubno-nikolaya"];
check(CHURCHES.length === 3, "the route must contain exactly 3 objects");
check(ROUTE.join(",") === TRIO.join(","), "order must be Гудевичи → Лунно → Дубно, got: " + ROUTE.join(" → "));
check(!/Пески|peski/.test(fs.readFileSync(path.join(jsDir, "data.js"), "utf8")), "removed objects must not stay in the data");

/* --- routing and dispatch: URL state → page, through the single writer --- */
fire("DOMContentLoaded");
check(appEl.innerHTML.indexOf("Остановки маршрута") !== -1, "empty hash must dispatch to the itinerary");
check(document.title === "Нитка маршрута — Храмы Мостовского района", "itinerary must own the tab title");
window.location.hash = "#/foto";
fire("hashchange");
check(document.title.indexOf("не найдена") !== -1,
  "#/foto must stop redirecting now that the photo report is gone");
window.location.hash = "#/lunno-predtechi";
fire("hashchange");
check(document.title.indexOf("Иоанна Предтечи") !== -1, "a church slug must dispatch to its page");
window.location.hash = "#/does-not-exist";
fire("hashchange");
check(document.title.indexOf("не найдена") !== -1 && document.title.indexOf("Иоанна") === -1,
  "an unknown slug must render 404 and drop the previous title");
window.location.hash = "#/map";
check(R.parseRoute() === "map", "#/map must parse as map");
window.location.hash = "#/";
check(find("unknown-slug") === null, "unknown slug must not resolve to an object");
check(R.routeNeighbours(find(TRIO[0])).prev === find(TRIO[2]), "first stop previous must wrap to last");
check(R.routeNeighbours(find(TRIO[2])).next === find(TRIO[0]), "last stop next must wrap to first");

/* --- every section renders a page of its own through the single writer --- */
sections.forEach(function (item) {
  appEl.innerHTML = "";
  item.render();
  check(appEl.innerHTML.length > 0, item.label + " rendered nothing");
  check(appEl.innerHTML.indexOf("<h1>") !== -1, item.label + " must have a heading");
});

/* --- itinerary: three stops with the church icon plus the legs table --- */
section("").render();
check(count(appEl.innerHTML, 'class="route-name"') === 3, "itinerary must list 3 stops");
check(count(appEl.innerHTML, "stop-icon") === 3, "each stop needs the church icon");
check(appEl.innerHTML.indexOf("<h1>Дорогами духовности</h1>") !== -1,
  "the itinerary must carry the project title as its heading");

/* --- map schema: church icon per stop, one route line, no clusters --- */
section("map").render();
var schema = mapBox.innerHTML;
check(count(schema, 'class="map-marker-g"') === 3, "schema must draw 3 markers");
var markerPaint = schema.split('class="map-marker-g"').slice(1);
check(markerPaint.length === 3 && markerPaint.every(function (marker) {
  return marker.indexOf("map-marker-icon") !== -1 && marker.indexOf("ci-cross") !== -1;
}), "each marker must be the church icon, cross included");
check(count(schema, "legend-icon") === 1, "legend must show the same church icon");
/* Нитка маршрута теперь по реальным дорогам: 4 перегона OSRM, и первый
 * перегон начинается в Гродно, а не в первой остановке. */
check((schema.match(/map-route-line"/g) || []).length === 4,
  "route line must draw 4 road legs");
TRIO.forEach(function (slug) {
  check(schema.indexOf('href="#/' + slug + '"') !== -1, "the " + slug + " marker must open its page");
});
check(schema.indexOf("cluster") === -1, "no clustering may remain in the schema");
check((appEl.innerHTML + mapBox.innerHTML).indexOf("openstreetmap.org/copyright") !== -1,
  "the schema must attribute OpenStreetMap data (ODbL requirement)");

/* --- description: historical note and the appeal of every object --- */
section("opis").render();
check(count(appEl.innerHTML, 'class="stop-appeal"') === 3, "opis must state the appeal of each object");
check(appEl.innerHTML.indexOf("Привлекательность маршрута") !== -1, "opis must argue the route appeal");
ROUTE.forEach(function (slug) {
  check(appEl.innerHTML.indexOf(H.escape(find(slug).appeal)) !== -1, slug + ": appeal text must reach the page");
});

/* --- logistics: travel modes and distances from both centres --- */
section("logistika").render();
check(appEl.innerHTML.indexOf("<th>Гродно</th>") !== -1 && appEl.innerHTML.indexOf("<th>Мосты</th>") !== -1,
  "logistics must give distances from the regional and the district centre");
["Автомобилем", "Автобусом", "Пешком"].forEach(function (mode) {
  check(appEl.innerHTML.indexOf("<strong>" + mode) !== -1, "logistics must describe " + mode);
});
ROUTE.forEach(function (slug) {
  var church = find(slug);
  check(appEl.innerHTML.indexOf(church.logistics.fromGrodno.road) !== -1 &&
    appEl.innerHTML.indexOf(church.logistics.fromMosty.road) !== -1, slug + ": both distances must be shown");

});
[BUS.mosty, BUS.grodno].forEach(function (hub) {
  check(appEl.innerHTML.indexOf(H.escape(hub.name)) !== -1 &&
    appEl.innerHTML.indexOf(H.escape(hub.address)) !== -1 &&
    appEl.innerHTML.indexOf(H.escape(hub.phone)) !== -1,
    "logistics must give the address and phone of " + hub.name);
});
/* Автобусы у остановок: у каждого храма — своя остановка с рейсами, а не
 * отговорка «до Дубно прямого рейса нет». */
check(BUS_STOPS.length === ROUTE.length, "every stop of the route must carry its own bus timetable");
BUS_STOPS.forEach(function (entry) {
  var church = find(entry.slug);
  check(entry.trips.length >= 2, entry.slug + ": a stop needs trips in both directions");
  check(appEl.innerHTML.indexOf(H.escape(church.settlement) + " — " + H.escape(entry.stop)) !== -1,
    entry.slug + ": the bus stop must be named on the page");
  entry.trips.forEach(function (trip) {
    check(appEl.innerHTML.indexOf(H.escape(trip.to)) !== -1 && appEl.innerHTML.indexOf(H.escape(trip.times)) !== -1,
      entry.slug + ": destination and times must reach the page — " + trip.to);
  });
  check(appEl.innerHTML.indexOf(H.escape(entry.toChurch)) !== -1,
    entry.slug + ": the walk from the stop to the church must be stated");
});
check(appEl.innerHTML.indexOf("Автобусы у остановок маршрута") !== -1,
  "logistics must carry a bus timetable section");
check(BUS.checked && appEl.innerHTML.indexOf(H.escape(BUS.checked)) !== -1,
  "the bus data must state the date it was checked");

/* --- reference: parish contacts and places to eat --- */
section("spravka").render();
ROUTE.forEach(function (slug) {
  var church = find(slug);
  check(appEl.innerHTML.indexOf(H.escape(church.rector)) !== -1, slug + ": rector name required");
  check(appEl.innerHTML.indexOf('href="tel:' + church.phone.replace(/[^+\d]/g, "") + '"') !== -1,
    slug + ": a dialable parish phone is required");
  check(appEl.innerHTML.indexOf(H.escape(church.services)) !== -1,
    slug + ": service schedule required on the reference page");
});
check(appEl.innerHTML.indexOf("Питание") !== -1 && FOOD.places.every(function (place) {
  return appEl.innerHTML.indexOf(H.escape(place.name)) !== -1 && appEl.innerHTML.indexOf(H.escape(place.address)) !== -1;
}), "reference must list real places to eat");
check(count(appEl.innerHTML, 'class="source-check') >= 5, "reference must show at least five sources");

/* --- photo report removed by owner decision (2026-09-26): no church page
 * may carry its slots or its label --- */
ROUTE.forEach(function (slug) {
  window.ChurchPage.render(find(slug));
  check(appEl.innerHTML.indexOf("report-slot") === -1 && appEl.innerHTML.indexOf("Фотоотчёт") === -1,
    slug + ": photo report must be gone from the church page");
});

/* --- church page: facts, both map links, parish info, neighbours --- */
ROUTE.forEach(function (slug) {
  var church = find(slug);
  window.ChurchPage.render(church);
  check(appEl.innerHTML.indexOf("<h1>" + H.escape(church.name) + "</h1>") !== -1, slug + ": page must be titled by the object");
  check(appEl.innerHTML.indexOf(H.escape(church.appeal)) !== -1, slug + ": page must state why to visit");
  check(count(appEl.innerHTML, 'class="locator-map"') === 1, slug + ": district locator required");
  check(count(appEl.innerHTML, "locator-icon") === 3, slug + ": locator must show all three stops");
  check(appEl.innerHTML.indexOf("Как добраться") === -1,
    slug + ": the church page must not repeat the logistics block");
  var links = window.ChurchPage.buildMapLinks(church);
  check(links.yandex === "https://yandex.ru/maps/?pt=" + church.coords.lon + "," + church.coords.lat + "&z=17",
    slug + ": Yandex link must carry lon,lat");
  check(links.osm === "https://www.openstreetmap.org/?mlat=" + church.coords.lat + "&mlon=" + church.coords.lon + "&zoom=17",
    slug + ": OSM link must carry lat,lon");
});

/* --- data integrity rule: routeStep is compared by slug, not by position --- */
var dataSource = fs.readFileSync(path.join(jsDir, "data.js"), "utf8");
function dataError(source) {
  try {
    new Function("window", "document", source + "\nreturn { CHURCHES: CHURCHES, ROUTE: ROUTE };")(
      { addEventListener: function () {} }, {});
    return null;
  } catch (error) { return error; }
}
/* Порядок ROUTE меняем внутри самого массива: своп не должен задеть слаги
 * объектов, иначе проверка «диагност называет объект по слагу» теряет смысл. */
var Q = String.fromCharCode(34);
var routeBlock = dataSource.slice(dataSource.indexOf("var ROUTE = ["));
routeBlock = routeBlock.slice(0, routeBlock.indexOf("];") + 2);
var swappedBlock = routeBlock
  .replace(Q + "gudevichi-rozhdestva" + Q, Q + "__swap__" + Q)
  .replace(Q + "lunno-predtechi" + Q, Q + "gudevichi-rozhdestva" + Q)
  .replace(Q + "__swap__" + Q, Q + "lunno-predtechi" + Q);
var swapped = dataSource.replace(routeBlock, swappedBlock);
check(swapped !== dataSource, "contract must be able to swap ROUTE order");
var error = dataError(swapped);
check(error && error.message.indexOf("lunno-predtechi") !== -1,
  "reordered ROUTE must be reported against the object found by slug, got: " + (error && error.message));
check(dataError(dataSource) === null, "the shipped data must pass its own integrity rule");

console.log("contract v8 (block1-trio, modular, photo-report-removed) | modules:", modules.join(" → "));
console.log("sections:", sections.length, "| stops:", ROUTE.length, "| markers:", count(schema, 'class="map-marker-g"'));
console.log("PROBLEMS:", problems.length ? problems : "none");
process.exit(problems.length ? 1 : 0);
