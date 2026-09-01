/* Application bootstrap: dispatches URL state to page views. */
(function () {
  "use strict";
  var R = window.ChurchRouter;
  var V = window.ChurchViews;

  function handleRoute(route) {
    if (route === "" || route === "map") {
      V.renderHome();
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
    renderChurch: V.renderChurch,
    renderNotFound: V.renderNotFound
  };
})();
