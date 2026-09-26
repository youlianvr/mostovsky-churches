/* Генератор Word-версии сайта (.docx): повторяет все шесть отделов
 * «Дорогами духовности» с полными текстами — печатная копия сайта.
 * Запуск: node make-docx.js  →  Дорогами-духовности-сайт.docx
 * Данные читаются из js/data.js — единого источника, как на сайте. */
const fs = require("fs");
const vm = require("vm");
const crypto = require("crypto");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, ImageRun,
  ExternalHyperlink,
} = require("docx");
const QRCode = require("qrcode");

/* --- данные сайта --- */
const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync("js/data.js", "utf8") +
  ";this.CHURCHES=CHURCHES;this.ROUTE=ROUTE;" +
  "this.ROUTE_APPEAL=ROUTE_APPEAL;this.TRANSPORT_MODES=TRANSPORT_MODES;" +
  "this.BUS=BUS;this.BUS_STOPS=BUS_STOPS;this.FOOD=FOOD;this.SOURCES=SOURCES;",
  sandbox
);
const {
  CHURCHES, ROUTE, ROUTE_APPEAL, TRANSPORT_MODES,
  BUS, BUS_STOPS, FOOD, SOURCES,
} = sandbox;
const bySlug = Object.fromEntries(CHURCHES.map((c) => [c.slug, c]));
const stops = ROUTE.map((s) => bySlug[s]);

/* Та же строка, что в шапке сайта: собирается из данных, а не переписана
 * руками, поэтому сайт и печатная версия не могут разойтись. */
const shortPlace = (settlement) => String(settlement).replace(/^(?:г|д|аг)\.\s*/, "");
const routeLine = () =>
  "Нитка маршрута: Гродно → " + stops.map((c) => shortPlace(c.settlement)).join(" → ") + " → Мосты";

/* --- помощники --- */
const FONT = "Times New Roman";
const run = (text, opts = {}) => new TextRun({ text, font: FONT, size: 24, ...opts });
const para = (children, opts = {}) =>
  new Paragraph({
    children: Array.isArray(children) ? children : [children],
    spacing: { after: 120, line: 276 },
    alignment: AlignmentType.JUSTIFIED,
    ...opts,
  });
const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER,
  spacing: { before: 120, after: 120 }, pageBreakBefore: true,
  children: [run(text, { bold: true, size: 36 })],
});
const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 },
  children: [run(text, { bold: true, size: 28 })],
});
const h3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3, spacing: { before: 180, after: 100 },
  children: [run(text, { bold: true, size: 24 })],
});
const bullet = (text) => new Paragraph({
  numbering: { reference: "dots", level: 0 },
  spacing: { after: 60, line: 276 },
  children: [run(text)],
});

/* Таблица с шапкой; ширины в DXA, сумма = ширине таблицы. */
function table(widths, header, rows) {
  const total = widths.reduce((a, b) => a + b, 0);
  const cell = (text, { bold = false, w, fill } = {}) => new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: fill ? { type: ShadingType.CLEAR, fill } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [para(run(text, { bold }), { alignment: AlignmentType.LEFT, spacing: { after: 0 } })],
  });
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: header.map((t, i) => cell(t, { bold: true, w: widths[i], fill: "EDE7DA" })),
      }),
      ...rows.map((r) => new TableRow({ children: r.map((t, i) => cell(t, { w: widths[i] })) })),
    ],
  });
}

/* Фото из img/photos с подписью-атрибуцией. Полный URL страницы Commons
 * прячем в кликабельную ссылку, чтобы мелкая подпись не ломалась на 4 строки. */
function photo(file, w, h, credit, widthPx = 460) {
  const buf = fs.readFileSync(file);
  const m = String(credit).match(/^(.*\S)\s+—\s+(https?:\S+)\s*$/s);
  const creditRuns = m
    ? [
        run(m[1] + " — ", { italics: true, size: 18, color: "555555" }),
        new ExternalHyperlink({
          link: m[2],
          children: [run("страница файла на Wikimedia Commons",
            { italics: true, size: 18, color: "1F4E79", underline: {} })],
        }),
      ]
    : [run(credit, { italics: true, size: 18, color: "555555" })];
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 120, after: 40 },
      children: [new ImageRun({
        type: "jpg", data: buf,
        transformation: { width: widthPx, height: Math.round(widthPx * h / w) },
      })],
    }),
    para(creditRuns, { alignment: AlignmentType.CENTER, spacing: { after: 160 } }),
  ];
}

