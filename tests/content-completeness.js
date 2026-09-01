/* Stage 6 content contract. Run: node tests/content-completeness.js */
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
global.window = {};
global.document = {};
eval(fs.readFileSync(path.join(root, "js", "data.js"), "utf8"));
var problems = [];
function check(ok, message) { if (!ok) problems.push(message); }
function text(value) { return typeof value === "string" && value.trim().length > 0; }

check(CHURCHES.length === 19, "expected 19 church records");
CHURCHES.forEach(function (church) {
  var prefix = church.slug + ": ";
  check(text(church.slug) && text(church.name) && text(church.settlement), prefix + "identity incomplete");
  check(text(church.confession) && text(church.built) && text(church.status) && text(church.address), prefix + "facts incomplete");
  check(church.coords && Number.isFinite(church.coords.lat) && Number.isFinite(church.coords.lon), prefix + "coordinates incomplete");
  check(Array.isArray(church.history) && church.history.length >= 2 && church.history.every(text), prefix + "history must contain at least two paragraphs");
  check(Array.isArray(church.facts) && church.facts.length >= 3 && church.facts.every(text), prefix + "facts list incomplete");
  check(Array.isArray(church.sources) && church.sources.length > 0 && church.sources.every(text), prefix + "sources incomplete");
  if (church.photo) { check(/^img\/photos\/[^/]+\.(jpg|jpeg|png|webp)$/i.test(church.photo), prefix + "photo path must be local and safe"); }
  if (church.placeholder) {
    check(!church.photo && !church.photoCredit, prefix + "placeholder must not claim a photo");
    check(church.facts.some(function (fact) { return /фото/i.test(fact); }), prefix + "placeholder needs justification");
  } else {
    check(text(church.photo) && text(church.photoCredit), prefix + "photo attribution incomplete");
    check(/(Wikimedia Commons|CC BY|CC BY-SA)/i.test(church.photoCredit), prefix + "photo attribution must name source and license");
    check(/https?:\/\//.test(church.photoCredit), prefix + "photo attribution needs a direct link");
  }
});
check(CHURCHES.some(function (church) { return church.slug === "mosty-iliinskiy" && /1910/.test(church.builtNote || ""); }), "mosty-iliinskiy: explicit date contradiction missing");
check(CHURCHES.some(function (church) { return church.slug === "mosty-sofii-sluckoy" && /2011/.test(church.builtNote || "") && /2015/.test(church.builtNote || ""); }), "mosty-sofii-sluckoy: explicit date contradiction missing");
check(CHURCHES.some(function (church) { return church.slug === "peski-ruzhentsovoy" && /1903/.test(church.builtNote || "") && /1915/.test(church.builtNote || "") && /1918/.test(church.builtNote || ""); }), "peski-ruzhentsovoy: explicit date contradiction missing");
check(CHURCHES.some(function (church) { return church.slug === "strubnitsa-troitsky" && /Плябановцы/.test((church.settlement || "") + " " + (church.address || "")); }), "strubnitsa-troitsky: alternate name missing");
var approx = CHURCHES.filter(function (church) { return church.coordsNote; });
check(approx.length === 4, "expected four approximate coordinate records");
console.log("content contract v1 | objects:", CHURCHES.length, "| approx:", approx.length, "| placeholders:", CHURCHES.filter(function (c) { return c.placeholder; }).length, "| PROBLEMS:", problems.length ? problems : "none");
process.exit(problems.length ? 1 : 0);
