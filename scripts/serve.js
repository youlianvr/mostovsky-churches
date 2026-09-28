#!/usr/bin/env node
/* Статический сервер для превью — на встроенных модулях Node, без зависимостей.
 *
 * Сайт собирается без сборщика: index.html грузит css/ и js/ напрямую, поэтому
 * для просмотра достаточно отдать файлы репозитория как есть.
 *
 *   node scripts/serve.js            # порт из PORT (иначе 3000), хост 0.0.0.0
 *
 * Слушает 0.0.0.0, потому что Freebuff подставляет нужный порт через PORT.
 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const HOST = "0.0.0.0";
const PORT = Number(process.env.PORT) || 3000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
};

function send(res, status, body, headers) {
  res.writeHead(status, headers);
  res.end(body);
}

function resolveFile(urlPath) {
  let rel = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  if (rel.endsWith("/")) { rel += "index.html"; }
  const file = path.resolve(ROOT, "." + rel);
  /* Ничего за пределами проекта не отдаём. */
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { return null; }
  return file;
}

const server = http.createServer(function (req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return send(res, 405, "Method Not Allowed", { "Content-Type": "text/plain; charset=utf-8" });
  }

  const file = resolveFile(req.url || "/");
  if (!file) {
    return send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
  }

  fs.stat(file, function (err, stat) {
    if (err || !stat.isFile()) {
      return send(res, 404, "Not Found", { "Content-Type": "text/plain; charset=utf-8" });
    }
    const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
    const headers = { "Content-Type": type, "Content-Length": stat.size, "Cache-Control": "no-cache" };
    if (req.method === "HEAD") { return send(res, 200, "", headers); }
    const stream = fs.createReadStream(file);
    stream.on("error", function () { send(res, 500, "Server Error", { "Content-Type": "text/plain; charset=utf-8" }); });
    res.writeHead(200, headers);
    stream.pipe(res);
  });
});

server.listen(PORT, HOST, function () {
  console.log("Дорогами духовности — превью: http://" + HOST + ":" + PORT + "/");
});
