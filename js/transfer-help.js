(() => {
  if (window.__tnxTransferHelpLoaded) return;
  window.__tnxTransferHelpLoaded = true;

  const STYLE_ID = "transfer-help-style";
  const DIALOG_ID = "transfer-help-dialog";
  const BUTTON_ID = "transfer-help-button";

  ensureStyles();
  const observer = new MutationObserver(install);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  install();
  window.setTimeout(() => observer.disconnect(), 12000);

  function install() {
    const tsv = document.querySelector("#transfer-tsv-copy-button");
    const bm = document.querySelector("#transfer-bookmarklet-copy-button");
    if (!tsv || !bm) return false;
    if (document.querySelector(`#${BUTTON_ID}`)) return true;

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.className = "transfer-help-button";
    button.innerHTML = "<span>転記HELP</span><small>TRANSFER GUIDE</small>";
    button.title = "転記TSV／転記BMの使い方";
    bm.insertAdjacentElement("afterend", button);

    const dialog = createDialog();
    document.body.append(dialog);

    button.addEventListener("click", () => {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    });
    dialog.addEventListener("click", event => {
      if (event.target === dialog || event.target.closest("[data-transfer-help-close]")) dialog.close?.();
    });
    dialog.addEventListener("cancel", () => dialog.close?.());
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
          <div><small>TRANSFER GUIDE</small><h2 id="transfer-help-title">転記TSV／転記BM</h2></div>
          <button type="button" data-transfer-help-close aria-label="閉じる">×</button>
        </header>
        <div class="transfer-help-body">
          <section class="transfer-help-lead">
            <strong>キャストデータを転記先のキャラクターシート編集画面へ移すための機能です。</strong>
            <p><b>転記TSV</b>がキャストデータ本体、<b>転記BM</b>がそのデータを転記先へ流し込むためのブックマークレットです。</p>
            <p class="transfer-help-mobile-warning"><b>この転記機能はスマートフォンには対応していません。PCブラウザで使用してください。</b></p>
          </section>

          <section class="transfer-help-block transfer-help-block--setup">
            <span class="transfer-help-step">初回のみ</span>
            <h3>転記BMをブラウザへ登録</h3>
            <ol>
              <li><b>「転記BM」</b>を押してブックマークレットをコピーします。</li>
              <li>ブラウザで適当なページをブックマーク登録し、ブックマークの編集画面を開きます。</li>
              <li>ブックマークのURL欄をすべて消し、コピーした <code>javascript:...</code> を貼り付けて保存します。</li>
              <li>名前は「N◎VA転記」など、分かりやすいものにしておくと便利です。</li>
            </ol>
            <p class="transfer-help-note">転記BMは一度登録すれば、通常はキャストごとに作り直す必要はありません。</p>
          </section>

          <section class="transfer-help-block transfer-help-block--use">
            <span class="transfer-help-step">転記するたび</span>
            <h3>転記TSV → 転記BMの順に実行</h3>
            <ol>
              <li>このキャスト画面で<b>「転記TSV」</b>を押します。現在のキャストデータがクリップボードへコピーされます。</li>
              <li>転記先の<b>キャラクターシート編集画面</b>を開きます。</li>
              <li>先ほど登録した<b>「N◎VA転記」ブックマーク</b>を実行します。</li>
              <li>転記処理が始まり、基本情報・スタイル・能力値／制御値・技能・アウトフィットが入力されます。</li>
              <li>転記後は内容を確認し、転記先サイト側で必要な保存操作を行ってください。</li>
            </ol>
          </section>

          <section class="transfer-help-grid">
            <article>
              <h3>転記TSV</h3>
              <p>キャストの転記用データをクリップボードへコピーします。保存済みのキャストで利用できます。</p>
              <p>編集画面では、画面上で現在入力している内容をもとにTSVを生成します。</p>
            </article>
            <article>
              <h3>転記BM</h3>
              <p>転記先で実行するブックマークレットをコピーします。キャストデータそのものではありません。</p>
              <p>コピーした文字列は、転記先の入力欄ではなく<b>ブラウザのブックマークURL欄</b>へ登録します。</p>
            </article>
          </section>

          <section class="transfer-help-block transfer-help-block--caution">
            <h3>うまく動かない場合</h3>
            <ul>
              <li>先に「転記TSV」を押してから、転記先でBMを実行してください。</li>
              <li>ブックマークURLの先頭が <code>javascript:</code> のまま保存されていることを確認してください。</li>
              <li>新規キャストで転記TSVが押せない場合は、先にキャストを保存してください。</li>
              <li>コンボ／技能カウンターとキャスト画像は、この転記TSVの対象外です。</li>
              <li>スマートフォンでは転記機能を使用できません。PCブラウザで実行してください。</li>
            </ul>
          </section>
        </div>
      </div>`;
    return dialog;
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .transfer-help-button{display:grid;min-width:92px;min-height:38px;align-content:center;gap:2px;padding:6px 9px;border:1px solid color-mix(in srgb,var(--color-accent,#22d3ee) 42%,var(--color-border,#35515c));background:color-mix(in srgb,var(--color-accent,#22d3ee) 7%,var(--color-surface,#0d1820));color:var(--color-accent,#22d3ee);font:700 .68rem/1 var(--font-data,monospace);text-align:left}.transfer-help-button small{font-size:.48rem;letter-spacing:.08em;opacity:.65}.transfer-help-button:hover,.transfer-help-button:focus-visible{border-color:var(--color-accent,#22d3ee);box-shadow:0 0 14px color-mix(in srgb,var(--color-accent,#22d3ee) 18%,transparent)}
      .transfer-help-dialog{width:min(760px,calc(100vw - 24px));max-height:min(86vh,820px);padding:0;border:1px solid color-mix(in srgb,var(--color-accent,#22d3ee) 58%,transparent);background:var(--color-surface,#0d1820);color:var(--color-text,#d7e7eb);box-shadow:0 20px 70px rgb(0 0 0/60%),0 0 30px color-mix(in srgb,var(--color-accent,#22d3ee) 12%,transparent)}.transfer-help-dialog::backdrop{background:rgb(0 0 0/72%);backdrop-filter:blur(4px)}.transfer-help-shell{display:grid;max-height:inherit}.transfer-help-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 18px;border-bottom:1px solid color-mix(in srgb,var(--color-accent,#22d3ee) 34%,transparent);background:color-mix(in srgb,var(--color-accent,#22d3ee) 7%,var(--color-surface,#0d1820))}.transfer-help-header small{display:block;color:var(--color-accent,#22d3ee);font:700 .58rem/1 var(--font-data,monospace);letter-spacing:.16em}.transfer-help-header h2{margin:4px 0 0;font-size:1.15rem}.transfer-help-header button{width:34px;height:34px;border:1px solid var(--color-border,#35515c);background:transparent;color:var(--color-text,#d7e7eb);font-size:1.25rem}.transfer-help-body{overflow:auto;padding:16px 18px 20px}.transfer-help-lead{padding:12px 14px;border-left:3px solid var(--color-accent,#22d3ee);background:color-mix(in srgb,var(--color-accent,#22d3ee) 6%,transparent)}.transfer-help-lead p{margin:7px 0 0}.transfer-help-mobile-warning{padding:7px 9px;border:1px solid color-mix(in srgb,#e4b95f 48%,transparent);background:color-mix(in srgb,#e4b95f 8%,transparent);color:#e4b95f}.transfer-help-block{position:relative;margin-top:14px;padding:13px 14px;border:1px solid color-mix(in srgb,var(--color-border,#35515c) 70%,transparent)}.transfer-help-block h3,.transfer-help-grid h3{margin:0 0 8px;color:var(--color-accent,#22d3ee);font-size:.9rem}.transfer-help-block ol,.transfer-help-block ul{margin:0;padding-left:1.35rem}.transfer-help-block li{margin:5px 0;line-height:1.5}.transfer-help-step{display:inline-block;margin-bottom:7px;padding:3px 6px;border:1px solid color-mix(in srgb,var(--color-accent,#22d3ee) 45%,transparent);color:var(--color-accent,#22d3ee);font:700 .58rem/1 var(--font-data,monospace);letter-spacing:.08em}.transfer-help-note{margin:10px 0 0;color:var(--color-muted,#8da4ad);font-size:.78rem}.transfer-help-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.transfer-help-grid article{padding:12px 14px;border:1px solid color-mix(in srgb,var(--color-border,#35515c) 70%,transparent);background:rgb(255 255 255/2%)}.transfer-help-grid p{margin:5px 0;font-size:.8rem;line-height:1.5}.transfer-help-block--caution{border-color:color-mix(in srgb,#e4b95f 42%,var(--color-border,#35515c))}.transfer-help-block--caution h3{color:#e4b95f}.transfer-help-dialog code{padding:1px 4px;background:rgb(0 0 0/25%);font-family:var(--font-data,monospace);font-size:.84em}@media(max-width:640px){.transfer-help-dialog{width:calc(100vw - 12px);max-height:92vh}.transfer-help-body{padding:12px}.transfer-help-grid{grid-template-columns:1fr}.transfer-help-button{min-width:76px;padding-inline:6px}}
    `;
    document.head.append(style);
  }
})();
