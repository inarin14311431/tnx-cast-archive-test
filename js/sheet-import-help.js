(()=>{
  const importButton=document.querySelector('#legacy-import-open');
  if(!importButton||document.querySelector('#sheet-import-help-button'))return;

  let control=importButton.closest('.sheet-import-control');
  if(!control){
    control=document.createElement('div');
    control.className='sheet-import-control';
    importButton.before(control);
    control.append(importButton);
  }

  const helpButton=document.createElement('button');
  helpButton.id='sheet-import-help-button';
  helpButton.className='sheet-import-help-button';
  helpButton.type='button';
  helpButton.dataset.sheetHelp='import';
  helpButton.setAttribute('aria-haspopup','dialog');
  helpButton.setAttribute('aria-controls','sheet-import-help-dialog');
  helpButton.innerHTML='<span>?</span><small>IMPORT HELP</small>';
  helpButton.title='データ取込・ブックマークレットの詳しい使い方';
  control.append(helpButton);

  const dialog=document.createElement('dialog');
  dialog.id='sheet-import-help-dialog';
  dialog.className='sheet-import-help-dialog';
  dialog.innerHTML=`
    <article class="sheet-import-help-shell">
      <header class="sheet-import-help-header">
        <div><p>DATA IMPORT GUIDE</p><h2>データ取込ヘルプ <small>BOOKMARKLET / JSON IMPORT</small></h2></div>
        <button type="button" class="sheet-import-help-close" aria-label="ヘルプを閉じる">×</button>
      </header>
      <div class="sheet-import-help-body">
        <section class="sheet-import-help-lead">
          <strong>キャラシ倉庫の既存キャストを、この編集画面へ移すための機能です。</strong>
          <p>元ページからJSONを取得し、この画面へ反映します。反映しただけではDBに保存されません。内容を確認してから、左側の「保存」を押してください。</p>
        </section>

        <section>
          <h3><b>01</b> データ取込を開く</h3>
          <p>左側の「データ取込」を押し、「キャラシ倉庫JSON取込」画面を開きます。</p>
        </section>

        <section>
          <h3><b>02</b> ブックマークレットをコピー</h3>
          <p>取込画面の「ブックマークレットをコピー」を押します。これはキャラシ倉庫のページから入力内容をJSONとして取り出すための小さなJavaScriptです。</p>
          <div class="sheet-import-help-callout">
            <strong>ブックマークレットとは</strong>
            <p>普通のURLの代わりにJavaScriptを登録したブラウザのブックマークです。キャラシ倉庫のキャストページを開いた状態で実行すると、そのページの入力内容を読み取ります。</p>
          </div>
        </section>

        <section>
          <h3><b>03</b> ブラウザへ登録</h3>
          <ol>
            <li>ブラウザで新しいブックマークを1件作ります。</li>
            <li>名前は「N◎VAキャスト取込」など、分かりやすいもので構いません。</li>
            <li>ブックマークのURL欄を編集し、先ほどコピーした内容をそのまま貼り付けます。</li>
            <li>保存します。この登録は最初の1回だけで構いません。</li>
          </ol>
          <p class="sheet-import-help-note">URL欄の内容は <code>javascript:</code> から始まります。途中を編集せず、そのまま登録してください。</p>
        </section>

        <section>
          <h3><b>04</b> キャラシ倉庫で実行</h3>
          <ol>
            <li>取り込みたいキャストのキャラシ倉庫ページを開きます。</li>
            <li>ページを開いた状態で、登録した「N◎VAキャスト取込」ブックマークを実行します。</li>
            <li>成功すると「キャラシJSONをコピーしました。」と表示され、JSONがクリップボードへ入ります。</li>
            <li>クリップボードへのコピーが使えない場合は、JSONを手動コピーするための画面が表示されます。</li>
          </ol>
        </section>

        <section>
          <h3><b>05</b> JSONを貼り付けて反映</h3>
          <ol>
            <li>このアプリへ戻り、「データ取込」を開きます。</li>
            <li>大きな入力欄へコピーしたJSONを貼り付けます。</li>
            <li>「編集画面へ反映」を押します。</li>
            <li>プロフィール、スタイル、能力値、技能、アウトフィットなどが正しく入っているか確認します。</li>
          </ol>
        </section>

        <section class="sheet-import-help-important">
          <h3><b>06</b> 最後に保存</h3>
          <p><strong>取込直後はまだDBへ保存されていません。</strong>内容に問題がなければ、左側の「保存」を押して確定してください。</p>
        </section>

        <section>
          <h3>うまくいかない場合</h3>
          <dl class="sheet-import-help-troubleshooting">
            <div><dt>ブックマークを押しても何も起きない</dt><dd>登録したブックマークのURLが <code>javascript:</code> から始まっているか確認してください。通常のWebページURLとして登録されている場合は動作しません。</dd></div>
            <div><dt>JSONがコピーされない</dt><dd>ブラウザがクリップボード操作を許可しなかった場合、手動コピー用の入力画面へ切り替わります。表示されたJSONをすべてコピーしてください。</dd></div>
            <div><dt>別のキャストの内容になった</dt><dd>ブックマークレットは、実行した時点で開いているキャラシ倉庫ページを読み取ります。対象キャストのページを開いてから実行してください。</dd></div>
            <div><dt>一部の項目が想定と違う</dt><dd>取込は元データを現在の編集形式へ変換して反映します。反映後に編集画面で確認・修正してから保存してください。</dd></div>
          </dl>
        </section>
      </div>
      <footer><button type="button" class="sheet-import-help-done">閉じる <small>CLOSE GUIDE</small></button></footer>
    </article>`;
  document.body.append(dialog);

  const openHelp=()=>{
    if(typeof dialog.showModal==='function')dialog.showModal();
    else dialog.setAttribute('open','');
  };
  const closeHelp=()=>dialog.close?.();

  helpButton.addEventListener('click',openHelp);
  dialog.querySelector('.sheet-import-help-close').addEventListener('click',closeHelp);
  dialog.querySelector('.sheet-import-help-done').addEventListener('click',closeHelp);
  dialog.addEventListener('click',event=>{
    if(event.target===dialog)closeHelp();
  });
})();
