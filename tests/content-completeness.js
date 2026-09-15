/* Content contract for the focus trio. Run: node tests/content-completeness.js */
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
global.window = {};
global.document = {};
eval(fs.readFileSync(path.join(root, "js", "data.js"), "utf8"));
var problems = [];
function check(ok, message) { if (!ok) problems.push(message); }
function text(value) { return typeof value === "string" && value.trim().length > 0; }

check(CHURCHES.length === 3, "expected 3 church records (focus trio)");
CHURCHES.forEach(function (church) {
  var prefix = church.slug + ": ";
  check(text(church.slug) && text(church.name) && text(church.settlement), prefix + "identity incomplete");
  check(text(church.confession) && text(church.built) && text(church.status) && text(church.address), prefix + "facts incomplete");
  check(church.coords && Number.isFinite(church.coords.lat) && Number.isFinite(church.coords.lon), prefix + "coordinates incomplete");
  check(Array.isArray(church.history) && church.history.length >= 2 && church.history.every(text), prefix + "history must contain at least two paragraphs");
  check(Array.isArray(church.facts) && church.facts.length >= 3 && church.facts.every(text), prefix + "facts list incomplete");
  check(Array.isArray(church.sources) && church.sources.length > 0 && church.sources.every(text), prefix + "sources incomplete");
  /* «Справочная информация» и «Логистика» — обязательные элементы Блока 1. */
  check(text(church.rector), prefix + "rector required");
  check(text(church.phone) && /^[+\d][\d\s\-()]{6,}$/.test(church.phone), prefix + "phone must look like a real number");
  check(text(church.services), prefix + "service schedule required");
  check(text(church.gettingThere), prefix + "getting-there text required");
  check(text(church.food), prefix + "food note required");
  check(!church.placeholder, prefix + "focus trio must not contain placeholders");
  if (church.photo) { check(/^img\/photos\/[^/]+\.(jpg|jpeg|png|webp)$/i.test(church.photo), prefix + "photo path must be local and safe"); }
  if (church.needsLicenseReview) {
    check(/уточняется/i.test(church.photoCredit || ""), prefix + "needsLicenseReview requires a temporary credit note");
  } else {
    check(text(church.photo) && text(church.photoCredit), prefix + "photo attribution incomplete");
    check(/(Wikimedia Commons|CC BY|CC BY-SA)/i.test(church.photoCredit), prefix + "photo attribution must name source and license");
    check(/https?:\/\//.test(church.photoCredit), prefix + "photo attribution needs a direct link");
  }
});
var shortNames = CHURCHES.map(function (church) { return church.shortName || ""; });
check(shortNames.every(text), "every church needs a shortName for prev/next navigation");
check(new Set(shortNames).size === CHURCHES.length, "shortName values must be unique for distinct prev/next labels");
var approx = CHURCHES.filter(function (church) { return church.coordsNote; });
console.log("content contract v3 (block1-trio) | objects:", CHURCHES.length, "| approx:", approx.length, "| placeholders:", CHURCHES.filter(function (c) { return c.placeholder; }).length, "| PROBLEMS:", problems.length ? problems : "none");
process.exit(problems.length ? 1 : 0);
