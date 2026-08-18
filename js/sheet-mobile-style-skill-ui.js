const $ = selector => document.querySelector(selector);
let applyButton = null;
let installed = false;
let suitObserver = null;

const SUIT_DISPLAY = [["♠","♤"],["♣","♧"],["♥","♡"],["♦","♢"]];

function renderAllSuits(root = document) {
  root.querySelectorAll?.(".mobile-edit-card__suits").forEach(node => {
    const selected = node.dataset.selectedSuits ?? node.textContent ?? "";
    if (node.dataset.selectedSuits == null) node.dataset.selectedSuits = selected;
    const display = SUIT_DISPLAY.map(([filled,outline]) => selected.includes(filled) ? filled : outline).join("");
    if (node.textContent !== display) node.textContent = display;
    node.setAttribute("aria-label", `取得スート ${display}`);
  });
}

function observeSuitDisplay() {
  const root = $("#mobile-style-skills");
  if (!root || suitObserver) return;
  renderAllSuits(root);
  suitObserver = new MutationObserver(() => renderAllSuits(root));
  suitObserver.observe(root, {childList:true,subtree:true});
}

function commitAndClose(dialog) {
  document.dispatchEvent(new CustomEvent("tnx:mobile-style-dialog-commit"));
  applyButton?.click();
  if (dialog.open) dialog.close();
}

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
    commitAndClose(dialog);
  }, true);
  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    commitAndClose(dialog);
  }, true);
  dialog.addEventListener("close", () => {
    const body = dialog.querySelector(".mobile-editor-dialog__body");
    if (body) body.scrollTop = 0;
  });

  apply.remove();
  dialog.querySelector(".mobile-editor-dialog__header")?.classList.add("mobile-editor-dialog__header--close-only");
  observeSuitDisplay();
  return true;
}

function init() {
  observeSuitDisplay();
  const status = $("#mobile-save-status");
  if (!status) return;
  const tryAfterBaseBinding = () => {
    if (status.textContent?.trim() === "初期化中…") return false;
    return install();
  };
  if (tryAfterBaseBinding()) return;
  const observer = new MutationObserver(() => {
    observeSuitDisplay();
    if (tryAfterBaseBinding()) observer.disconnect();
  });
  observer.observe(status, {childList:true,subtree:true,attributes:true});
}

init();