/* QR-код: картинка с подписью-ссылкой. Размер фиксированный, 96 pt ≈ 3,4 см. */
function qrBlock(url, caption, sizePx = 130) {
  return new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 120, after: 40 },
    children: [new ImageRun({ type: "png", data: qrCache[url], transformation: { width: sizePx, height: sizePx } })],
  });
}
/* QR генерируются синхронно на старте: qrcode.toBuffer асинхронен, поэтому
 * рисуем модули сами через синхронный QRCode.create и пишем PNG в буфер. */
/* Карта для печати рисуется отдельным скриптом из тех же данных, что сайт.
 * Если схему меняли позже картинки, сборка останавливается: печатать
 * устаревшую схему нельзя. */
const PARTS_FOR_SCHEMA = ["js/map.js", "js/map-geometry.js", "js/church-icon.js", "css/style.css"];
const SCHEMA_PNG = "__docx-schema.png";
if (!fs.existsSync(SCHEMA_PNG)) {
  throw new Error("нет " + SCHEMA_PNG + " — сначала запустите node make-schema.js");
}
const schemaTime = fs.statSync(SCHEMA_PNG).mtimeMs;
for (const part of PARTS_FOR_SCHEMA) {
  const changed = fs.statSync(part).mtimeMs;
  if (changed > schemaTime + 1000) {
    throw new Error(part + " изменён позже " + SCHEMA_PNG + " — пересоберите схему: node make-schema.js");
  }
}

const SITE = "https://youlianvr.github.io/mostovsky-churches/";
const qrCache = (() => {
  const urls = [SITE, ...stops.map((c) => SITE + "#/" + c.slug)];
  const out = {};
  for (const url of urls) {
    const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
    const n = qr.modules.size, data = qr.modules.data;
    const scale = 8, quiet = 4, size = (n + quiet * 2) * scale;
    const rows = [];
    /* RAW-пиксели -> PNG без библиотек: кодируем ч/б bitmap как PNG вручную */
    const px = Buffer.alloc(size * size);
    for (let y = 0; y < size; y++) {
      const my = Math.floor(y / scale) - quiet;
      for (let x = 0; x < size; x++) {
        const mx = Math.floor(x / scale) - quiet;
        const dark = my >= 0 && my < n && mx >= 0 && mx < n && data[my * n + mx];
        px[y * size + x] = dark ? 0 : 255;
      }
    }
    out[url] = encodePng(px, size, size);
  }
  return out;
})();

/* Минимальный PNG-писатель: серый 8-бит, без фильтров, zlib из node. */
function encodePng(px, w, h) {
  const zlib = require("zlib");
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w + 1)] = 0; /* filter: none */
    px.copy(raw, y * (w + 1) + 1, y * w, (y + 1) * w);
  }
  const idat = zlib.deflateSync(raw);
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  }
  let crcTable = [];
  for (let n2 = 0; n2 < 256; n2++) {
    let c = n2;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n2] = c;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return c ^ 0xffffffff;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 0; /* 8-bit grayscale */
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0)),
  ]);
}

const children = [];

