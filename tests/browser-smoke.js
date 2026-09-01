/* Live browser contract. Run from project root with a server on port 8126. */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1024, height: 800 } });
  const errors = [];
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", error => errors.push(error.message));

  function check(condition, message) { if (!condition) throw new Error(message); }
  await page.goto("http://127.0.0.1:8126/index.html#/map");
  await page.waitForLoadState("networkidle");
  check(await page.locator(".map-route-line").count() === 1, "#/map must render the route map");
  check(await page.locator(".map-route-line").getAttribute("points").then(points => points.trim().split(/\\s+/).length) === 19, "route line must have 19 points");
  check(await page.locator(".map-cluster").count() === 3, "map must render three clusters");
  check(await page.locator(".map-marker-g").count() === 11, "map must render eleven singles");

  const cluster = page.locator('.map-cluster[data-cluster="Мосты"]');
  await cluster.click();
  check(await page.locator(".cluster-popup").isVisible(), "cluster click must open popup");
  check(await page.locator(".cluster-popup-list a").count() === 4, "Мосты popup must contain four links");
  await page.locator('.cluster-popup-list a[href="#/mosty-vseh-skorbyashchih"]').click();
  await page.waitForFunction(() => location.hash === "#/mosty-vseh-skorbyashchih");
  check(await page.locator("h1").textContent().then(text => text.includes("Всех скорбящих")), "cluster link must open the church page");
  check(await page.locator(".map-buttons a").count() === 2, "church page must retain both map buttons");

  await page.goto("http://127.0.0.1:8126/index.html#/does-not-exist");
  await page.waitForLoadState("networkidle");
  check(await page.locator("h1").textContent() === "Храм не найден", "unknown slug must render 404");
  check(errors.length === 0, "browser console errors: " + errors.join(" | "));
  await browser.close();
  console.log("browser contract v1 | home/map, cluster, church, map buttons, 404: PASS");
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
