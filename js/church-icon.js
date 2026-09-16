/* Условный знак «православный храм» — один рисунок на весь проект.
 * Силуэт: колокольня с шатром и крестом + основной объём с луковичным
 * куполом. Описан один раз и вставляется инлайном (не через <use>), чтобы
 * классы частей иконки попадали в документ и красились общими правилами
 * style.css: на схеме, в легенде и в списках остановок. */
(function () {
  "use strict";

  var VIEW_BOX = "0 0 40 46";
  /* Осевая линия x=14 — колокольня; x=27 — основной объём с куполом. */
  var SHAPE =
    /* колокольня: ствол, шатёр, крестик */
    '<path class="ci-body" d="M11.5 46V22h5v24z"/>' +
    '<path class="ci-roof" d="M10 22l4-7 4 7z"/>' +
    '<path class="ci-cross" d="M13.7 8.4h0.6v4.2h-0.6zM12.3 9.6h3.4v0.6h-3.4z"/>' +
    /* основной объём: стены, луковичный купол, большой крест */
    '<path class="ci-body" d="M21.5 46V28h11v18z"/>' +
    '<path class="ci-dome" d="M27 10c-3.4 3.6-5 6.2-5 9 0 3 2.2 5 5 5s5-2 5-5c0-2.8-1.6-5.4-5-9z"/>' +
    '<path class="ci-cross" d="M26.6 0h0.8v8h-0.8zM23.6 2.2h6.8v0.8h-6.8zM25.4 0.9h2.2v0.8h-2.2z"/>';

  /* svg(className, attrs) — attrs нужны для вложенной иконки внутри схемы
   * (x/y/width/height), где обычный <svg> вписывается в общий viewBox. */
  function svg(className, attrs) {
    return '<svg class="' + className + '" viewBox="' + VIEW_BOX + '"' +
      (attrs ? " " + attrs : "") +
      ' aria-hidden="true" focusable="false">' + SHAPE + "</svg>";
  }

  window.ChurchIcon = { svg: svg };
})();
