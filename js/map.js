/* SVG map interface: rendering plus transient cluster-popup interaction state. */
(function () {
  "use strict";
  var G = window.ChurchMapGeometry;

  function escapeAttr(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function confessionClass(confession) { return confession === "orthodox" ? "orthodox" : ""; }
  function markerLabel(point, text, x, y, step) {
    return '<text class="map-marker-label" data-step="' + step + '" data-mx="' + x +
      '" data-my="' + y + '" x="' + x + '" y="' + y + '">' + escapeAttr(text) + '</text>';
  }
  function clusterMarkup(cluster) {
    var step = cluster.members[0].step;
    var label = cluster.name + " · " + cluster.members.length + " храма";
    return '<g class="map-cluster" data-cluster="' + escapeAttr(cluster.name) + '" data-step="' + step +
      '" role="button" tabindex="0" aria-label="' + escapeAttr(cluster.name + ': ' + cluster.members.length + ' храма — открыть выбор') + '">' +
      '<circle class="map-marker ' + confessionClass(cluster.members[0].confession) + '" cx="' + cluster.x.toFixed(1) +
      '" cy="' + cluster.y.toFixed(1) + '" r="15"/>' +
      '<text class="map-marker-num" x="' + cluster.x.toFixed(1) + '" y="' + cluster.y.toFixed(1) + '">' + step + '</text>' +
      markerLabel(cluster, label, cluster.x + 20, cluster.y + 4, step) + '</g>';
  }
  function singleMarkup(point) {
    return '<g class="map-marker-g" data-slug="' + escapeAttr(point.slug) + '" data-step="' + point.step +
      '" role="link" tabindex="0" aria-label="' + escapeAttr(point.name) + '">' +
      '<circle class="map-marker ' + confessionClass(point.confession) + '" cx="' + point.x.toFixed(1) +
      '" cy="' + point.y.toFixed(1) + '" r="13"/>' +
      '<text class="map-marker-num" x="' + point.x.toFixed(1) + '" y="' + point.y.toFixed(1) + '">' + point.step + '</text>' +
      markerLabel(point, point.shortName, point.x + 18, point.y + 4, point.step) + '</g>';
  }

  function renderSvg(data) {
    var riverMid = G.pointString(G.RIVER[Math.floor(G.RIVER.length / 2)][1], G.RIVER[Math.floor(G.RIVER.length / 2)][0]).split(",");
    return '<svg viewBox="0 0 ' + G.W + ' ' + G.H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Схема маршрута по храмам Мостовского района">' +
      '<g class="map-background" aria-hidden="true" pointer-events="none">' +
      '<path class="map-district" pointer-events="none" d="' + G.pathString(G.DISTRICT, true) + '"/>' +
      G.FORESTS.map(function (forest) {
        var center = G.project(forest[1], forest[0]);
        return '<ellipse class="map-forest" cx="' + center.x.toFixed(1) + '" cy="' + center.y.toFixed(1) + '" rx="' + forest[2] + '" ry="' + forest[3] + '"/>';
      }).join("") +
      '<path class="map-river" d="' + G.pathString(G.RIVER, false) + '"/>' +
      '<text class="map-water-label" x="' + riverMid[0] + '" y="' + (parseFloat(riverMid[1]) - 8) + '">р. Неман</text>' +
      G.ROADS.map(function (road) { return '<path class="map-road" d="' + G.pathString(road, false) + '"/>'; }).join("") +
      '</g>' +
      '<polyline class="map-route-line" points="' + data.points.map(function (p) { return p.x.toFixed(1) + "," + p.y.toFixed(1); }).join(" ") + '"/>' +
      data.clusters.map(clusterMarkup).join("") + data.singles.map(singleMarkup).join("") + '</svg>';
  }

  function renderSchema(el) {
    var data = G.buildSchemaData();
    el.innerHTML = renderSvg(data) + '<div class="cluster-popup" hidden>' +
      '<button type="button" class="cluster-popup-close" aria-label="Закрыть">×</button>' +
      '<h3 class="cluster-popup-title"></h3><ul class="cluster-popup-list"></ul></div>';
    var svg = el.querySelector("svg");
    G.resolveLabelCollisions(svg);
    var popup = el.querySelector(".cluster-popup");
    var title = el.querySelector(".cluster-popup-title");
    var list = el.querySelector(".cluster-popup-list");
    function showCluster(cluster) {
      title.textContent = cluster.name + " — " + cluster.members.length + " храма";
      list.innerHTML = cluster.members.map(function (member) {
        var confession = member.confession === "orthodox" ? "православный" : "католический";
        return '<li><a href="#/' + escapeAttr(member.slug) + '"><span class="cluster-step">' + member.step +
          '</span> ' + escapeAttr(member.name) + '</a><span class="cluster-conf">' + confession + '</span></li>';
      }).join("");
      popup.hidden = false;
      list.querySelector("a").focus();
    }
    function openCluster(name) {
      for (var i = 0; i < data.clusters.length; i++) {
        if (data.clusters[i].name === name) { showCluster(data.clusters[i]); return; }
      }
    }
    el.addEventListener("click", function (event) {
      var target = event.target;
      var group = target.closest ? target.closest("[data-slug], [data-cluster]") : null;
      if (!group) { return; }
      if (group.hasAttribute("data-slug")) { window.location.hash = "#/" + group.getAttribute("data-slug"); }
      else { openCluster(group.getAttribute("data-cluster")); }
    });
    el.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") { return; }
      var group = event.target;
      if (!group || !group.hasAttribute) { return; }
      event.preventDefault();
      if (group.hasAttribute("data-slug")) { window.location.hash = "#/" + group.getAttribute("data-slug"); }
      else if (group.hasAttribute("data-cluster")) { openCluster(group.getAttribute("data-cluster")); }
    });
    el.querySelector(".cluster-popup-close").addEventListener("click", function () { popup.hidden = true; });
  }

  window.ChurchMap = { renderSchema: renderSchema, buildSchemaData: G.buildSchemaData, proj: G.project };
})();
