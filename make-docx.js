/* Генератор Word-версии сайта (.docx): повторяет все шесть отделов
 * «Дорогами духовности» с полными текстами — печатная копия сайта.
 * Запуск: node make-docx.js  →  Дорогами-духовности-сайт.docx
 * Данные читаются из js/data.js — единого источника, как на сайте. */
const fs = require("fs");
const vm = require("vm");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, ImageRun,
} = require("docx");

/* --- данные сайта --- */
const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync("js/data.js", "utf8") +
  ";this.CHURCHES=CHURCHES;this.ROUTE=ROUTE;this.ROUTE_LEGS=ROUTE_LEGS;" +
  "this.ROUTE_APPEAL=ROUTE_APPEAL;this.TRANSPORT_MODES=TRANSPORT_MODES;" +
  "this.BUS=BUS;this.BUS_STOPS=BUS_STOPS;this.FOOD=FOOD;this.SOURCES=SOURCES;" +
  "this.PHOTO_REPORT=PHOTO_REPORT;",
  sandbox
);
const {
  CHURCHES, ROUTE, ROUTE_LEGS, ROUTE_APPEAL, TRANSPORT_MODES,
  BUS, BUS_STOPS, FOOD, SOURCES, PHOTO_REPORT,
} = sandbox;
const bySlug = Object.fromEntries(CHURCHES.map((c) => [c.slug, c]));
const stops = ROUTE.map((s) => bySlug[s]);

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

/* Фото из img/photos с подписью-атрибуцией. */
function photo(file, w, h, credit, widthPx = 460) {
  const buf = fs.readFileSync(file);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 120, after: 40 },
      children: [new ImageRun({
        type: "jpg", data: buf,
        transformation: { width: widthPx, height: Math.round(widthPx * h / w) },
      })],
    }),
    para(run(credit, { italics: true, size: 18, color: "555555" }),
      { alignment: AlignmentType.CENTER, spacing: { after: 160 } }),
  ];
}

const children = [];

