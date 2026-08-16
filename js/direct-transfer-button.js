(() => {
  const button = document.querySelector("#direct-transfer-button");
  if (!button) return;

  const publicId = new URLSearchParams(location.search).get("id")?.trim() || "";
  button.disabled = !publicId;
  button.title = publicId ? "キャラシ倉庫へデータ転記" : "保存済みキャストで利用できます。";

  let dialog = null;

  function ensureDialog() {
    if (dialog) return dialog;
    const style = document.createElement("style");
    style.textContent = `
      .cast-transfer-dialog{width:min(860px,calc(100vw - 32px));height:min(88vh,920px);max-width:none;max-height:none;margin:auto;padding:0;border:1px solid color-mix(in srgb,var(--color-accent,#22d3ee) 42%,var(--color-border,#35515c));background:var(--color-surface,#0d1820);color:var(--color-text);box-shadow:0 20px 70px rgba(0,0,0,.58);overflow:hidden}
      .cast-transfer-dialog::backdrop{background:rgba(3,8,12,.74);backdrop-filter:blur(3px)}
      .cast-transfer-dialog__shell{display:grid;grid-template-rows:auto minmax(0,1fr);height:100%}
      .cast-transfer-dialog__header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 14px;border-bottom:1px solid var(--color-border);background:color-mix(in srgb,var(--color-surface,#0d1820) 92%,var(--color-accent,#22d3ee) 8%)}
      .cast-transfer-dialog__header div{display:grid;gap:2px}.cast-transfer-dialog__header span{font:700 .58rem/1 var(--font-data,monospace);letter-spacing:.14em;color:var(--color-muted)}
      .cast-transfer-dialog__header strong{font-size:1rem;color:var(--color-accent)}
      .cast-transfer-dialog__close{display:grid;place-items:center;width:36px;height:36px;padding:0;border:1px solid var(--color-border);background:transparent;color:var(--color-text);font-size:1.35rem;line-height:1;cursor:pointer}
      .cast-transfer-dialog__close:hover,.cast-transfer-dialog__close:focus-visible{border-color:var(--color-accent);color:var(--color-accent);background:color-mix(in srgb,var(--color-accent,#22d3ee) 9%,transparent)}
      .cast-transfer-dialog__frame{width:100%;height:100%;border:0;background:transparent}
      @media(max-width:640px){.cast-transfer-dialog{width:calc(100vw - 12px);height:calc(100vh - 12px)}.cast-transfer-dialog__header{padding:10px 11px}}
    `;
    document.head.append(style);

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
    dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => {
      const frame = dialog.querySelector(".cast-transfer-dialog__frame");
      if (frame) frame.src = "about:blank";
    });
    return dialog;
  }

  button.addEventListener("click", () => {
    if (!publicId) return;
    const modal = ensureDialog();
    const frame = modal.querySelector(".cast-transfer-dialog__frame");
    frame.src = `./transfer.html?embed=1&id=${encodeURIComponent(publicId)}`;
    if (typeof modal.showModal === "function") modal.showModal();
    else modal.setAttribute("open", "");
  });
})();
