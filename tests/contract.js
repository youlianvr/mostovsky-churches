/* Versioned behavior contract for the no-build vanilla app. Run: node tests/contract.js */
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var problems = [];
var appEl = { innerHTML: "" };

global.window = { location: { hash: "#/" }, addEventListener: function () {}, scrollTo: function () {} };
global.document = { getElementById: function () { return appEl; }, querySelector: function () { return null; } };

eval(fs.readFileSync(path.join(root, "js/data.js"), "utf8"));
eval(fs.readFileSync(path.join(root, "js/router.js"), "utf8"));
eval(fs.readFileSync(path.join(root, "js/map-geometry.js"), "utf8"));
eval(fs.readFileSync(path.join(root, "js/views.js"), "utf8"));
eval(fs.readFileSync(path.join(root, "js/app.js"), "utf8"));

function check(condition, message) { if (!condition) problems.push(message); }
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

/* Route boundary: neighbors and hash parsing. */
var first = find(ROUTE[0]);
var last = find(ROUTE[2]);
check(Router.routeNeighbours(first).prev === last, "first previous must wrap to last");
check(Router.routeNeighbours(last).next === first, "last next must wrap to first");
check(Router.parseRoute() === "", "empty hash must select home");
window.location.hash = "#/map";
check(Router.parseRoute() === "map", "#/map must parse as map");
window.location.hash = "#/unknown-slug";
check(Router.parseRoute() === "unknown-slug", "slug hash must parse literally");
check(find("unknown-slug") === null, "unknown slug must not resolve");

/* External map contract: coordinate order is part of the public URL behavior. */
CHURCHES.forEach(function (church) {
  var links = Views.buildMapLinks(church);
  check(links.yandex === "https://yandex.ru/maps/?pt=" + church.coords.lon + "," + church.coords.lat + "&z=17", "Yandex URL mismatch: " + church.slug);
  check(links.osm === "https://www.openstreetmap.org/?mlat=" + church.coords.lat + "&mlon=" + church.coords.lon + "&zoom=17", "OSM URL mismatch: " + church.slug);
});

/* Map model contract: three distinct settlements — no cluster, 3 singles. */
/* Logistics contract: every route object is reachable from both the
 * district centre and the regional centre. */
CHURCHES.forEach(function (church) {
  check(!!church.logistics, church.slug + ": logistics required");
  check(!!(church.logistics && church.logistics.fromGrodno && church.logistics.fromGrodno.road), church.slug + ": distance from Grodno required");
  check(!!(church.logistics && church.logistics.fromMosty && church.logistics.fromMosty.road), church.slug + ": distance from Mosty required");
});
check(Array.isArray(ROUTE_LEGS) && ROUTE_LEGS.length >= 3, "ROUTE_LEGS must describe the itinerary");
check(!!(FOOD && FOOD.places && FOOD.places.length), "FOOD must list places to eat");

var map = window.ChurchMapGeometry.buildSchemaData();
check(map.points.length === 3, "map must expose 3 route points");
check(map.points.every(function (point, i) { return point.step === i + 1 && point.slug === ROUTE[i]; }), "map points must follow ROUTE order");
check(map.clusters.length === 0, "focus set must have no clusters");
check(map.singles.length === 3, "map must have 3 single markers");

/* Render boundary: page views preserve the essential public states. */
Views.renderHome();
check(appEl.innerHTML.indexOf("Схема маршрута") !== -1, "home must render the map region");
check((appEl.innerHTML.match(/class="route-name"/g) || []).length === 3, "home must render 3 route entries");
Views.renderChurch(first);
check(appEl.innerHTML.indexOf("Открыть на Яндекс.Картах") !== -1, "church page must render Yandex link");
check(appEl.innerHTML.indexOf("OpenStreetMap") !== -1, "church page must render OSM link");
Views.renderNotFound();
check(appEl.innerHTML.indexOf("Храм не найден") !== -1, "404 view must render not-found copy");

console.log("contract v4 (block1-trio) | objects:", CHURCHES.length, "| route:", ROUTE.length, "| clusters:", map.clusters.length, "| singles:", map.singles.length);
console.log("PROBLEMS:", problems.length ? problems : "none");
process.exit(problems.length ? 1 : 0);
