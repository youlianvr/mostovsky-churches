#!/usr/bin/env node
/* Печатная карта-схема для Word-версии.
 *
 * Зачем: в печать попадает картинка, и раньше её делали снимком страницы —
 * картинка и сайт расходились. Здесь схему рисует ТОТ ЖЕ код, которым её
 * рисует сайт (js/map.js поверх js/map-geometry.js и js/church-icon.js),
 * стили берутся из css/style.css. Результат — __docx-schema.svg и
 * растрированный рядом __docx-schema.png (Chrome в headless-режиме).
 *
 *   node make-schema.js            # 880 × 694 → PNG 1760 × 1388 (2×, для печати)
 *
 * Требуется установленный Chrome; путь можно задать в CHROME.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");

const HERE = __dirname;
const SVG_OUT = path.join(HERE, "__docx-schema.svg");
const PNG_OUT = path.join(HERE, "__docx-schema.png");
const SCALE = 2;

/* Те же файлы и в том же порядке, что подключает index.html. */
const MODULES = [
  "js/data.js",
  "js/church-icon.js",
  "js/dom.js",
  "js/map-geometry.js",
  "js/router.js",
  "js/map.js",
];

const sandbox = { console, addEventListener() {}, removeEventListener() {} };
sandbox.window = sandbox; /* модули пишут в window.* и читают оттуда же */
sandbox.document = { getElementById: () => null, querySelector: () => null };
sandbox.location = { hash: "#/map" };
vm.createContext(sandbox);
for (const rel of MODULES) {
  vm.runInContext(fs.readFileSync(path.join(HERE, rel), "utf8"), sandbox, { filename: rel });
}

/* renderSchema пишет разметку в элемент и вешает обработчики — здесь нужна
 * только разметка, поэтому элемент заглушка. */
let markup = "";
const box = {
  set innerHTML(value) { markup = value; },
  get innerHTML() { return markup; },
  scrollWidth: 0,
  clientWidth: 0,
  scrollLeft: 0,
  addEventListener() {},
  classList: { add() {}, remove() {}, toggle() {} },
};
sandbox.ChurchMap.renderSchema(box);

/* Первый <svg> — сама схема; в ней вложены иконки храмов, поэтому границу
 * ищем подсчётом открывающих и закрывающих тегов, а не регуляркой. */
function firstSvg(html) {
  const start = html.indexOf("<svg");
  if (start === -1) { return null; }
  let depth = 0;
  let cursor = start;
  for (;;) {
    const open = html.indexOf("<svg", cursor);
    const close = html.indexOf("</svg>", cursor);
    if (close === -1) { return null; }
    if (open !== -1 && open < close) { depth += 1; cursor = open + 4; }
    else {
      depth -= 1;
      cursor = close + 6;
      if (depth === 0) { return html.slice(start, cursor); }
    }
  }
}

const schema = firstSvg(markup);
if (!schema) { throw new Error("схема не найдена в разметке карты"); }
if (/Р41|Р44/.test(schema)) { throw new Error("на схеме остались коды дорог"); }

const G = sandbox.ChurchMapGeometry;
const css = fs.readFileSync(path.join(HERE, "css/style.css"), "utf8");
const head = '<svg width="' + G.W + '" height="' + G.H + '"';

let standalone = schema.replace("<svg ", head + " ");
standalone = standalone.replace(">", ">\n<style>\n" + css + "\n</style>");
fs.writeFileSync(SVG_OUT, '<?xml version="1.0" encoding="UTF-8"?>\n' + standalone + "\n", "utf8");

const chromeCandidates = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].filter(Boolean);
const browser = chromeCandidates.find((candidate) => fs.existsSync(candidate));
if (!browser) { throw new Error("не найден Chrome/Edge — укажите путь в переменной CHROME"); }

const fileUrl = "file:///" + SVG_OUT.replace(/\\/g, "/");
let shot = false;
for (const mode of ["--headless=new", "--headless"]) {
  if (fs.existsSync(PNG_OUT)) { fs.unlinkSync(PNG_OUT); }
  try {
    execFileSync(browser, [
      mode, "--disable-gpu", "--hide-scrollbars", "--no-sandbox",
      "--force-device-scale-factor=" + SCALE,
      "--window-size=" + G.W + "," + G.H,
      "--screenshot=" + PNG_OUT,
      fileUrl,
    ], { stdio: "pipe", timeout: 60000 });
  } catch (error) {
    /* Chrome иногда возвращает ненулевой код уже после записи снимка. */
  }
  if (fs.existsSync(PNG_OUT) && fs.statSync(PNG_OUT).size > 5000) { shot = true; break; }
}
if (!shot) { throw new Error("снимок схемы не получился — Chrome не записал PNG"); }

/* Размеры читаем из самого PNG, чтобы не выдавать желаемое за факт. */
const png = fs.readFileSync(PNG_OUT);
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);
console.log("OK: " + path.basename(SVG_OUT) + " " + Buffer.byteLength(standalone, "utf8") + " байт");
console.log("OK: " + path.basename(PNG_OUT) + " " + width + "×" + height + ", " + png.length + " байт");
if (width !== G.W * SCALE || height !== G.H * SCALE) {
  throw new Error("неожиданный размер снимка: " + width + "×" + height);
}
const markers = (schema.match(/data-step=/g) || []).length;
console.log("меток остановок на схеме: " + markers);
if (markers !== sandbox.ROUTE.length) {
  throw new Error("на схеме " + markers + " меток вместо " + sandbox.ROUTE.length);
}
