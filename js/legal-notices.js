const SOURCE_SITE_URL = "https://character-sheets.appspot.com/tnx/";
const RIGHTS_TEXT = "(C)FarEast Amusement Research Co.,Ltd.／(C)GameField Co.,Ltd.";

const TERMS_HTML = `
  <section id="legal-terms" class="legal-policy-section" data-legal-section="terms">
    <h2>利用規約 <small>TERMS OF USE</small></h2>
    <p>本サイトは『トーキョーN◎VA THE AXLERATION』の非公式ファンツールです。各権利者による公式サービスではなく、提携・承認・運営上の関係を有するものではありません。</p>
    <h3>1. 利用について</h3>
    <p>本サイトは、利用者が自身のキャスト情報を登録・編集・閲覧し、TRPGのプレイを補助する目的で提供します。法令、公序良俗、第三者の権利および各サービスの利用条件に反する利用を行わないでください。</p>
    <h3>2. 登録データと権利</h3>
    <p>キャスト名、設定、文章、画像その他の登録データについて、利用者は本サイトで保存・表示するために必要な権利または許諾を有するもののみ登録してください。公式画像や第三者の著作物を、必要な許諾なく登録・公開することは禁止します。</p>
    <p>権利侵害その他の問題が確認された場合、運営上必要な範囲で対象データの非公開化・削除等を行う場合があります。</p>
    <h3>3. データ取込・データ転記</h3>
    <p>本サイトのデータ取込・データ転記機能は、「トーキョーN◎VA THE AXLERATION Cast Profile DataBase（キャラクターシート倉庫）」に登録されたキャラクターデータを、利用者自身の操作により本サイトへ取り込む、または本サイトのキャストデータを同サイト形式へ転記するための補助機能です。</p>
    <p>転記元・転記先サイトのシステム、表示、コンテンツ等に関する権利は、それぞれの権利者に帰属します。本サイトは同サイトの運営者による公式サービスではなく、提携・承認・運営上の関係を有するものではありません。</p>
    <p>同サイトに登録された個々のキャラクター名、設定、画像、文章その他のデータについては、それぞれの投稿者・作成者等が有する権利を尊重し、利用者自身が利用可能なデータのみを取り込み・転記してください。</p>
    <p><a href="${SOURCE_SITE_URL}" target="_blank" rel="noopener noreferrer">キャラクターシート倉庫を開く</a></p>
    <h3>4. サービスの変更・停止</h3>
    <p>保守、障害対応、仕様変更その他の理由により、本サイトの機能を変更・停止する場合があります。重要なキャストデータは必要に応じて利用者自身でもバックアップしてください。</p>
    <h3>5. 免責</h3>
    <p>本サイトの利用、サービス停止、データ消失、外部サービスとの連携等によって生じた損害について、故意または重大な過失がある場合など法令上免責できない場合を除き、運営者は責任を負いません。</p>
    <h3>6. アカウント・データの削除</h3>
    <p>アカウントおよび登録データは、本サイトが提供する削除機能の範囲で削除できます。公開設定にした情報は、削除または非公開化するまで第三者から閲覧される場合があります。</p>
  </section>`;

const PRIVACY_HTML = `
  <section id="legal-privacy" class="legal-policy-section" data-legal-section="privacy">
    <h2>プライバシーポリシー <small>PRIVACY POLICY</small></h2>
    <p>本サイトでは、アカウント認証およびキャスト管理機能の提供に必要な範囲で情報を取り扱います。</p>
    <h3>取り扱う情報</h3>
    <ul>
      <li>アカウント認証に使用するメールアドレス、認証識別子その他の認証情報</li>
      <li>キャスト名、プロフィール、技能、アウトフィット、参加アクト等の登録情報</li>
      <li>利用者が登録したキャスト画像</li>
      <li>公開・非公開設定その他、サービス提供に必要な設定情報</li>
    </ul>
    <h3>利用目的</h3>
    <p>本人認証、キャストデータの保存・表示・編集、公開設定の反映、不具合対応、セキュリティ確保その他本サイトの提供・保守のために利用します。</p>
    <h3>外部サービス</h3>
    <p>本サイトは認証、データベース、ストレージ等の基盤としてSupabase等の外部サービスを利用します。これらのサービスでは、その提供に必要な範囲で情報が処理されます。</p>
    <h3>公開情報</h3>
    <p>利用者が「公開」に設定したキャスト情報および画像は、インターネット上で第三者から閲覧可能になります。非公開情報は、アプリのアクセス制御に従って取り扱います。</p>
    <h3>削除</h3>
    <p>利用者は、本サイトが提供する削除機能の範囲でキャストデータやアカウントを削除できます。法令上またはセキュリティ上保存が必要な情報がある場合を除き、削除処理に従って取り扱います。</p>
  </section>`;

