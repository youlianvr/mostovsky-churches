/* Map domain model: projection, illustrative geography, grouping, label placement. */
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

  function findChurch(slug) {
    var i;
    for (i = 0; i < CHURCHES.length; i++) {
      if (CHURCHES[i].slug === slug) { return CHURCHES[i]; }
    }
    return null;
  }

  function project(lat, lon) {
    return {
      x: (lon - LON_MIN) / (LON_MAX - LON_MIN) * W,
      y: (LAT_MAX - lat) / (LAT_MAX - LAT_MIN) * H
    };
  }

  function normSettlement(value) {
    return String(value).replace(/^(д\.|аг\.|пос\.|г\.)\s*/i, "")
      .replace(/\s*\(.*\)$/, "").trim();
  }

  function buildSchemaData() {
    var points = [], bySettlement = {}, i, c, p, key, members, m, cx, cy;
    for (i = 0; i < ROUTE.length; i++) {
      c = findChurch(ROUTE[i]);
      p = project(c.coords.lat, c.coords.lon);
      points.push({ slug: c.slug, name: c.name, settlement: c.settlement,
        shortName: normSettlement(c.settlement), confession: c.confession,
        step: i + 1, x: p.x, y: p.y });
    }
    for (i = 0; i < points.length; i++) {
      key = points[i].shortName;
      if (!bySettlement[key]) { bySettlement[key] = []; }
      bySettlement[key].push(points[i]);
    }
    var clusters = [], singles = [];
    for (key in bySettlement) {
      members = bySettlement[key];
      if (members.length > 1) {
        cx = 0; cy = 0;
        for (m = 0; m < members.length; m++) { cx += members[m].x; cy += members[m].y; }
        clusters.push({ name: key, members: members, x: cx / members.length, y: cy / members.length });
      } else { singles.push(members[0]); }
    }
    clusters.sort(function (a, b) { return a.members[0].step - b.members[0].step; });
    singles.sort(function (a, b) { return a.step - b.step; });
    return { points: points, clusters: clusters, singles: singles };
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

  function resolveLabelCollisions(svg) {
    var labels = Array.prototype.slice.call(svg.querySelectorAll(".map-marker-label"));
    var pass, i, j, changed;
    labels.forEach(function (t) { t.__side = "right"; t.__dy = 0; t.__flipped = false; });

    function boxes() {
      var arr = [];
      labels.forEach(function (t) {
        var mx = parseFloat(t.getAttribute("data-mx"));
        var my = parseFloat(t.getAttribute("data-my"));
        t.setAttribute("x", t.__side === "right" ? mx : mx - 36);
        t.setAttribute("y", my + t.__dy);
        t.setAttribute("text-anchor", t.__side === "right" ? "start" : "end");
        var b = t.getBBox();
        arr.push({ type: "label", el: t, my: my, x: b.x, y: b.y, w: b.width, h: b.height });
      });
      Array.prototype.slice.call(svg.querySelectorAll(".map-marker")).forEach(function (circle) {
        var b = circle.getBBox();
        arr.push({ type: "circle", x: b.x, y: b.y, w: b.width, h: b.height });
      });
      return arr;
    }
    function hit(a, b) {
      return Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 2 &&
        Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 2;
    }
    function flip(t) { t.__side = t.__side === "right" ? "left" : "right"; t.__flipped = true; }

    for (pass = 0; pass < 8; pass++) {
      changed = false;
      var all = boxes();
      for (i = 0; i < all.length; i++) {
        for (j = i + 1; j < all.length; j++) {
          var a = all[i], b = all[j];
          if (!hit(a, b)) { continue; }
          if (a.type === "label" && b.type === "label") {
            var upper = a.my <= b.my ? a : b;
            var lower = upper === a ? b : a;
            if (upper.el.__dy > -42) { upper.el.__dy -= 14; changed = true; }
            else if (lower.el.__dy < 42) { lower.el.__dy += 14; changed = true; }
            else if (!upper.el.__flipped) { flip(upper.el); changed = true; }
          } else {
            var label = a.type === "label" ? a.el : b.el;
            if (label && !label.__flipped) { flip(label); changed = true; }
          }
        }
      }
      if (!changed) { break; }
    }
    labels.forEach(function (t) { delete t.__flipped; });
  }

  window.ChurchMap = window.ChurchMap || {};
  window.ChurchMapGeometry = {
    W: W, H: H, DISTRICT: DISTRICT, RIVER: RIVER, ROADS: ROADS, FORESTS: FORESTS,
    findChurch: findChurch, project: project, buildSchemaData: buildSchemaData,
    pointString: pointString, pathString: pathString, resolveLabelCollisions: resolveLabelCollisions
  };
  window.ChurchMap.buildSchemaData = buildSchemaData;
})();
