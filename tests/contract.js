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

/* Data boundary: the approved route is exactly 12 orthodox objects (DG8). */
check(CHURCHES.length === 12, "CHURCHES must contain 12 objects");
check(ROUTE.length === 12, "ROUTE must contain 12 steps");
check(new Set(ROUTE).size === 12, "ROUTE must not duplicate slugs");
ROUTE.forEach(function (slug, i) {
  check(find(slug) !== null, "ROUTE step " + (i + 1) + " has no object");
});

/* Route boundary: ring neighbors and hash parsing. */
var first = find(ROUTE[0]);
var last = find(ROUTE[11]);
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

/* Map model contract: logical route, three approved clusters, 11 singles. */
var map = window.ChurchMapGeometry.buildSchemaData();
check(map.points.length === 12, "map must expose 12 route points");
check(map.points.every(function (point, i) { return point.step === i + 1 && point.slug === ROUTE[i]; }), "map points must follow ROUTE order");
var clusters = {};
map.clusters.forEach(function (cluster) { clusters[cluster.name] = cluster.members.map(function (member) { return member.slug; }); });
check(Object.keys(clusters).length === 1, "map must have exactly one cluster");
check(clusters["Мосты"] && clusters["Мосты"].length === 3, "Мосты cluster must have 3 members");
check(map.singles.length === 9, "map must have 9 single markers");

/* Render boundary: page views preserve the essential public states. */
Views.renderHome();
check(appEl.innerHTML.indexOf("Схема маршрута") !== -1, "home must render the map region");
check((appEl.innerHTML.match(/class="route-name"/g) || []).length === 12, "home must render 12 route entries");
Views.renderChurch(first);
check(appEl.innerHTML.indexOf("Открыть на Яндекс.Картах") !== -1, "church page must render Yandex link");
check(appEl.innerHTML.indexOf("OpenStreetMap") !== -1, "church page must render OSM link");
Views.renderNotFound();
check(appEl.innerHTML.indexOf("Храм не найден") !== -1, "404 view must render not-found copy");

console.log("contract v2 (orthodox-only) | objects:", CHURCHES.length, "| route:", ROUTE.length, "| clusters:", Object.keys(clusters).length, "| singles:", map.singles.length);
console.log("PROBLEMS:", problems.length ? problems : "none");
process.exit(problems.length ? 1 : 0);
