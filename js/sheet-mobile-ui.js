const $ = selector => document.querySelector(selector);

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
  removeObsoleteControls();
  addEditNotice();
}

init();