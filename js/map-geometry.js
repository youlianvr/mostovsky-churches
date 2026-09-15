/* Модель схемы: проекция координат и условная география района.
 * Модуль чистый: на вход получает упорядоченный список объектов, на выходе —
 * точки схемы. Ничего не ищет сам (поиск по slug — задача роутера) и ничего
 * не рисует (отрисовка — js/map.js). Кластеризация не нужна: три остановки
 * стоят в трёх разных деревнях, поэтому каждая — отдельная иконка. */
(function () {
  "use strict";

  var LON_MIN = 24.10, LON_MAX = 24.94;
  var LAT_MIN = 53.23, LAT_MAX = 53.55;
  var W = 1000, H = 620;

  var DISTRICT = [
    [24.16, 53.52], [24.38, 53.54], [24.62, 53.53], [24.82, 53.50],
    [24.94, 53.44], [24.91, 53.35], [24.74, 53.26], [24.50, 53.24],
    [24.26, 53.25], [24.12, 53.33], [24.11, 53.44], [24.16, 53.52]
  ];
  var RIVER = [
    [24.94, 53.33], [24.78, 53.39], [24.60, 53.42], [24.54, 53.423],
    [24.42, 53.44], [24.33, 53.452], [24.26, 53.455], [24.14, 53.47], [24.10, 53.49]
  ];
  var ROADS = [
    [[24.10, 53.47], [24.26, 53.455], [24.42, 53.44], [24.54, 53.423], [24.66, 53.435], [24.78, 53.44]],
    [[24.54, 53.423], [24.54, 53.37], [24.545, 53.3274], [24.59, 53.31], [24.63, 53.355]],
    [[24.63, 53.355], [24.69, 53.32], [24.70, 53.3121], [24.76, 53.30], [24.88, 53.35]],
    [[24.54, 53.423], [24.60, 53.45], [24.68, 53.49], [24.72, 53.51]]
  ];
  var FORESTS = [
    [24.18, 53.40, 58, 34], [24.30, 53.30, 70, 40], [24.62, 53.28, 62, 30],
    [24.78, 53.42, 66, 36], [24.44, 53.36, 48, 26], [24.86, 53.30, 44, 24]
  ];

  function project(lat, lon) {
    return {
      x: (lon - LON_MIN) / (LON_MAX - LON_MIN) * W,
      y: (LAT_MAX - lat) / (LAT_MAX - LAT_MIN) * H
    };
  }

  /* «д. Гудевичи» → «Гудевичи»: на схеме нужна короткая подпись. */
  function shortLabel(settlement) {
    return String(settlement).replace(/^(д\.|аг\.|пос\.|г\.)\s*/i, "")
      .replace(/\s*\(.*\)$/, "").trim();
  }

  /* Упорядоченный список объектов маршрута → точки схемы.
   * step = номер остановки в нитке маршрута. */
  function routePoints(orderedChurches) {
    return orderedChurches.map(function (church, index) {
      var p = project(church.coords.lat, church.coords.lon);
      return {
        slug: church.slug,
        name: church.name,
        settlement: church.settlement,
        label: shortLabel(church.settlement),
        step: index + 1,
        x: p.x,
        y: p.y
      };
    });
  }

  function pointString(lat, lon) {
    var p = project(lat, lon);
    return p.x.toFixed(1) + "," + p.y.toFixed(1);
  }

  function pathString(points, close) {
    var d = "M " + pointString(points[0][1], points[0][0]);
    for (var i = 1; i < points.length; i++) { d += " L " + pointString(points[i][1], points[i][0]); }
    return d + (close ? " Z" : "");
  }

  window.ChurchMapGeometry = {
    W: W, H: H, DISTRICT: DISTRICT, RIVER: RIVER, ROADS: ROADS, FORESTS: FORESTS,
    project: project, routePoints: routePoints, pointString: pointString, pathString: pathString
  };
})();
