/* Keep the armor defense total footer aligned with dynamically injected OFC columns. */
(() => {
  const root = document.querySelector("#outfit-list");
  if (!root) return;

  let queued = false;

  function alignArmorFooter() {
    const table = root.querySelector('table[data-outfit-schema="armor"]');
    const header = table?.querySelector("thead tr");
    const footer = table?.querySelector("tfoot .armor-defense-total-row");
    if (!header || !footer) return;

    const cells = [...header.children];
    const sIndex = cells.findIndex(cell => cell.dataset.ofcHead === "defense_s");
    const pIndex = cells.findIndex(cell => cell.dataset.ofcHead === "defense_p");
    const iIndex = cells.findIndex(cell => cell.dataset.ofcHead === "defense_i");
    if (sIndex < 0 || pIndex !== sIndex + 1 || iIndex !== pIndex + 1) return;

    const label = footer.querySelector("th");
    const tail = footer.querySelector("td:last-child");
    if (label) label.colSpan = Math.max(1, sIndex);
    if (tail) tail.colSpan = Math.max(1, cells.length - iIndex - 1);
  }

  function queue() {
    if (queued) return;
    queued = true;
    // outfit-tables renders first; outfit-ofc-fields injects S/P/I on the next frame.
    // Align one frame after that instead of observing every DOM mutation.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      queued = false;
      alignArmorFooter();
    }));
  }

  root.addEventListener("tnx:outfit-tables-rendered", queue);
  queue();
})();
