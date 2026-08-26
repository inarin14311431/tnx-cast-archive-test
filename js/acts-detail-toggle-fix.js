(() => {
  const list = document.querySelector("#act-history-list");
  if (!list) return;

  document.addEventListener("click", event => {
    const toggle = event.target.closest?.("[data-toggle-act-detail]");
    if (!toggle || !list.contains(toggle)) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const record = toggle.closest(".act-record");
    if (!record) return;

    const open = !record.classList.contains("is-detail-open");
    record.classList.toggle("is-detail-open", open);
    toggle.setAttribute("aria-expanded", String(open));

    const icon = toggle.querySelector(".act-record-summary__icon");
    if (icon) icon.textContent = open ? "−" : "＋";
  }, true);
})();