/* ================= Титул ================= */
children.push(
  para(run("Конкурс «Гродненщина православная», туристско-краеведческий",
    { italics: true }), { alignment: AlignmentType.CENTER, spacing: { before: 2400, after: 240 } }),
  new Paragraph({
    heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { after: 240 },
    children: [run("Дорогами духовности", { bold: true, size: 48 })],
  }),
  para(run(routeLine(), { size: 30 }),
    { alignment: AlignmentType.CENTER, spacing: { after: 480 } }),
  para([run("Руководитель проекта: ", { bold: true }), run("Величко Татьяна Фредьевна")],
    { alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
  para([run("Разработчик сайта: ", { bold: true }), run("Юлиана Ступчика")],
    { alignment: AlignmentType.CENTER, spacing: { after: 480 } }),
  para([run("Интерактивная версия: ", { bold: true }),
    run("https://youlianvr.github.io/mostovsky-churches/", { color: "1F4E79", underline: {} })],
    { alignment: AlignmentType.CENTER }),
  qrBlock(SITE),
  para(run("QR-код ведёт на интерактивную версию проекта — наведите камеру телефона.",
    { italics: true, size: 20, color: "555555" }), { alignment: AlignmentType.CENTER }),
);

/* ================= 1. Нитка маршрута ================= */
children.push(h1("1. Нитка маршрута"));
children.push(para(run(
  "Три сельские церкви XIX века в Мостовском районе Гродненской области: Гудевичи (1852), " +
  "Лунно (1889) и Дубно (1844). Маршрут начинается в Гродно и идёт с запада на восток: " +
  "от шатровой колокольни Гудевичей к «крепостному» храму Лунно и дальше к самому крупному " +
  "храму тройки в Дубно, а заканчивается в Мостах — районном центре."
)));
children.push(h3("Остановки маршрута"));
for (let i = 0; i < stops.length; i++) {
  const c = stops[i];
  children.push(para([
    run(`${i + 1}. `, { bold: true }),
    run(c.name, { bold: true }),
    run(` — ${c.settlement} · ${c.built}`),
  ], { alignment: AlignmentType.LEFT, spacing: { after: 60 } }));
}

/* ================= 2. Карта-схема ================= */
children.push(h1("2. Карта-схема"));
children.push(para(run(
  "Схема маршрута на реальной географии: границы района, Нёман и дороги — данные OpenStreetMap."
)));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { before: 120, after: 40 },
  children: [new ImageRun({
    type: "png", data: fs.readFileSync("__docx-schema.png"),
    transformation: { width: 580, height: Math.round(580 * 694 / 880) },
  })],
}));
children.push(para(run(
  "Условные знаки: иконка церкви с номером шага — остановка маршрута; красный пунктир — " +
  "нитка маршрута по дорогам; жёлтые линии — автодороги; штриховая чёрная — железная " +
  "дорога; синяя линия — река Неман. Геометрия района, реки и дорог, автопуть маршрута — " +
  "© OpenStreetMap contributors (ODbL 1.0), маршрут — OSRM.",
  { italics: true, size: 20 }),
  { alignment: AlignmentType.CENTER }));
children.push(para(run(
  "Граница района, Нёман и дороги — реальные данные OpenStreetMap. Точные координаты " +
  "каждого храма открываются кнопками «Открыть на Яндекс.Картах» на странице храма.",
  { italics: true, size: 20 })));
children.push(h3("Объекты на схеме"));
for (let i = 0; i < stops.length; i++) {
  const c = stops[i];
  children.push(para([
    run(`${i + 1}. `, { bold: true }),
    run(c.name, { bold: true }),
    run(` — ${c.settlement} · ${c.coords.lat.toFixed(4)}, ${c.coords.lon.toFixed(4)}`),
  ], { alignment: AlignmentType.LEFT, spacing: { after: 60 } }));
}

/* ================= 3. Описание ================= */
children.push(h1("3. Описание"));
children.push(h2("Привлекательность маршрута"));
for (const t of ROUTE_APPEAL) children.push(para(run(t)));
children.push(h2("Остановки: историческая справка"));
for (const c of stops) {
  children.push(h3(`${c.routeStep}. ${c.name} (${c.built})`));
  children.push(para(run(c.appeal, { italics: true })));
  for (const p of c.history) children.push(para(run(p)));
  children.push(para(run("Ключевые факты:", { bold: true }), { spacing: { after: 40 } }));
  for (const f of c.facts) children.push(bullet(f));
}

/* ================= 4. Логистика ================= */
children.push(h1("4. Логистика маршрута"));
children.push(para(run(
  "Способы передвижения и расстояния до каждой остановки — от Гродно (областной центр) " +
  "и от Мостов (районный центр)."
)));
children.push(h3("Время"));
children.push(table(
  [2800, 3520, 3520],
  ["Остановка", "Гродно", "Мосты"],
  stops.map((c, i) => [
    `${i + 1} · ${c.settlement}`,
    `${c.logistics.fromGrodno.road} (${c.logistics.fromGrodno.car} на машине)`,
    `${c.logistics.fromMosty.road} (${c.logistics.fromMosty.car} на машине)`,
  ]),
));
children.push(para(run(
  "Расстояния — по дорожным маршрутам OpenStreetMap от центров городов; время на " +
  "автомобиле — оценка без учёта остановок и погоды. От автовокзала Гродно " +
  "(ул. Ожешко, 25) путь длиннее: до Гудевичей около 59 км.",
  { italics: true, size: 20 }),
  { spacing: { before: 100 } }));
children.push(h3("Где начинается маршрут: автовокзал Гродно и автостанция «Мосты»"));
for (const key of ["grodno", "mosty"]) {
  const b = BUS[key];
  children.push(para([
    run(b.name, { bold: true }),
    run(` — ${b.address}. Тел.: ${b.phone}. ${b.hours}.`),
  ]));
}
children.push(para(run(BUS.note)));
children.push(para(run(`Проверено ${BUS.checked}. Источник: ${BUS.source}.`,
  { italics: true, size: 20 })));
