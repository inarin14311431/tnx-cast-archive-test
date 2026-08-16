(() => {
  const publicId = new URLSearchParams(location.search).get("id")?.trim() || "";
  const desktopButton = document.querySelector("#direct-transfer-button");

  if (desktopButton) {
    desktopButton.disabled = !publicId;
    desktopButton.title = publicId ? "キャラシ倉庫へデータ転記" : "保存済みキャストで利用できます。";
  }

  let dialog = null;

  function ensureStyles() {
    if (document.querySelector("#direct-transfer-runtime-style")) return;
    const style = document.createElement("style");
    style.id = "direct-transfer-runtime-style";
    style.textContent = `
      #direct-transfer-button:hover,
      #direct-transfer-button:focus-visible{
        border-color:#66d9c7;
        background:#66d9c7;
        color:var(--color-surface,#0d1820);
        box-shadow:0 0 16px color-mix(in srgb,#66d9c7 58%,transparent)
      }
      #direct-transfer-button:is(:hover,:focus-visible) small{
        color:var(--color-surface,#0d1820);
        opacity:.86
      }
      .mobile-cast-topbar.has-transfer-action{
        grid-template-columns:auto minmax(0,1fr) auto auto
      }
      .mobile-cast-topbar.has-transfer-action>span{
        min-width:0;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
        text-align:center
      }
      .mobile-cast-topbar .mobile-cast-topbar__transfer{
        --transfer-accent:#66d9c7;
        position:relative;
        display:grid;
        align-content:center;
        gap:1px;
        min-width:64px;
        min-height:30px;
        padding:4px 7px 4px 9px;
        overflow:hidden;
        border:1px solid var(--transfer-accent);
        border-radius:0;
        color:var(--color-text,#d7e7eb);
        background:linear-gradient(135deg,color-mix(in srgb,var(--transfer-accent) 18%,transparent),var(--color-accent-soft));
        font:800 9px/1.05 var(--font-data,monospace);
        letter-spacing:.03em;
        text-align:left;
        white-space:nowrap
      }
      .mobile-cast-topbar .mobile-cast-topbar__transfer::before{
        position:absolute;
        inset:0 auto 0 0;
        width:2px;
        content:"";
        background:var(--transfer-accent);
        box-shadow:0 0 10px var(--transfer-accent)
      }
      .mobile-cast-topbar .mobile-cast-topbar__transfer small{
        display:block;
        margin:1px 0 0;
        color:var(--color-muted,#8ba1a8);
        font-size:6px;
        letter-spacing:.07em
      }
      .mobile-cast-topbar .mobile-cast-topbar__transfer:is(:hover,:focus-visible,:active){
        border-color:var(--transfer-accent);
        background:var(--transfer-accent);
        color:var(--color-surface,#0d1820);
        box-shadow:0 0 16px color-mix(in srgb,var(--transfer-accent) 58%,transparent)
      }
      .mobile-cast-topbar .mobile-cast-topbar__transfer:is(:hover,:focus-visible,:active) small{
        color:var(--color-surface,#0d1820);
        opacity:.86
      }
      .mobile-cast-topbar .mobile-cast-topbar__transfer:disabled{
        opacity:.38;
        cursor:not-allowed
      }
      @media(max-width:390px){
        .mobile-cast-topbar.has-transfer-action{gap:4px;padding-inline:6px}
        .mobile-cast-topbar .mobile-cast-topbar__transfer{min-width:58px;padding-inline:7px 5px;font-size:8px}
        .mobile-cast-topbar .mobile-cast-topbar__transfer small{font-size:5px}
      }
      .cast-transfer-dialog{width:min(860px,calc(100vw - 32px));height:min(88vh,920px);max-width:none;max-height:none;margin:auto;padding:0;border:1px solid color-mix(in srgb,var(--color-accent,#22d3ee) 42%,var(--color-border,#35515c));background:var(--color-surface,#0d1820);color:var(--color-text);box-shadow:0 20px 70px rgba(0,0,0,.58);overflow:hidden}
      .cast-transfer-dialog::backdrop{background:rgba(3,8,12,.74);backdrop-filter:blur(3px)}
      .cast-transfer-dialog__shell{display:grid;grid-template-rows:auto minmax(0,1fr);height:100%}
      .cast-transfer-dialog__header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 14px;border-bottom:1px solid var(--color-border);background:color-mix(in srgb,var(--color-surface,#0d1820) 92%,var(--color-accent,#22d3ee) 8%)}
      .cast-transfer-dialog__header div{display:grid;gap:2px}.cast-transfer-dialog__header span{font:700 .58rem/1 var(--font-data,monospace);letter-spacing:.14em;color:var(--color-muted)}
      .cast-transfer-dialog__header strong{font-size:1rem;color:var(--color-accent)}
      .cast-transfer-dialog__close{display:grid;place-items:center;width:36px;height:36px;padding:0;border:1px solid var(--color-border);background:transparent;color:var(--color-text);font-size:1.35rem;line-height:1;cursor:pointer}
      .cast-transfer-dialog__close:hover,.cast-transfer-dialog__close:focus-visible{border-color:var(--color-accent);color:var(--color-accent);background:color-mix(in srgb,var(--color-accent,#22d3ee) 9%,transparent)}
      .cast-transfer-dialog__frame{width:100%;height:100%;border:0;background:transparent}
      @media(max-width:640px){.cast-transfer-dialog{width:calc(100vw - 12px);height:calc(100dvh - 12px)}.cast-transfer-dialog__header{padding:10px 11px}}
    `;
    document.head.append(style);
  }

  function ensureDialog() {
    if (dialog) return dialog;
    ensureStyles();

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

  function openTransfer() {
    if (!publicId) return;
    const modal = ensureDialog();
    const frame = modal.querySelector(".cast-transfer-dialog__frame");
    if (frame) frame.src = `./transfer.html?embed=1&id=${encodeURIComponent(publicId)}`;
    if (typeof modal.showModal === "function") modal.showModal();
    else modal.setAttribute("open", "");
  }

  desktopButton?.addEventListener("click", openTransfer);

  function installMobileButton() {
    const topbar = document.querySelector("#mobile-cast-view .mobile-cast-topbar");
    if (!topbar || topbar.querySelector(".mobile-cast-topbar__transfer")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "mobile-cast-topbar__transfer";
    button.innerHTML = "<span>データ転記</span><small>TRANSFER</small>";
    button.disabled = !publicId;
    button.title = publicId ? "キャラシ倉庫へデータ転記" : "保存済みキャストで利用できます。";
    button.addEventListener("click", openTransfer);

    const desktopLink = topbar.querySelector(".mobile-cast-topbar__desktop");
    topbar.insertBefore(button, desktopLink || null);
    topbar.classList.add("has-transfer-action");
  }

  ensureStyles();
  installMobileButton();

  const mobileRoot = document.querySelector("#mobile-cast-view");
  if (mobileRoot) {
    const observer = new MutationObserver(installMobileButton);
    observer.observe(mobileRoot, { childList: true, subtree: true });
  }
})();
