/* Генератор пояснительной записки (.docx) из данных проекта.
 * Запуск: node make-docx.js  →  Дорогами-духовности-записка.docx
 * Данные читаются из js/data.js — единого источника, как на сайте. */
const fs = require("fs");
const vm = require("vm");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
} = require("docx");

/* --- данные сайта --- */
const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync("js/data.js", "utf8") +
  ";this.CHURCHES=CHURCHES;this.ROUTE=ROUTE;this.ROUTE_LEGS=ROUTE_LEGS;" +
  "this.ROUTE_APPEAL=ROUTE_APPEAL;this.TRANSPORT_MODES=TRANSPORT_MODES;",
  sandbox
);
const { CHURCHES, ROUTE, ROUTE_LEGS, ROUTE_APPEAL, TRANSPORT_MODES } = sandbox;
const bySlug = Object.fromEntries(CHURCHES.map((c) => [c.slug, c]));
const stops = ROUTE.map((s) => bySlug[s]);

/* <strong>…</strong> → текст (в Word жирность задаём сами, HTML не нужен) */
const plain = (s) => String(s).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
/* history хранится абзацами через запятую-разделитель ".,": берём аккуратно */
const historyParas = (c) =>
  (Array.isArray(c.history) ? c.history : String(c.history).split(/,\s*/))
    .map(plain).filter(Boolean);

/* --- помощники --- */
const FONT = "Times New Roman";
const run = (text, opts = {}) => new TextRun({ text, font: FONT, size: 24, ...opts });
const para = (children, opts = {}) =>
  new Paragraph({ children: Array.isArray(children) ? children : [children],
    spacing: { after: 120, line: 276 }, alignment: AlignmentType.JUSTIFIED, ...opts });

const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER,
  spacing: { before: 240, after: 240 },
  children: [run(text, { bold: true, size: 32 })],
});
const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 },
  children: [run(text, { bold: true, size: 26 })],
});

const CELL_W = { size: 24, type: WidthType.DXA };
const cell = (text, { bold = false, width, fill } = {}) => new TableCell({
  width: { size: width, type: WidthType.DXA },
  shading: fill ? { type: ShadingType.CLEAR, fill } : undefined,
  margins: { top: 60, bottom: 60, left: 100, right: 100 },
  children: [para(run(text, { bold }), { alignment: AlignmentType.LEFT, spacing: { after: 0 } })],
});

/* --- содержимое --- */
const SITE_URL = "https://youlianvr.github.io/mostovsky-churches/";
const children = [];

children.push(
  para(run("Конкурс «Гродненщина православная», Блок 1 «Дорогами духовности» (туристско-краеведческий)",
    { italics: true }), { alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
  h1("«Дорогами духовности» — маршрут по храмам Мостовского района"),
  para([
    run("Руководитель проекта: ", { bold: true }),
    run("Величко Татьяна Фредьевна"),
  ], { alignment: AlignmentType.CENTER, spacing: { after: 40 } }),
  para([
    run("Разработчик сайта: ", { bold: true }),
    run("Юлиана Ступчика"),
  ], { alignment: AlignmentType.CENTER, spacing: { after: 240 } }),

  h2("О проекте"),
  para(run(
    "Участники разрабатывают авторский маршрут к православным святыням своего района. " +
    "Обязательные элементы блока — нитка маршрута, карта-схема, описание, логистика, " +
    "справочная информация и фотоотчёт — реализованы как разделы сайта " + SITE_URL
  )),

  h2("Нитка маршрута"),
  para(run(
    "Гродно → Гудевичи → Лунно → Дубно → Мосты → Гродно. Полный круг — около 160 км. " +
    "Маршрут объединяет три действующие сельские церкви XIX века Мостовского района."
  )),
);

/* Объекты маршрута */
for (const c of stops) {
  children.push(h2(`${c.routeStep}. ${c.name} (${c.built})`));
  children.push(para([
    run("Адрес: ", { bold: true }), run(c.address),
  ]));
  children.push(para([
    run("Настоятель: ", { bold: true }),
    run(`${c.rector}, тел. ${c.phone}`),
  ]));
  children.push(para([
    run("Чем привлекателен: ", { bold: true }), run(plain(c.appeal)),
  ]));
  const hist = historyParas(c);
  if (hist.length) children.push(para(run(hist[0])));
}

/* Логистика: таблица перегонов */
const TBL_W = 9840;
children.push(h2("Логистика"));
children.push(new Table({
  width: { size: TBL_W, type: WidthType.DXA },
  columnWidths: [2800, 1500, 1900, 3640],
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        cell("Перегон", { bold: true, width: 2800, fill: "EDE7DA" }),
        cell("Расстояние", { bold: true, width: 1500, fill: "EDE7DA" }),
        cell("Время", { bold: true, width: 1900, fill: "EDE7DA" }),
        cell("Способ", { bold: true, width: 3640, fill: "EDE7DA" }),
      ],
    }),
    ...ROUTE_LEGS.map((l) => new TableRow({
      children: [
        cell(`${l.from} — ${l.toSettlement}`, { width: 2800 }),
        cell(l.road, { width: 1500 }),
        cell(l.walk ? `${l.time} / ${l.walk}` : l.time, { width: 1900 }),
        cell(l.mode, { width: 3640 }),
      ],
    })),
  ],
}));
children.push(para(run("")));

for (const t of TRANSPORT_MODES) {
  const m = String(t).match(/<strong>(.*?)<\/strong>(.*)/s);
  if (m) {
    children.push(para([run(plain(m[1]) + " ", { bold: true }), run(plain(m[2]))]));
  } else {
    children.push(para(run(plain(t))));
  }
}

/* Сайт */
children.push(h2("Интерактивный сайт проекта"));
children.push(para(run(
  "Все шесть обязательных элементов блока оформлены разделами сайта: нитка маршрута, " +
  "карта-схема района, описание объектов с обоснованием привлекательности, логистика " +
  "с реальными автобусными рейсами, справочная информация (настоятели, богослужения, " +
  "пункты питания) и фотоотчёт на странице каждого храма."
)));
children.push(para([
  run("Адрес сайта: ", { bold: true }),
  run(SITE_URL, { color: "1F4E79", underline: {} }),
]));

/* Источники */
children.push(h2("Источники"));
const sources = [
  "orthos.org — официальный сайт Гродненской епархии: карточки храмов, настоятели, расписания богослужений, телефоны.",
  "«Достопримечательности Мостовского района» — официальный туристический сборник района.",
  "planetabelarus.by — каталог достопримечательностей Беларуси.",
  "sobory.ru — каталог православных храмов.",
  "OpenStreetMap / OSRM — дорожные маршруты и километраж между остановками.",
  "Wikimedia Commons — фотографии храмов (автор и лицензия указаны в подписях на сайте).",
];
for (const s of sources) {
  children.push(new Paragraph({
    numbering: { reference: "src-list", level: 0 },
    spacing: { after: 60, line: 276 },
    children: [run(s)],
  }));
}

/* --- документ --- */
const doc = new Document({
  numbering: {
    config: [{
      reference: "src-list",
      levels: [{
        level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 425, hanging: 425 } } },
      }],
    }],
  },
  styles: {
    default: { document: { run: { font: FONT, size: 24 } } },
  },
  sections: [{
    properties: {
      page: { margin: { top: 1134, bottom: 1134, left: 1701, right: 851 } }, // 2/2/3/1.5 см
    },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("Дорогами-духовности-записка.docx", buf);
  console.log("OK: Дорогами-духовности-записка.docx,", buf.length, "bytes");
});