children.push(h3("Автобусы у остановок маршрута"));
children.push(para(run(
  "Время указано для самой остановки, дни недели — по расписанию областного оператора " +
  "пассажирских перевозок; номера рейсов в приложении «Транспорт BY» могут отличаться.",
  { italics: true, size: 20 })));
for (const entry of BUS_STOPS) {
  const c = bySlug[entry.slug];
  children.push(h3(`${c.settlement} — ${entry.stop}`));
  for (const trip of entry.trips) {
    children.push(para([
      run(`${trip.to}: `, { bold: true }),
      run(trip.times),
    ], { alignment: AlignmentType.LEFT }));
  }
  children.push(para(run(`${entry.toChurch}. Номер остановки в приложении «Транспорт BY»: ${entry.stopId}.`,
    { italics: true, size: 20 })));
}
children.push(h3("Способы передвижения"));
for (const t of TRANSPORT_MODES) {
  const m = String(t).match(/<strong>(.*?)<\/strong>(.*)/s);
  if (m) children.push(para([run(m[1] + " ", { bold: true }), run(m[2].replace(/<[^>]+>/g, ""))]));
  else children.push(para(run(t.replace(/<[^>]+>/g, ""))));
}

/* ================= 5. Справочная информация ================= */
children.push(h1("5. Справочная информация"));
children.push(h2("Приходы и контакты"));
for (const c of stops) {
  children.push(h3(`${c.name} — ${c.settlement}`));
  /* Настоятель и телефон публикуются только парой: у Дубно их нет вовсе,
   * поэтому строка не выводится, а не печатается пустой. */
  const contactRow = c.rector && c.phone
    ? [run("Настоятель: ", { bold: true }), run(`${c.rector}. `),
       run("Телефон: ", { bold: true }), run(`${c.phone}. `)]
    : [];
  children.push(para([...contactRow, run("Адрес: ", { bold: true }), run(`${c.address}. `)]));
  children.push(para([
    run("Богослужения: ", { bold: true }), run(c.services),
  ]));
  if (c.parishNote) {
    children.push(para([run("Приход: ", { bold: true }), run(c.parishNote)]));
  }
}
children.push(h2("Питание"));
children.push(para(run(FOOD.note)));
for (const p of FOOD.places) {
  const tail = p.hours ? `, ${p.hours}` : "";
  const mark = p.checked
    ? " — адрес и часы сверены с OpenStreetMap " + BUS.checked
    : " — место указано по ранним записям, проверьте перед поездкой";
  children.push(bullet(p.name + " — " + p.address + tail + mark));
}
children.push(para(run(FOOD.source, { italics: true, size: 20 })));
children.push(h2("Список источников"));
children.push(para(run(SOURCES.requiredNote +
  ` Готово ${SOURCES.items.filter((i) => i.done).length} из ${SOURCES.items.length}.`)));
for (const item of SOURCES.items) {
  children.push(bullet((item.done ? "[выполнено] " : "[в работе] ") + item.text));
}
children.push(para(run(
  "Незакрытые пункты завершает автор проекта: запись беседы собирается во время поездки.",
  { italics: true, size: 20 })));

/* ================= 6. Страницы храмов ================= */
children.push(h1("6. Страницы храмов"));
for (const c of stops) {
  children.push(h3(`${c.routeStep}. ${c.name} — ${c.settlement}`));
  children.push(...photo(c.photo, c.photoSize[0], c.photoSize[1], c.photoCredit));
  children.push(para([
    run("Чем привлекателен: ", { bold: true }), run(c.appeal),
  ]));
  for (const paragraph of c.history) children.push(para(run(paragraph)));
  children.push(para(run("Ключевые факты:", { bold: true }), { spacing: { after: 40 } }));
  for (const fact of c.facts) children.push(bullet(fact));
  children.push(para(run("Источники по объекту:", { bold: true }), { spacing: { after: 40 } }));
  for (const s of c.sources) children.push(bullet(s));
  const churchUrl = SITE + "#/" + c.slug;
  children.push(qrBlock(churchUrl));
  children.push(para([
    run("Интерактивная страница храма: ", { bold: true, size: 20 }),
    run(churchUrl, { size: 20, color: "1F4E79" }),
  ], { alignment: AlignmentType.CENTER, spacing: { after: 40 } }));
  children.push(para(run("QR-код открывает эту страницу храма на сайте проекта.",
    { italics: true, size: 18, color: "555555" }), { alignment: AlignmentType.CENTER }));
}