function whenReady(callback) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", callback, { once: true });
  else callback();
}

function installStyles() {
  if (document.querySelector("#legal-notices-style")) return;
  const style = document.createElement("style");
  style.id = "legal-notices-style";
  style.textContent = `
    .site-legal-footer{margin:32px auto 16px;max-width:1180px;padding:16px 20px;border-top:1px solid color-mix(in srgb,currentColor 28%,transparent);font-size:12px;line-height:1.7;opacity:.82;text-align:center;position:relative;z-index:5}
    .site-legal-footer p{margin:2px 0}.site-legal-footer__links{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:8px}
    .site-legal-footer button{font:inherit;padding:3px 8px;min-height:auto}.legal-inline-notice{font-size:12px;line-height:1.65;opacity:.86;margin:8px 0}
    .legal-inline-notice--important{padding:10px 12px;border-left:3px solid currentColor;background:color-mix(in srgb,currentColor 5%,transparent)}
    .legal-consent{display:flex!important;align-items:flex-start;gap:8px;font-size:12px;line-height:1.6}.legal-consent input{width:auto!important;flex:0 0 auto;margin-top:.25em}
    .legal-consent__links{display:inline}.legal-consent__links button{display:inline!important;width:auto!important;min-height:auto!important;padding:0!important;border:0!important;background:none!important;text-decoration:underline!important;font:inherit!important;color:inherit!important}
    #site-legal-dialog{width:min(880px,calc(100vw - 32px));max-height:86vh;padding:0;border:1px solid currentColor;background:var(--surface,#10151a);color:inherit}
    #site-legal-dialog::backdrop{background:rgba(0,0,0,.68)}.legal-dialog__header{display:flex;align-items:center;justify-content:space-between;gap:16px;position:sticky;top:0;padding:14px 18px;border-bottom:1px solid color-mix(in srgb,currentColor 30%,transparent);background:inherit;z-index:2}
    .legal-dialog__header strong{font-size:16px}.legal-dialog__header button{min-width:auto}.legal-dialog__body{padding:18px 22px 28px;overflow:auto}.legal-dialog__tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px}.legal-dialog__tabs button{min-width:auto}
    .legal-policy-section{scroll-margin-top:80px}.legal-policy-section h2{margin:20px 0 12px}.legal-policy-section h3{margin:18px 0 6px;font-size:1em}.legal-policy-section p,.legal-policy-section li{line-height:1.8}.legal-policy-section small{display:block;opacity:.65;font-size:.68em}
    @media(max-width:700px){.site-legal-footer{margin-bottom:72px;padding-inline:14px}#site-legal-dialog{width:calc(100vw - 18px)}.legal-dialog__body{padding:14px}}
  `;
  document.head.append(style);
}

function installDialog() {
  let dialog = document.querySelector("#site-legal-dialog");
  if (dialog) return dialog;
  dialog = document.createElement("dialog");
  dialog.id = "site-legal-dialog";
  dialog.setAttribute("aria-labelledby", "site-legal-dialog-title");
  dialog.innerHTML = `
    <header class="legal-dialog__header"><strong id="site-legal-dialog-title">ヘルプ / サイトポリシー</strong><button type="button" data-legal-close>閉じる</button></header>
    <div class="legal-dialog__body">
      <nav class="legal-dialog__tabs" aria-label="サイトポリシー"><button type="button" data-open-legal="terms">利用規約</button><button type="button" data-open-legal="privacy">プライバシーポリシー</button></nav>
      ${TERMS_HTML}
      ${PRIVACY_HTML}
      <section class="legal-policy-section"><h2>権利表示 <small>RIGHTS NOTICE</small></h2><p>本サイトは『トーキョーN◎VA THE AXLERATION』の非公式ファンツールです。各権利者による公式サービスではありません。</p><p>${RIGHTS_TEXT}</p></section>
    </div>`;
  document.body.append(dialog);
  dialog.querySelector("[data-legal-close]")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
  return dialog;
}

function openPolicy(section = "terms") {
  const dialog = installDialog();
  if (!dialog.open) dialog.showModal();
  requestAnimationFrame(() => dialog.querySelector(`[data-legal-section="${section}"]`)?.scrollIntoView({ block: "start" }));
}

function bindPolicyButtons(root = document) {
  root.querySelectorAll("[data-open-legal]").forEach(button => {
    if (button.dataset.legalBound === "1") return;
    button.dataset.legalBound = "1";
    button.addEventListener("click", event => { event.preventDefault(); openPolicy(button.dataset.openLegal || "terms"); });
  });
}