/* ================= Титул ================= */
children.push(
  para(run("Конкурс «Гродненщина православная», Блок 1 «Дорогами духовности» (туристско-краеведческий)",
    { italics: true }), { alignment: AlignmentType.CENTER, spacing: { before: 2400, after: 240 } }),
  new Paragraph({
    heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { after: 480 },
    children: [run("«Дорогами духовности» — маршрут по храмам Мостовского района", { bold: true, size: 48 })],
  }),
  para([run("Руководитель проекта: ", { bold: true }), run("Величко Татьяна Фредьевна")],
    { alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
  para([run("Разработчик сайта: ", { bold: true }), run("Юлиана Ступчика")],
    { alignment: AlignmentType.CENTER, spacing: { after: 480 } }),
  para([run("Интерактивная версия: ", { bold: true }),
    run("https://youlianvr.github.io/mostovsky-churches/", { color: "1F4E79", underline: {} })],
    { alignment: AlignmentType.CENTER }),
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
children.push(h3("Перегоны"));
children.push(table(
  [700, 2900, 1900, 1400, 2940],
  ["№", "Участок", "Способ", "Расстояние", "Время"],
  ROUTE_LEGS.map((l, i) => [
    String(i + 1),
    `${l.from} — ${l.toSettlement}`,
    l.mode,
    l.road,
    l.walk ? `${l.time} / ${l.walk}` : l.time,
  ]),
));
children.push(para(run(
  "Расстояния — маршруты OpenStreetMap; время в пути — оценка, пешее посчитано по 4,5 км/ч.",
  { italics: true, size: 20 }),
  { spacing: { before: 100 } }));

/* ================= 2. Карта-схема ================= */
children.push(h1("2. Карта-схема"));
children.push(para(run(
  "Схема маршрута на реальной географии: границы района, Нёман и дороги — данные " +
  "OpenStreetMap; красная пунктирная нить — путь маршрута по автодорогам от Гродно " +
  "через Гудевичи и Лунно к Дубно и Мостам. Номер у иконки — шаг маршрута."
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
  "нитка маршрута по дорогам; жёлтые линии — автодороги Р41 и Р44; штриховая чёрная — " +
  "железная дорога; синяя линия — река Нёман. Геометрия района, реки и дорог, автопуть " +
  "маршрута — © OpenStreetMap contributors (ODbL 1.0), маршрут — OSRM.",
  { italics: true, size: 20 }),
  { alignment: AlignmentType.CENTER }));
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
children.push(h2("Почему этот маршрут привлекателен"));
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
children.push(h1("4. Логистика"));
children.push(para(run(
  "Способы передвижения и расстояния до каждой остановки — от Гродно (областной центр) " +
  "и от Мостов (районный центр). Расстояния — по дорожным маршрутам OpenStreetMap от " +
  "центров городов; время на автомобиле — оценка без учёта остановок и погоды."
)));
children.push(h3("Сколько ехать до каждого храма"));
children.push(table(
  [2800, 3520, 3520],
  ["Остановка", "От Гродно (центр)", "От Мостов (центр)"],
  stops.map((c, i) => [
    `${i + 1} · ${c.settlement}`,
    `${c.logistics.fromGrodno.road} (${c.logistics.fromGrodno.car} на машине)`,
    `${c.logistics.fromMosty.road} (${c.logistics.fromMosty.car} на машине)`,
  ]),
));
children.push(h3("Перегоны между остановками"));
children.push(table(
  [700, 2900, 1900, 1400, 2940],
  ["№", "Участок", "Способ", "Расстояние", "Время"],
  ROUTE_LEGS.map((l, i) => [
    String(i + 1),
    `${l.from} — ${l.toSettlement}`,
    l.mode,
    l.road,
    l.walk ? `${l.time} / ${l.walk}` : l.time,
  ]),
));
children.push(h3("Где начинается маршрут"));
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
      run(`${trip.routes} `),
      run(`(${trip.times})`, { italics: true }),
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
  children.push(para([
    run("Настоятель: ", { bold: true }), run(`${c.rector}. `),
    run("Телефон: ", { bold: true }), run(`${c.phone}. `),
    run("Адрес: ", { bold: true }), run(`${c.address}. `),
  ]));
  children.push(para([
    run("Богослужения: ", { bold: true }), run(c.services),
  ]));
  if (c.parishNote) {
    children.push(para([run("Приход: ", { bold: true }), run(c.parishNote)]));
  }
  children.push(para([run("Питание: ", { bold: true }), run(c.food)]));
}
children.push(h2("Где поесть"));
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

/* ================= 6. Фотоотчёт + страницы храмов ================= */
children.push(h1("6. Фотоотчёт о личном посещении"));
children.push(para(run(PHOTO_REPORT.lead)));
children.push(para(run(
  "На интерактивном сайте блок фотоотчёта входит в страницу каждого храма: слоты " +
  "заполняются после поездки, пока они честно пусты — чужие фотографии из интернета " +
  "здесь не используются."
)));
children.push(para(run("Как заполняется:", { bold: true }), { spacing: { after: 40 } }));
for (const step of PHOTO_REPORT.howto) children.push(bullet(step));
children.push(para(run(PHOTO_REPORT.note, { italics: true, size: 20 })));

children.push(h2("Страницы храмов"));
for (const c of stops) {
  children.push(h3(`${c.routeStep}. ${c.name} — ${c.settlement}`));
  children.push(...photo(c.photo, c.photoSize[0], c.photoSize[1], c.photoCredit));
  children.push(para([
    run("Чем привлекателен: ", { bold: true }), run(c.appeal),
  ]));
  children.push(para([
    run("Как добраться: ", { bold: true }), run(c.gettingThere),
  ]));
  const notes = [];
  if (c.note) notes.push(c.note);
  if (c.parishNote) notes.push(c.parishNote);
  if (notes.length) children.push(para([run("Примечание: ", { bold: true }), run(notes.join(". "))]));
  children.push(para(run("Источники по объекту:", { bold: true }), { spacing: { after: 40 } }));
  for (const s of c.sources) children.push(bullet(s));
}

/* ================= документ ================= */
const doc = new Document({
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

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("Дорогами-духовности-сайт.docx", buf);
  console.log("OK: Дорогами-духовности-сайт.docx,", buf.length, "bytes");
});
