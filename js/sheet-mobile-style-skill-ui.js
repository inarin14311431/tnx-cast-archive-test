const $ = selector => document.querySelector(selector);
let applyButton = null;
let installed = false;

function install() {
  if (installed) return true;
  const dialog = $("#style-skill-dialog");
  const close = $("#style-skill-dialog-cancel");
  const apply = $("#style-skill-dialog-apply");
  if (!dialog || !close || !apply) return false;
  applyButton = apply;
  installed = true;
  close.addEventListener("click", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    applyButton?.click();
    if (dialog.open) dialog.close();
  }, true);
  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    applyButton?.click();
    if (dialog.open) dialog.close();
  }, true);
  apply.remove();
  dialog.querySelector(".mobile-editor-dialog__header")?.classList.add("mobile-editor-dialog__header--close-only");
  return true;
}

function init() {
  if (install()) return;
  const status = $("#mobile-save-status");
  if (!status) return;
  const observer = new MutationObserver(() => {
    if (install()) observer.disconnect();
  });
  observer.observe(status, { childList: true, subtree: true, attributes: true });
}

init();