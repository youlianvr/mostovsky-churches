/* Live browser contract. Run from project root with a server on port 8126. */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1024, height: 800 } });
  const errors = [];
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", error => errors.push(error.message));
  const base = "http://127.0.0.1:8126/index.html?contract=v1-20260901";

  function check(condition, message) { if (!condition) throw new Error(message); }
  async function clickVisible(locator) { await locator.click({ position: { x: 5, y: 5 } }); }

  await page.goto(base + "#/map", { waitUntil: "networkidle" });
  check(await page.locator(".map-route-line").getAttribute("points").then(points => points.trim().split(/\s+/).length) === 19, "route line must have 19 points");
  check(await page.locator(".map-cluster").count() === 3, "map must render three clusters");
  check(await page.locator(".map-marker-g").count() === 11, "map must render eleven singles");
  check(await page.locator("svg").evaluate(svg => getComputedStyle(svg).pointerEvents) === "none", "decorative SVG surface must not intercept clicks");

  await clickVisible(page.locator(".map-marker-g").first());
  await page.waitForFunction(() => location.hash === "#/cherlena-rozhdestva");
  check(await page.locator("h1").textContent().then(text => text.includes("Рождества")), "singleton marker must open its church page");

  await page.goto(base + "#/map", { waitUntil: "networkidle" });
  for (const [name, count] of [["Мосты", 4], ["Лунно", 2], ["Пески", 2]]) {
    await clickVisible(page.locator('.map-cluster[data-cluster="' + name + '"]'));
    check(await page.locator(".cluster-popup").isVisible(), name + " cluster must open popup");
    check(await page.locator(".cluster-popup-list a").count() === count, name + " cluster count mismatch");
    await page.locator(".cluster-popup-close").click();
  }

  await clickVisible(page.locator('.map-cluster[data-cluster="Мосты"]'));
  await page.locator('.cluster-popup-list a[href="#/mosty-vseh-skorbyashchih"]').click();
  await page.waitForFunction(() => location.hash === "#/mosty-vseh-skorbyashchih");
  check(await page.locator(".map-buttons a").count() === 2, "church page must retain both map buttons");
  const links = await page.locator(".map-buttons a").evaluateAll(as => as.map(a => a.href));
  check(links[0].includes("pt=24.5383,53.4232"), "Yandex link must contain lon,lat coordinates");
  check(links[1].includes("mlat=53.4232&mlon=24.5383"), "OSM link must contain lat,lon coordinates");

  await page.goto(base + "#/map", { waitUntil: "networkidle" });
  check(await page.locator(".map-route-line").count() === 1, "#/map must render after navigation");
  await page.goto(base + "#/does-not-exist", { waitUntil: "networkidle" });
  check((await page.locator("h1").textContent()).trim() === "Храм не найден", "unknown slug must render 404");
  check(errors.length === 0, "browser console errors: " + errors.join(" | "));
  await browser.close();
  console.log("browser contract v1 | pointer clicks, clusters, navigation, map links, #/map, 404: PASS");
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
