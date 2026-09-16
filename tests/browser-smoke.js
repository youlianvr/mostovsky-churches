/* Live browser contract. Run from the project root with a static server on port 8126.
 * Needs playwright: npx playwright@latest --version (browsers: npx playwright install chromium). */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1024, height: 800 } });
  const errors = [];
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", error => errors.push(error.message));
  const base = "http://127.0.0.1:8126/index.html?contract=v5-20260915";

  function check(condition, message) { if (!condition) throw new Error(message); }
  async function clickVisible(locator) { await locator.click({ position: { x: 5, y: 5 } }); }
  const SECTIONS = [
    ["", "Нитка маршрута"],
    ["map", "Карта-схема"],
    ["opis", "Описание"],
    ["logistika", "Логистика"],
    ["spravka", "Справочная информация"]
  ];

  await page.goto(base + "#/", { waitUntil: "networkidle" });
  check(await page.locator(".route-list li").count() === 3, "route page must list three stops");
  check((await page.locator("h1").textContent()).includes("Гудевичи"), "route headline must name the itinerary");

  /* Каждый отдел Блока 1 открывается по своему адресу и даёт заголовок. */
  for (const [route, label] of SECTIONS) {
    await page.goto(base + "#/" + route, { waitUntil: "networkidle" });
    check(await page.locator(".navbar-links a").count() === 5, "navbar must expose the five section pages");
    check((await page.locator("h1").first().textContent()).length > 0, label + " must render a heading");
  }

  /* Карта-схема: три иконки церкви, линия из трёх точек, ни одного кластера. */
  await page.goto(base + "#/map", { waitUntil: "networkidle" });
  check(await page.locator(".map-route-line").getAttribute("points").then(p => p.trim().split(/\s+/).length) === 3, "route line must have 3 points");
  check(await page.locator(".map-marker-g").count() === 3, "map must render three single markers");
  check(await page.locator(".map-marker-g .church-icon").count() === 3, "each marker must draw the church icon");
  check(await page.locator(".map-marker-icon .ci-cross").count() === 3, "church icon must include the cross");
  check(await page.locator(".legend-icon").count() === 1, "legend must show the church icon");
  check(await page.locator(".cluster-popup").count() === 0, "no cluster popup may remain");
  check(await page.locator("svg.map-route-line").evaluate(svg => getComputedStyle(svg.closest("svg")).pointerEvents) === "none", "decorative SVG surface must not intercept clicks");

  await clickVisible(page.locator(".map-marker-g").first());
  await page.waitForFunction(() => location.hash === "#/gudevichi-rozhdestva");
  check((await page.locator("h1").textContent()).includes("Рождества"), "marker must open its church page");
  check(await page.locator(".map-buttons a").count() === 2, "church page must retain both map buttons");
  const links = await page.locator(".map-buttons a").evaluateAll(as => as.map(a => a.href));
  check(links[0].includes("pt=24.1701,53.3681"), "Yandex link must contain lon,lat coordinates");
  check(links[1].includes("mlat=53.3681&mlon=24.1701"), "OSM link must contain lat,lon coordinates");

  /* Логистика и справочная информация отвечают за обязательные данные. */
  await page.goto(base + "#/logistika", { waitUntil: "networkidle" });
  check(await page.locator(".data-table tbody tr").count() >= 3, "logistics page must tabulate the stops");
  await page.goto(base + "#/spravka", { waitUntil: "networkidle" });
  check(await page.locator(".stop-card").count() === 3, "reference page must show three parish cards");
  check(await page.locator(".source-check").count() >= 5, "reference page must list at least five sources");

  /* Фотоотчёт: честные пустые слоты на странице каждого храма. */
  for (const slug of ["gudevichi-rozhdestva", "lunno-predtechi", "dubno-nikolaya"]) {
    await page.goto(base + "#/" + slug, { waitUntil: "networkidle" });
    check(await page.locator(".report-slot").count() === 2, slug + ": photo report must render its slots on the church page");
    check(await page.locator(".report-slot.is-filled").count() === 0, slug + ": slots stay empty until personal photos exist");
  }

  /* Устаревший адрес #/foto ведёт на страницу первого храма. */
  await page.goto(base + "#/foto", { waitUntil: "networkidle" });
  await page.waitForFunction(() => location.hash === "#/gudevichi-rozhdestva");
  check((await page.locator("h1").textContent()).includes("Рождества"), "old #/foto address must redirect to the first church page");

  await page.goto(base + "#/does-not-exist", { waitUntil: "networkidle" });
  check((await page.locator("h1").textContent()).trim() === "Храм не найден", "unknown slug must render 404");
  check(errors.length === 0, "browser console errors: " + errors.join(" | "));
  await browser.close();
  console.log("browser contract v4 | five sections, photo report on church pages, icon markers, navigation, map links, 404: PASS");
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
