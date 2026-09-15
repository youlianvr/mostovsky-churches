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
  location: { hash: "#/" },
  addEventListener: function (type, handler) { (listeners[type] = listeners[type] || []).push(handler); },
  scrollTo: function () {}
};
global.document = {
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

/* --- block 1: six required elements, in the wording of the competition --- */
var REQUIRED_LABELS = ["Нитка маршрута", "Карта-схема", "Описание", "Логистика", "Справочная информация", "Фотоотчёт"];
check(sections.map(function (s) { return s.label; }).join("|") === REQUIRED_LABELS.join("|"),
  "the six block-1 elements must exist in the document's order and wording");
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
check(document.title === "Фотоотчёт — Храмы Мостовского района", "#/foto must dispatch to the photo report");
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
check(appEl.innerHTML.indexOf("Перегоны") !== -1, "itinerary must show the legs between stops");

/* --- map schema: church icon per stop, one route line, no clusters --- */
section("map").render();
var schema = mapBox.innerHTML;
check(count(schema, 'class="map-marker-g"') === 3, "schema must draw 3 markers");
var markerPaint = schema.split('class="map-marker-g"').slice(1);
check(markerPaint.length === 3 && markerPaint.every(function (marker) {
  return marker.indexOf("map-marker-icon") !== -1 && marker.indexOf("ci-cross") !== -1;
}), "each marker must be the church icon, cross included");
check(count(schema, "legend-icon") === 1, "legend must show the same church icon");
check(/map-route-line" points="([^"]+)"/.test(schema) &&
  schema.match(/map-route-line" points="([^"]+)"/)[1].trim().split(/\s+/).length === 3,
  "route line must connect the 3 stops");
TRIO.forEach(function (slug) {
  check(schema.indexOf('href="#/' + slug + '"') !== -1, "the " + slug + " marker must open its page");
});
check(schema.indexOf("cluster") === -1, "no clustering may remain in the schema");

/* --- description: historical note and the appeal of every object --- */
section("opis").render();
check(count(appEl.innerHTML, 'class="stop-appeal"') === 3, "opis must state the appeal of each object");
check(appEl.innerHTML.indexOf("Почему этот маршрут привлекателен") !== -1, "opis must argue the route appeal");
ROUTE.forEach(function (slug) {
  check(appEl.innerHTML.indexOf(H.escape(find(slug).appeal)) !== -1, slug + ": appeal text must reach the page");
});

/* --- logistics: travel modes and distances from both centres --- */
section("logistika").render();
check(appEl.innerHTML.indexOf("От Гродно") !== -1 && appEl.innerHTML.indexOf("От Мостов") !== -1,
  "logistics must give distances from the regional and the district centre");
["Автомобилем", "Автобусом", "Пешком"].forEach(function (mode) {
  check(appEl.innerHTML.indexOf("<strong>" + mode) !== -1, "logistics must describe " + mode);
});
ROUTE.forEach(function (slug) {
  var church = find(slug);
  check(appEl.innerHTML.indexOf(church.logistics.fromGrodno.road) !== -1 &&
    appEl.innerHTML.indexOf(church.logistics.fromMosty.road) !== -1, slug + ": both distances must be shown");
  check(appEl.innerHTML.indexOf(H.escape(church.logistics.bus)) !== -1, slug + ": the bus line must be shown");
});
check(appEl.innerHTML.indexOf(H.escape(BUS.address)) !== -1 && appEl.innerHTML.indexOf(H.escape(BUS.phone)) !== -1,
  "logistics must give the bus station address and ticket office phone");

/* --- reference: parish contacts and places to eat --- */
section("spravka").render();
ROUTE.forEach(function (slug) {
  var church = find(slug);
  check(appEl.innerHTML.indexOf(H.escape(church.rector)) !== -1, slug + ": rector name required");
  check(appEl.innerHTML.indexOf('href="tel:' + church.phone.replace(/[^+\d]/g, "") + '"') !== -1,
    slug + ": a dialable parish phone is required");
});
check(appEl.innerHTML.indexOf("Где поесть") !== -1 && FOOD.places.every(function (place) {
  return appEl.innerHTML.indexOf(H.escape(place.name)) !== -1 && appEl.innerHTML.indexOf(H.escape(place.address)) !== -1;
}), "reference must list real places to eat");
check(count(appEl.innerHTML, 'class="source-check') >= 5, "reference must show at least five sources");

/* --- photo report: one honest empty slot per frame, fillable from data --- */
section("foto").render();
var slots = ROUTE.length * PHOTO_REPORT.kinds.length;
check(count(appEl.innerHTML, 'class="report-slot"') === slots, "photo report must offer " + slots + " slots");
check(count(appEl.innerHTML, "is-filled") === 0, "empty slots must not claim photos before the trip");
check(appEl.innerHTML.indexOf("Фото добавляется") !== -1, "empty slots must be labelled honestly");
find(TRIO[0]).visitPhotos.unshift({ src: "img/photos/visit/test.jpg", credit: "фото автора" });
section("foto").render();
check(count(appEl.innerHTML, "report-slot is-filled") === 1 &&
  appEl.innerHTML.indexOf('src="img/photos/visit/test.jpg"') !== -1, "a data row must fill its slot");
find(TRIO[0]).visitPhotos.shift();

/* --- church page: facts, both map links, visiting info, neighbours --- */
ROUTE.forEach(function (slug) {
  var church = find(slug);
  window.ChurchPage.render(church);
  check(appEl.innerHTML.indexOf("<h1>" + H.escape(church.name) + "</h1>") !== -1, slug + ": page must be titled by the object");
  check(appEl.innerHTML.indexOf(H.escape(church.appeal)) !== -1, slug + ": page must state why to visit");
  check(count(appEl.innerHTML, 'class="locator-map"') === 1, slug + ": district locator required");
  check(count(appEl.innerHTML, "locator-icon") === 3, slug + ": locator must show all three stops");
  check(appEl.innerHTML.indexOf(H.escape(church.logistics.bus)) !== -1, slug + ": the page must repeat its bus line");
  check(appEl.innerHTML.indexOf(H.escape(church.services)) !== -1, slug + ": service schedule required");
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
var swapped = dataSource.replace(
  '  "gudevichi-rozhdestva", // 1 Гудевичи\n  "lunno-predtechi",      // 2 Лунно',
  '  "lunno-predtechi",      // 1 Лунно\n  "gudevichi-rozhdestva", // 2 Гудевичи');
check(swapped !== dataSource, "contract must be able to swap ROUTE order");
var error = dataError(swapped);
check(error && error.message.indexOf("lunno-predtechi") !== -1,
  "reordered ROUTE must be reported against the object found by slug, got: " + (error && error.message));
check(dataError(dataSource) === null, "the shipped data must pass its own integrity rule");

console.log("contract v6 (block1-trio, modular) | modules:", modules.join(" → "));
console.log("sections:", sections.length, "| stops:", ROUTE.length, "| markers:", count(schema, 'class="map-marker-g"'));
console.log("PROBLEMS:", problems.length ? problems : "none");
process.exit(problems.length ? 1 : 0);
