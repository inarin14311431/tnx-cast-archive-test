(() => {
  if (window.__tnxTransferHelpLoaded) return;
  window.__tnxTransferHelpLoaded = true;

  const STYLE_ID = "transfer-help-style";
  const DIALOG_ID = "transfer-help-dialog";
  const HELP_BUTTON_ID = "transfer-help-button";
  const TRANSFER_BUTTON_ID = "direct-transfer-button";
  const publicId = new URLSearchParams(location.search).get("id")?.trim() || "";

  ensureStyles();
  const observer = new MutationObserver(() => {
    if (install()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (install()) observer.disconnect();
  window.setTimeout(() => observer.disconnect(), 15000);

  function install() {
    document.querySelector("#transfer-tsv-copy-button")?.remove();
    document.querySelector("#transfer-bookmarklet-copy-button")?.remove();

    const parent = document.querySelector(".cast-header__export-actions") || document.querySelector(".exp-panel");
    if (!parent) return false;

    let transfer = document.querySelector(`#${TRANSFER_BUTTON_ID}`);
    if (!transfer) {
      transfer = document.createElement("button");
      transfer.id = TRANSFER_BUTTON_ID;
      transfer.type = "button";
      transfer.className = "direct-transfer-button";
      transfer.innerHTML = "<span>データ転記</span><small>CHARACTER SHEETS</small>";
      transfer.disabled = !publicId;
      transfer.title = publicId ? "キャラシ倉庫へデータ転記" : "保存済みキャストで利用できます。";
      transfer.addEventListener("click", () => {
        if (!publicId) return;
        location.href = `./transfer.html?id=${encodeURIComponent(publicId)}`;
      });
      parent.append(transfer);
    } else if (transfer.parentElement !== parent) {
      parent.append(transfer);
    }

    let help = document.querySelector(`#${HELP_BUTTON_ID}`);
    if (!help) {
      help = document.createElement("button");
      help.id = HELP_BUTTON_ID;
      help.type = "button";
      help.className = "transfer-help-button";
      help.innerHTML = "<span>HELP</span><small>TRANSFER GUIDE</small>";
      help.title = "データ転記の使い方";
      const dialog = createDialog();
      document.body.append(dialog);
      help.addEventListener("click", () => {
        if (typeof dialog.showModal === "function") dialog.showModal();
        else dialog.setAttribute("open", "");
      });
      dialog.addEventListener("click", event => {
        if (event.target === dialog || event.target.closest("[data-transfer-help-close]")) dialog.close?.();
      });
      dialog.addEventListener("cancel", () => dialog.close?.());
      parent.append(help);
    } else if (help.parentElement !== parent) {
      parent.append(help);
    }

    const udonarium = parent.querySelector("#udonarium-export-button");
    const cocofolia = parent.querySelector("#cocofolia-copy-button");
    const desired = [udonarium, cocofolia, transfer, help].filter(node => node && node.parentElement === parent);
    const current = [...parent.children].filter(node => desired.includes(node));
    const alreadyOrdered = desired.length === current.length && desired.every((node, index) => current[index] === node);
    if (!alreadyOrdered) desired.forEach(node => parent.append(node));
    return true;
  }

  function createDialog() {
    const dialog = document.createElement("dialog");
    dialog.id = DIALOG_ID;
    dialog.className = "transfer-help-dialog";
    dialog.setAttribute("aria-labelledby", "transfer-help-title");
    dialog.innerHTML = `
      <div class="transfer-help-shell">
        <header class="transfer-help-header">
          <div><small>TRANSFER GUIDE</small><h2 id="transfer-help-title">データ転記</h2></div>
          <button type="button" data-transfer-help-close aria-label="閉じる">×</button>
        </header>
        <div class="transfer-help-body">
          <section class="transfer-help-lead">
            <strong>CAST ARCHIVEのキャストをキャラクターシート倉庫へ直接転記します。</strong>
            <p>PC・スマートフォンのどちらでも利用できます。ブックマークレットや転記TSVは不要です。</p>
          </section>
          <section class="transfer-help-block"><span class="transfer-help-step">新規登録</span><h3>キャラシ倉庫へ新しいキャストを作る</h3><ol><li><b>「データ転記」</b>を押します。</li><li>キャスト内容を確認し、編集パスワードを入力します。</li><li>必要なら<b>「リストに載せない」</b>を選択します。</li><li>確認チェック後に新規登録します。</li><li>別タブに表示された登録結果JSONを転記画面へ貼り付けると、登録されたキャラシ倉庫URLを生成できます。</li></ol></section>
          <section class="transfer-help-block"><span class="transfer-help-step">既存更新</span><h3>既存のキャラシ倉庫データを更新する</h3><ol><li>転記画面で<b>「既存キャストを更新」</b>を選びます。</li><li>更新先の <code>edit.html?key=...</code> URLを入力します。</li><li>そのキャラシ倉庫データの編集パスワードを入力します。</li><li>確認チェック後に更新します。</li><li>更新先URLは転記画面からそのまま開けます。</li></ol></section>
          <section class="transfer-help-block transfer-help-block--caution"><h3>注意</h3><ul><li>編集パスワードはCAST ARCHIVEには保存しません。</li><li>既存更新では、指定したキャラシ倉庫データをCAST ARCHIVEの内容で上書きします。</li><li>パスワードが誤っている場合、キャラシ倉庫側で更新は行われません。</li><li>新規登録時は、別ドメインから返されるkeyを自動取得できないため、結果JSONを1回貼り付けてURLを生成します。</li></ul></section>
        </div>
      </div>`;
    return dialog;
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `.direct-transfer-button,.transfer-help-button{display:grid;min-width:92px;min-height:38px;align-content:center;gap:2px;padding:6px 9px;border:1px solid color-mix(in srgb,var(--color-accent,#22d3ee) 42%,var(--color-border,#35515c));background:color-mix(in srgb,var(--color-accent,#22d3ee) 7%,var(--color-surface,#0d1820));color:var(--color-accent,#22d3ee);font:700 .68rem/1 var(--font-data,monospace);text-align:left}.direct-transfer-button small,.transfer-help-button small{font-size:.48rem;letter-spacing:.08em;opacity:.65}.direct-transfer-button:hover,.direct-transfer-button:focus-visible,.transfer-help-button:hover,.transfer-help-button:focus-visible{border-color:var(--color-accent,#22d3ee);box-shadow:0 0 14px color-mix(in srgb,var(--color-accent,#22d3ee) 18%,transparent)}.direct-transfer-button:disabled{opacity:.45}.transfer-help-dialog{width:min(760px,calc(100vw - 24px));max-height:min(86vh,820px);padding:0;border:1px solid color-mix(in srgb,var(--color-accent,#22d3ee) 58%,transparent);background:var(--color-surface,#0d1820);color:var(--color-text,#d7e7eb);box-shadow:0 20px 70px rgb(0 0 0/60%),0 0 30px color-mix(in srgb,var(--color-accent,#22d3ee) 12%,transparent)}.transfer-help-dialog::backdrop{background:rgb(0 0 0/72%);backdrop-filter:blur(4px)}.transfer-help-shell{display:grid;max-height:inherit}.transfer-help-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 18px;border-bottom:1px solid color-mix(in srgb,var(--color-accent,#22d3ee) 34%,transparent);background:color-mix(in srgb,var(--color-accent,#22d3ee) 7%,var(--color-surface,#0d1820))}.transfer-help-header small{display:block;color:var(--color-accent,#22d3ee);font:700 .58rem/1 var(--font-data,monospace);letter-spacing:.16em}.transfer-help-header h2{margin:4px 0 0;font-size:1.15rem}.transfer-help-header button{display:flex;align-items:center;justify-content:center;width:34px;height:34px;padding:0;border:1px solid var(--color-border,#35515c);background:transparent;color:var(--color-text,#d7e7eb);font-size:1.25rem;line-height:1}.transfer-help-body{overflow:auto;padding:16px 18px 20px}.transfer-help-lead{padding:12px 14px;border-left:3px solid var(--color-accent,#22d3ee);background:color-mix(in srgb,var(--color-accent,#22d3ee) 6%,transparent)}.transfer-help-lead p{margin:7px 0 0}.transfer-help-block{position:relative;margin-top:14px;padding:13px 14px;border:1px solid color-mix(in srgb,var(--color-border,#35515c) 70%,transparent)}.transfer-help-block h3{margin:0 0 8px;color:var(--color-accent,#22d3ee);font-size:.9rem}.transfer-help-block ol,.transfer-help-block ul{margin:0;padding-left:1.35rem}.transfer-help-block li{margin:5px 0;line-height:1.5}.transfer-help-step{display:inline-block;margin-bottom:7px;padding:3px 6px;border:1px solid color-mix(in srgb,var(--color-accent,#22d3ee) 45%,transparent);color:var(--color-accent,#22d3ee);font:700 .58rem/1 var(--font-data,monospace);letter-spacing:.08em}.transfer-help-block--caution{border-color:color-mix(in srgb,#e4b95f 42%,var(--color-border,#35515c))}.transfer-help-block--caution h3{color:#e4b95f}.transfer-help-dialog code{padding:1px 4px;background:rgb(0 0 0/25%);font-family:var(--font-data,monospace);font-size:.84em}@media(max-width:640px){.transfer-help-dialog{width:calc(100vw - 12px);max-height:92vh}.transfer-help-body{padding:12px}.direct-transfer-button,.transfer-help-button{min-width:76px;padding-inline:6px}}`;
    document.head.append(style);
  }
})();