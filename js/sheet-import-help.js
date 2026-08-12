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
  helpButton.innerHTML='<span>?</span><small>IMPORT<br>HELP</small>';
  helpButton.title='データ取込・ブックマークレットの詳しい使い方';
  control.append(helpButton);

  const dialog=document.createElement('dialog');
  dialog.id='sheet-import-help-dialog';
  dialog.className='sheet-import-help-dialog';
  dialog.innerHTML=`
    <article class="sheet-import-help-shell">
      <header class="sheet-import-help-header">
        <div><p>DATA IMPORT GUIDE</p><h2>データ取込ヘルプ <small>IMPORT HELP / BOOKMARKLET GUIDE</small></h2></div>
        <button type="button" class="sheet-import-help-close" aria-label="ヘルプを閉じる">×</button>
      </header>
      <div class="sheet-import-help-body">
        <section class="sheet-import-help-lead">
          <strong>キャラシ倉庫からデータを取り込み、このアプリのキャストとして保存する手順です。</strong>
          <p>元ページからJSONを取得し、編集画面へ反映します。取込だけではDBへ保存されないため、最後に内容を確認してキャストを保存してください。</p>
        </section>

        <div class="sheet-import-help-flow">
          <section><h3><b>01</b> データ取込画面を開く</h3><p>編集画面左側の「データ取込」を押し、「キャラシ倉庫JSON取込」画面を開きます。</p></section>
          <section><h3><b>02</b> 「ブックマークレットをコピー」を押す</h3><p>取込画面にあるボタンを押すと、ブックマークレット用のコードがクリップボードへコピーされます。</p></section>
          <section><h3><b>03</b> ブックマークレットとは</h3><p>ブラウザのブックマークにJavaScriptを登録し、開いているページの入力内容を取得する仕組みです。</p><div class="sheet-import-help-callout"><strong>登録は最初の1回だけ</strong><p>一度登録しておけば、次回以降はキャラシ倉庫の対象ページでそのブックマークを押すだけで利用できます。</p></div></section>
          <section><h3><b>04</b> ブラウザのブックマークへ登録</h3><p>コピーした内容を、新しいブックマークのURL欄へ貼り付けて保存します。URLは <code>javascript:</code> から始まります。</p></section>
          <section><h3><b>05</b> キャラシ倉庫の対象キャストを開く</h3><p>取り込みたいキャストの編集ページを開き、入力内容が表示された状態にします。</p></section>
          <section><h3><b>06</b> 登録したブックマークレットを実行</h3><p>対象キャストを開いたまま、先ほど登録したブックマークを押します。ページ内の入力項目を読み取り、JSONを生成します。</p></section>
          <section><h3><b>07</b> JSONがクリップボードへコピーされる</h3><p>成功すると「キャラシJSONをコピーしました。」と表示されます。クリップボードへコピーできない環境では、手動コピー用の画面が表示されます。</p></section>
          <section><h3><b>08</b> このアプリへJSONを貼り付ける</h3><p>このアプリへ戻り、「データ取込」を開いて大きな入力欄へJSONを貼り付けます。</p></section>
          <section><h3><b>09</b> 「編集画面へ反映」を押す</h3><p>貼り付けたJSONを解析し、プロフィール、スタイル、能力値、技能、アウトフィット等を編集画面へ反映します。</p></section>
          <section class="sheet-import-help-important"><h3><b>10</b> 内容確認後、キャストを保存</h3><p><strong>取込直後はまだDBへ保存されていません。</strong>各項目を確認し、必要に応じて修正してから左側の「保存」を押してください。</p></section>
        </div>

        <div class="sheet-import-help-side">
          <section>
            <h3>ブックマークレットの登録方法（Chrome例）</h3>
            <ol>
              <li>「ブックマークレットをコピー」を押す</li>
              <li>ブラウザのブックマークバーを表示する</li>
              <li>ブックマークバーを右クリックし「ページを追加」</li>
              <li>名前を入力（例：キャラシ倉庫取込）</li>
              <li>URL欄へコピー内容を貼り付ける</li>
              <li>保存して登録完了</li>
            </ol>
            <p class="sheet-import-help-note">Edge / Firefox / Safariでも、ブックマークのURLを編集できる場合は同様に登録できます。</p>
          </section>

          <section><h3>ブックマークレットが動かない場合</h3><dl class="sheet-import-help-troubleshooting"><div><dt>対象ページを確認</dt><dd>キャラシ倉庫の対象キャストページを開いた状態で実行してください。他サイトや空のページでは動作しません。</dd></div><div><dt>URL欄を確認</dt><dd>登録したブックマークのURLが <code>javascript:</code> から始まっているか確認してください。</dd></div><div><dt>ページ読込後に実行</dt><dd>ページの入力欄がすべて表示されてから実行してください。</dd></div></dl></section>

          <section><h3>JSONがコピーされない場合</h3><dl class="sheet-import-help-troubleshooting"><div><dt>クリップボード制限</dt><dd>ブラウザが書き込みを制限した場合は、手動コピー用の入力画面が表示されます。表示されたJSONをすべてコピーしてください。</dd></div><div><dt>成功表示後も貼り付けできない</dt><dd>ページを再読み込みし、対象キャストを確認してからもう一度ブックマークレットを実行してください。</dd></div></dl></section>

          <section><h3>別キャストを取得した場合</h3><p>ブックマークレットは実行時に開いているページを読み取ります。対象キャストのページへ移動してから再実行してください。</p></section>
          <section><h3>一部の項目が想定と違う場合</h3><p>キャラシ倉庫と本アプリでは入力形式や項目名が異なるため、完全一致しない場合があります。取込後に編集画面で内容を確認し、必要箇所だけ修正してください。</p></section>
        </div>
      </div>
      <footer><p class="sheet-import-help-footer-note">データ取込は補助機能です。反映内容を確認してからキャストを保存してください。</p><button type="button" class="sheet-import-help-done">閉じる <small>CLOSE GUIDE</small></button></footer>
    </article>`;
  document.body.append(dialog);

  const openHelp=()=>{if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');};
  const closeHelp=()=>dialog.close?.();
  helpButton.addEventListener('click',openHelp);
  dialog.querySelector('.sheet-import-help-close').addEventListener('click',closeHelp);
  dialog.querySelector('.sheet-import-help-done').addEventListener('click',closeHelp);
  dialog.addEventListener('click',event=>{if(event.target===dialog)closeHelp();});
})();
