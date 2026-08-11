/* Legacy bridge for master-search enhancements.
 * sheet-master-search.js is a deferred module, while this file is still loaded
 * as a classic script from sheet.html. Wait for deferred modules to finish,
 * then hand off to the responsibility-separated enhancement module graph. */
(() => {
  const loadEnhancements = () => {
    import("./sheet-master-search-enhancements.js").catch(error => {
      console.warn("Master search enhancements could not be loaded.", error);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadEnhancements, { once: true });
  } else {
    loadEnhancements();
  }
})();
