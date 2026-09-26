/* Application bootstrap: URL state → page. The one list of sections lives in
 * js/sections.js (the five section pages of the route «Дорогами духовности»),
 * the church page and the 404 view live in js/church.js, and the only writer
 * of #app is js/dom.js. This file owns nothing but the dispatch. */
(function () {
  "use strict";
  var R = window.ChurchRouter;
  var S = window.ChurchSections;
  var P = window.ChurchPage;
  var H = window.ChurchHtml;

  function handleRoute(id) {
    var section = S.find(id);
    H.markCurrent("#/" + id);
    if (section) { section.render(); return; }
    if (id === "about") { window.location.href = "about.html"; return; }
    var church = R.findChurchBySlug(id);
    if (church) { P.render(church); } else { P.notFound(); }
  }

  R.start(handleRoute);
})();
