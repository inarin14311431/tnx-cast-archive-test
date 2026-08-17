import "./sheet-mobile-style-skill-ui.js?v=20260818-2";
const $ = selector => document.querySelector(selector);

function ensureCommonStyles() {
  const styles = [
    ["mobile-theme", "./css-next/pages/sheet-mobile-theme.css?v=1"],
    ["mobile-ui", "./css-next/pages/sheet-mobile-ui.css?v=1"],
    ["mobile-profile-current", "./css-next/pages/sheet-mobile-profile.css?v=9"],
    ["mobile-ability-current", "./css-next/pages/sheet-mobile-ability.css?v=3"]
  ];
  for (const [key, href] of styles) {
    if (document.querySelector(`link[data-${key}-style]`)) continue;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute(`data-${key}-style`, "1");
    document.head.append(link);
  }
}

function removeObsoleteControls() {
  document.querySelectorAll(".mobile-section-top").forEach(node => node.remove());
  ["#mobile-ability-dialog-apply", "#mobile-cs-dialog-apply"].forEach(selector => $(selector)?.remove());
  ["#mobile-ability-dialog", "#mobile-cs-dialog"].forEach(selector => $(selector)?.querySelector(".mobile-editor-dialog__header")?.classList.add("mobile-editor-dialog__header--close-only"));
  document.querySelectorAll(".mobile-sheet-section > header > small").forEach(node => node.remove());
  document.querySelectorAll(".mobile-sheet-section > .mobile-sheet-section__body > .mobile-sheet-section__note").forEach(node => node.remove());
}

function addEditNotice() {
  if ($("#mobile-edit-notice")) return;
  const status = $("#mobile-save-status");
  if (!status) return;
  const notice = document.createElement("p");
  notice.id = "mobile-edit-notice";
  notice.className = "mobile-edit-notice";
  notice.textContent = "各項目はタップすると編集できます。入力内容はその場で編集状態へ反映され、保存は画面下部の保存ボタンで確定します。";
  status.after(notice);
}

function init() {
  ensureCommonStyles();
  removeObsoleteControls();
  addEditNotice();
}

init();