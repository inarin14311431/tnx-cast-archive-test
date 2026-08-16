(() => {
  const TRIGGER_SELECTOR = "[data-direct-transfer-trigger], #direct-transfer-button";
  let dialog = null;

  function resolvePublicId(trigger) {
    const triggerId = trigger?.dataset?.transferId?.trim() || "";
    if (triggerId) return triggerId;
    return new URLSearchParams(location.search).get("id")?.trim() || "";
  }

  function syncTrigger(trigger) {
    if (!(trigger instanceof HTMLButtonElement)) return;
    const publicId = resolvePublicId(trigger);
    trigger.disabled = !publicId;
    trigger.title = publicId ? "キャラシ倉庫へデータ転記" : "保存済みキャストで利用できます。";
  }

  function syncTriggers(root = document) {
    root.querySelectorAll?.(TRIGGER_SELECTOR).forEach(syncTrigger);
  }

  function ensureDialog() {
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.className = "cast-transfer-dialog";
    dialog.setAttribute("aria-labelledby", "cast-transfer-dialog-title");
    dialog.innerHTML = `
      <div class="cast-transfer-dialog__shell">
        <header class="cast-transfer-dialog__header">
          <div><span>CHARACTER SHEETS TRANSFER</span><strong id="cast-transfer-dialog-title">データ転記</strong></div>
          <button type="button" class="cast-transfer-dialog__close" aria-label="データ転記を閉じる">×</button>
        </header>
        <iframe class="cast-transfer-dialog__frame" title="データ転記"></iframe>
      </div>`;
    document.body.append(dialog);

    dialog.querySelector(".cast-transfer-dialog__close")?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => {
      const frame = dialog.querySelector(".cast-transfer-dialog__frame");
      if (frame) frame.src = "about:blank";
    });
    return dialog;
  }

  function openTransfer(trigger) {
    const publicId = resolvePublicId(trigger);
    if (!publicId) return;

    const modal = ensureDialog();
    const frame = modal.querySelector(".cast-transfer-dialog__frame");
    if (frame) frame.src = `./transfer.html?embed=1&id=${encodeURIComponent(publicId)}`;
    if (typeof modal.showModal === "function") modal.showModal();
    else modal.setAttribute("open", "");
  }

  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    const trigger = target?.closest(TRIGGER_SELECTOR);
    if (!(trigger instanceof HTMLButtonElement) || trigger.disabled) return;
    openTransfer(trigger);
  });

  syncTriggers();

  window.TNXDirectTransfer = Object.freeze({
    sync(root = document) {
      syncTriggers(root);
    },
    open(trigger) {
      openTransfer(trigger);
    }
  });
})();
