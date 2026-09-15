/* Application bootstrap: dispatches URL state to page views.
 * Six routes = six required elements of competition block 1
 * «Дорогами духовности»: нитка маршрута, карта-схема, описание,
 * логистика, справочная информация, фотоотчёт. */
(function () {
  "use strict";
  var R = window.ChurchRouter;
  var V = window.ChurchViews;

  /* Служебные адреса отделов Блока 1 -> функции отрисовки. */
  var BLOCK_ROUTES = {
    "map": "renderMap",
    "opis": "renderOpis",
    "logistika": "renderLogistika",
    "spravka": "renderSpravka",
    "foto": "renderFoto"
  };

  function handleRoute(route) {
    if (route === "" ) {
      V.renderRoute();
    } else if (BLOCK_ROUTES[route]) {
      V[BLOCK_ROUTES[route]]();
    } else if (route === "about") {
      window.location.href = "about.html";
    } else {
      var church = R.findChurchBySlug(route);
      if (church) { V.renderChurch(church); } else { V.renderNotFound(); }
    }
  }

  R.start(handleRoute);

  /* Compatibility surface for the existing stage checks and later stages. */
  window.ChurchApp = {
    parseRoute: R.parseRoute,
    findChurchBySlug: R.findChurchBySlug,
    buildMapLinks: V.buildMapLinks,
    routeNeighbours: R.routeNeighbours,
    renderRoute: V.renderRoute,
    renderMap: V.renderMap,
    renderOpis: V.renderOpis,
    renderLogistika: V.renderLogistika,
    renderSpravka: V.renderSpravka,
    renderFoto: V.renderFoto,
    renderChurch: V.renderChurch,
    renderNotFound: V.renderNotFound
  };
})();