function installFooter() {
  let footer = document.querySelector("footer.archive-copyright, footer.site-legal-footer, [data-legal-footer]");
  if (!footer) {
    footer = document.createElement("footer");
    document.body.append(footer);
  }
  footer.className = "site-legal-footer";
  footer.dataset.legalFooter = "1";
  footer.innerHTML = `<p>本サイトは『トーキョーN◎VA THE AXLERATION』の非公式ファンツールです。各権利者による公式サービスではありません。</p><p>${RIGHTS_TEXT}</p><div class="site-legal-footer__links"><button type="button" data-open-legal="terms">利用規約</button><button type="button" data-open-legal="privacy">ヘルプ・プライバシーポリシー</button></div>`;
  bindPolicyButtons(footer);
}

function installSignupConsent() {
  const form = document.querySelector("#signup-form");
  if (!form || form.querySelector("#signup-legal-consent")) return;
  const label = document.createElement("label");
  label.className = "legal-consent";
  label.innerHTML = `<input id="signup-legal-consent" name="legalConsent" type="checkbox" required><span><span class="legal-consent__links"><button type="button" data-open-legal="terms">利用規約</button>および<button type="button" data-open-legal="privacy">プライバシーポリシー</button></span>を確認し、同意してアカウントを登録します。</span>`;
  form.querySelector("button[type='submit']")?.before(label);
  bindPolicyButtons(label);
}

function installImageNotice() {
  const forms = [...document.querySelectorAll("#image-form, form")].filter(form => form.querySelector("input[type='file'][accept*='image']"));
  forms.forEach(form => {
    if (form.querySelector(".legal-image-rights-notice")) return;
    const note = document.createElement("p");
    note.className = "legal-inline-notice legal-inline-notice--important legal-image-rights-notice";
    note.textContent = "自身が使用・公開する権利を有する画像のみ登録してください。公式画像や第三者の著作物など、無断使用となる画像の登録はお控えください。";
    const guidance = form.querySelector(".image-guidance");
    if (guidance) guidance.append(note); else form.querySelector("input[type='file']")?.closest("label")?.after(note);
  });
}

function transferNoticeHtml(short = false) {
  if (short) return `キャラクターシート倉庫とのデータ取込・転記機能です。転記元・転記先サイトおよび登録データの権利を尊重し、自身が利用可能なデータのみ使用してください。詳細は <button type="button" data-open-legal="terms">利用規約</button> をご確認ください。`;
  return `本機能は「トーキョーN◎VA THE AXLERATION Cast Profile DataBase（キャラクターシート倉庫）」とのデータ取込・転記を補助する非公式機能です。本サイトと同サイトの運営者との間に提携・承認・運営上の関係はありません。個々の登録データの権利は各投稿者・作成者等に帰属します。<a href="${SOURCE_SITE_URL}" target="_blank" rel="noopener noreferrer">キャラクターシート倉庫</a>`;
}

function installTransferNotices() {
  const transferPage = document.querySelector(".transfer-page");
  if (transferPage && !transferPage.querySelector(".legal-transfer-notice")) {
    const note = document.createElement("p");
    note.className = "legal-inline-notice legal-inline-notice--important legal-transfer-notice";
    note.innerHTML = transferNoticeHtml(false);
    transferPage.querySelector(".lead")?.after(note);
  }

  const importButton = document.querySelector("#legacy-import-open");
  if (importButton && !document.querySelector(".legal-import-short-notice")) {
    const note = document.createElement("p");
    note.className = "legal-inline-notice legal-import-short-notice";
    note.innerHTML = transferNoticeHtml(true);
    importButton.after(note);
    bindPolicyButtons(note);
  }

  const importDialogForm = document.querySelector("#legacy-import-dialog form");
  if (importDialogForm && !importDialogForm.querySelector(".legal-import-dialog-notice")) {
    const note = document.createElement("p");
    note.className = "legal-inline-notice legal-inline-notice--important legal-import-dialog-notice";
    note.innerHTML = transferNoticeHtml(false);
    importDialogForm.querySelector("h2")?.after(note);
  }
}

function removeMasterTsvImportUi() {
  document.querySelector("#import-skd")?.remove();
  document.querySelector("#import-ofc")?.remove();
  document.querySelector("#tsv-dialog")?.remove();
}

function init() {
  installStyles();
  installDialog();
  installFooter();
  installSignupConsent();
  installImageNotice();
  installTransferNotices();
  removeMasterTsvImportUi();
  bindPolicyButtons(document);
}

whenReady(init);

globalThis.TNX_LEGAL = Object.freeze({ openPolicy });
