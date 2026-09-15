/* Условный знак «православный храм» — один рисунок на весь проект.
 * Описан один раз и вставляется инлайном (не через <use>), чтобы классы
 * частей иконки попадали в документ и красились общими правилами style.css:
 * на схеме, в легенде и в списках остановок. */
(function () {
  "use strict";

  var VIEW_BOX = "0 0 40 46";
  var SHAPE =
    '<path class="ci-body" d="M8 45V20h24v25z"/>' +
    '<path class="ci-roof" d="M4 20L20 8l16 12z"/>' +
    '<circle class="ci-dome" cx="20" cy="6" r="4"/>' +
    '<path class="ci-cross" d="M19.1 0h1.8v6h-1.8zM16.6 1.6h6.8v1.8h-6.8z"/>';

  /* svg(className, attrs) — attrs нужны для вложенной иконки внутри схемы
   * (x/y/width/height), где обычный <svg> вписывается в общий viewBox. */
  function svg(className, attrs) {
    return '<svg class="' + className + '" viewBox="' + VIEW_BOX + '"' +
      (attrs ? " " + attrs : "") +
      ' aria-hidden="true" focusable="false">' + SHAPE + "</svg>";
  }

  window.ChurchIcon = { svg: svg };
})();
