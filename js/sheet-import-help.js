(()=>{
  const importButton=document.querySelector('#legacy-import-open');
  if(!importButton||document.querySelector('#sheet-import-help-button'))return;

  let control=importButton.closest('.sheet-import-control');
  if(!control){
    control=document.createElement('section');
    control.className='sheet-import-control';
    importButton.before(control);
    control.append(importButton);
  }
  control.classList.add('sheet-import-panel');

  importButton.classList.add('sheet-import-main-action');
  importButton.innerHTML='<span>データ取込</span><small>IMPORT DATA</small>';

  const helpButton=document.createElement('button');
  helpButton.id='sheet-import-help-button';
  helpButton.className='sheet-import-help-button';
  helpButton.type='button';
  helpButton.dataset.sheetHelp='import';
  helpButton.setAttribute('aria-haspopup','dialog');
  helpButton.setAttribute('aria-controls','sheet-import-help-dialog');
  helpButton.innerHTML='<span class="sheet-import-help-mark">?</span><small>IMPORT<br>HELP</small>';
  helpButton.title='データ取込・ブックマークレットの詳しい使い方';

  const description=document.createElement('p');
  description.className='sheet-import-panel__description';
  description.innerHTML='キャラシ倉庫のデータを<br>このキャストに取り込みます';

  const copyButton=document.createElement('button');
  copyButton.id='sheet-import-bookmarklet-copy';
  copyButton.className='sheet-import-bookmarklet-copy';
  copyButton.type='button';
  copyButton.innerHTML='<span class="sheet-import-bookmark-icon" aria-hidden="true"></span><span>ブックマークレットをコピー<small>COPY BOOKMARKLET</small></span>';
  copyButton.title='キャラシ倉庫用ブックマークレットをコピー';

  control.append(helpButton,description,copyButton);

  copyButton.addEventListener('click',()=>{
    const source=document.querySelector('#legacy-bookmarklet-copy');
    if(!source){
      window.alert('ブックマークレットを準備できませんでした。データ取込画面を開いてから再度お試しください。');
      return;
    }
    source.click();
  });

  const dialog=document.createElement('dialog');
  dialog.id='sheet-import-help-dialog';
  dialog.className='sheet-import-help-dialog';
  dialog.innerHTML=`
    <article class="sheet-import-help-shell">
      <header class="sheet-import-help-header">
        <div><h2>データ取込ヘルプ</h2><small>IMPORT HELP</small></div>
        <button type="button" class="sheet-import-help-close" aria-label="ヘルプを閉じる">×</button>
      </header>
      <p class="sheet-import-help-intro">キャラシ倉庫からデータを取り込み、このアプリのキャストとして保存する手順を説明します。</p>
      <div class="sheet-import-help-body">
        <div class="sheet-import-help-flow">
          <section><h3><b>1</b> データ取込画面を開く</h3><p>編集画面左側の「データ取込」を押し、「キャラシ倉庫JSON取込」を開きます。</p></section>
          <section><h3><b>2</b> 「ブックマークレットをコピー」をクリック</h3><p>ブックマークレットのコードがクリップボードへコピーされます。</p></section>
          <section><h3><b>3</b> ブックマークレットとは？</h3><p>ブラウザのブックマークに登録して、開いているページからデータを取得するための小さなプログラムです。</p></section>
          <section><h3><b>4</b> ブラウザのブックマークへ登録</h3><p>コピーしたブックマークレットを、新しいブックマークのURL欄へ貼り付けて保存します。登録は最初の1回だけです。</p></section>
          <section><h3><b>5</b> キャラシ倉庫の対象キャストページを開く</h3><p>取り込みたいキャストのページを開き、入力内容が表示された状態にします。</p></section>
          <section><h3><b>6</b> ブックマークレットを実行</h3><p>登録したブックマークをクリックします。ページ内の入力値を読み取り、JSONデータを生成します。</p></section>
          <section><h3><b>7</b> JSONがクリップボードへコピー</h3><p>「キャラシJSONをコピーしました。」と表示されたら、JSONデータがクリップボードへコピーされています。</p></section>
          <section><h3><b>8</b> このアプリへ貼り付け</h3><p>このアプリへ戻り、「データ取込」の入力欄へJSONを貼り付けます。</p></section>
          <section><h3><b>9</b> 「編集画面へ反映」をクリック</h3><p>貼り付けたデータが、プロフィール・スタイル・能力値・技能・アウトフィット等へ反映されます。</p></section>
          <section><h3><b>10</b> 内容を確認して、キャストを保存</h3><p>反映内容を確認し、必要に応じて修正したうえで、最後に左側の「保存」を押してください。</p></section>
        </div>
        <aside class="sheet-import-help-side">
          <section>
            <h3>ブックマークレットの登録方法（Chrome の例）</h3>
            <ol>
              <li>「ブックマークレットをコピー」をクリック</li>
              <li>ブックマークマネージャーを表示（Ctrl+Shift+B）</li>
              <li>ブックマークバーで右クリック → 「ページを追加」</li>
              <li>名前を入力（例：キャラシ倉庫取込）</li>
              <li>URL欄へ貼り付け（Ctrl+V）</li>
              <li>「保存」をクリックして登録完了</li>
            </ol>
            <p>Edge / Firefox / Safari でも、ブックマークのURLを編集できる場合は同様に登録できます。</p>
          </section>
          <section><h3>ブックマークレットが動かない場合</h3><ul><li>キャラシ倉庫の対象キャストページで開いているか確認してください。</li><li>ブックマークのURLが <code>javascript:</code> から始まっているか確認してください。</li><li>ページの読み込みが完了した状態で実行してください。</li></ul></section>
          <section><h3>JSONがコピーされない場合</h3><ul><li>ブラウザがクリップボードへの書き込みをブロックする場合があります。</li><li>手動コピー用の画面が表示された場合は、表示されたJSONをすべてコピーしてください。</li><li>成功表示後も貼り付けできない場合は、ページを再読み込みして再実行してください。</li></ul></section>
          <section><h3>別キャストを取得してしまった場合</h3><p>キャラシ倉庫を開き直し、対象キャストのページで再度ブックマークレットを実行してください。</p></section>
          <section><h3>一部の項目が想定と違う場合</h3><p>キャラシ倉庫と本アプリでは入力形式や名称が異なるため、完全一致しない場合があります。取込後に編集画面で内容を確認し、必要に応じて調整してください。</p></section>
        </aside>
      </div>
      <footer><p>ⓘ データ取込はあくまで補助機能です。反映内容は必ず確認し、最後にキャストを保存してください。</p></footer>
    </article>`;
  document.body.append(dialog);

  const openHelp=()=>{if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');};
  const closeHelp=()=>dialog.close?.();
  helpButton.addEventListener('click',openHelp);
  dialog.querySelector('.sheet-import-help-close').addEventListener('click',closeHelp);
  dialog.addEventListener('click',event=>{if(event.target===dialog)closeHelp();});
})();
