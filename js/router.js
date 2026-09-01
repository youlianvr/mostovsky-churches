/* Hash router and route-domain helpers. It owns URL state, not page markup. */
(function () {
  "use strict";

  function parseRoute() {
    var hash = window.location.hash || "#/";
    return hash.replace(/^#\//, "").split("?")[0].replace(/\/+$/, "");
  }

  function findChurchBySlug(slug) {
    var i;
    for (i = 0; i < CHURCHES.length; i++) {
      if (CHURCHES[i].slug === slug) { return CHURCHES[i]; }
    }
    return null;
  }

  function routeNeighbours(church) {
    var idx = ROUTE.indexOf(church.slug);
    if (idx === -1) { return { prev: null, next: null }; }
    var last = ROUTE.length - 1;
    return {
      prev: findChurchBySlug(ROUTE[idx > 0 ? idx - 1 : last]),
      next: findChurchBySlug(ROUTE[idx < last ? idx + 1 : 0])
    };
  }

  function start(onRoute) {
    function handleRoute() {
      onRoute(parseRoute());
      window.scrollTo(0, 0);
    }
    window.addEventListener("hashchange", handleRoute);
    window.addEventListener("DOMContentLoaded", handleRoute);
  }

  window.ChurchRouter = {
    parseRoute: parseRoute,
    findChurchBySlug: findChurchBySlug,
    routeNeighbours: routeNeighbours,
    start: start
  };
})();
