/* Legacy bridge. The normal-editing detail canonicalizer now lives in
 * style-skill-detail-integrity.js. Keep this tiny bridge until sheet.html
 * switches to the canonical filename. */
(() => {
  import("./style-skill-detail-integrity.js").catch(error => {
    console.warn("Style skill detail integrity module could not be loaded.", error);
  });
})();