/* ================= документ ================= */
function buildDoc() {
  return new Document({
    numbering: {
      config: [{
        reference: "dots",
        levels: [{
          level: 0, format: "bullet", text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 425, hanging: 425 } } },
        }],
      }],
    },
    styles: { default: { document: { run: { font: FONT, size: 24 } } } },
    sections: [{
      properties: {
        page: { margin: { top: 1134, bottom: 1134, left: 1701, right: 851 } },
      },
      children,
    }],
  });
}

/* ------------------------------------------------------------------ проверка
 * Собранный файл читается обратно и сверяется с сайтом. Печатная версия —
 * это сайт на бумаге: если в ней снова появится убранный блок или чужое
 * фото, сборка падает, а не выпускает расходящийся документ.
 */

const BANNED = [
  "Блок 1", "Фотоотчёт", "Перегоны", "Как добраться", "Где поесть",
  "Почему этот маршрут", "Сколько ехать до каждого храма",
  "От Гродно (центр)", "От Мостов (центр)", "Остановка 1 из 3",
  "Настоятель: протоиерей Николай Гляд", "тремя группами",
];
/* Заголовки, которые обязаны быть одинаковыми на сайте и в печати. */
const MIRRORED = [
  "Дорогами духовности", "Нитка маршрута",
  "Схема маршрута на реальной географии", "Привлекательность маршрута",
  "Остановки: историческая справка", "Логистика маршрута", "Время",
  "Автобусы у остановок маршрута", "Способы передвижения",
  "Справочная информация", "Приходы и контакты", "Питание",
];
const SITE_SOURCES = ["js/data.js", "js/sections.js", "js/church.js"]
  .map((file) => fs.readFileSync(file, "utf8")).join("\n");

function zipEntries(buf) {
  const zlib = require("zlib");
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd === -1) { throw new Error("это не zip/docx: нет конца каталога"); }
  const count = buf.readUInt16LE(eocd + 10);
  let pos = buf.readUInt32LE(eocd + 16);
  const parts = {};
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) { throw new Error("битый каталог docx"); }
    const method = buf.readUInt16LE(pos + 10);
    const size = buf.readUInt32LE(pos + 20);
    const nameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    const offset = buf.readUInt32LE(pos + 42);
    const entry = buf.slice(pos + 46, pos + 46 + nameLen).toString("utf8");
    const dataStart = offset + 30 + buf.readUInt16LE(offset + 26) + buf.readUInt16LE(offset + 28);
    const raw = buf.slice(dataStart, dataStart + size);
    parts[entry] = method === 0 ? raw : zlib.inflateRawSync(raw);
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return parts;
}

function verify(buf) {
  const parts = zipEntries(buf);
  const xml = parts["word/document.xml"];
  if (!xml) { throw new Error("в собранном файле нет word/document.xml"); }
  const text = xml.toString("utf8").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const problems = [];
  for (const phrase of BANNED) {
    if (text.includes(phrase)) { problems.push("в печати снова есть «" + phrase + "»"); }
  }
  for (const phrase of MIRRORED) {
    if (!text.includes(phrase)) { problems.push("нет заголовка «" + phrase + "»"); }
    if (!SITE_SOURCES.includes(phrase)) { problems.push("«" + phrase + "» нет на сайте — печать и сайт разошлись"); }
  }
  /* Фотографии: в документе должны лежать те же файлы, что на сайте, — именно
   * на этом ловится подмена снимка (в печати когда-то стоял чужой храм). */
  const media = Object.keys(parts)
    .filter((name) => name.startsWith("word/media/") && /\.[a-z]+$/.test(name))
    .map((name) => crypto.createHash("sha256").update(parts[name]).digest("hex"));
  for (const church of stops) {
    const wanted = crypto.createHash("sha256").update(fs.readFileSync(church.photo)).digest("hex");
    if (media.indexOf(wanted) === -1) {
      problems.push("фото " + church.photo + " в документе не совпадает с файлом сайта");
    }
  }
  if (problems.length) {
    throw new Error("печатная версия расходится с сайтом:\n  - " + problems.join("\n  - "));
  }
  return text.length;
}

Packer.toBuffer(buildDoc()).then((buf) => {
  const chars = verify(buf);
  fs.writeFileSync("Дорогами-духовности-сайт.docx", buf);
  console.log("OK: Дорогами-духовности-сайт.docx,", buf.length, "bytes");
  console.log("проверено: убранных блоков нет, " + MIRRORED.length + " заголовков совпадают с сайтом, " +
    stops.length + " фотографии — те же файлы; знаков в тексте:", chars);
});
