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

  const steps=[
    {title:'データ取込画面を開く',body:'編集画面左側の「データ取込」を押して、「キャラシ倉庫JSON取込」を開きます。',sideTitle:'最初に行うこと',side:'この時点ではキャストデータはまだ変更されません。まず取込用の画面を開くだけです。'},
    {title:'ブックマークレットをコピー',body:'「ブックマークレットをコピー」を押します。キャラシ倉庫からデータを取得するためのコードがクリップボードへコピーされます。',sideTitle:'ブックマークレットとは？',side:'ブラウザのブックマークにJavaScriptを登録し、開いているキャラシ倉庫ページの入力内容を取得する仕組みです。通常のURLとは異なり、javascript: から始まります。'},
    {title:'ブックマークレットを登録',body:'コピーした内容を、ブラウザの新しいブックマークのURL欄へそのまま貼り付けて保存します。登録は最初の1回だけです。',sideTitle:'Chromeでの登録例',side:'① ブックマークバーを表示 → ② 右クリックして「ページを追加」 → ③ 名前を「キャラシ倉庫取込」などにする → ④ URL欄へ貼り付け → ⑤ 保存。Edge / Firefox / SafariでもURLを編集できれば同様です。'},
    {title:'キャラシ倉庫の対象キャストを開く',body:'取り込みたいキャストのページをキャラシ倉庫で開きます。入力内容が表示された状態までページの読み込みを待ちます。',sideTitle:'対象ページを確認',side:'ブックマークレットは「実行した時点で開いているページ」を読み取ります。別キャストを開いていると、そのキャストのデータを取得します。'},
    {title:'ブックマークレットを実行',body:'対象キャストのページを開いたまま、登録した「キャラシ倉庫取込」ブックマークをクリックします。',sideTitle:'動かない場合',side:'対象キャストページで実行しているか、ブックマークのURLが javascript: から始まっているか、ページの読み込みが完了しているかを確認してください。'},
    {title:'JSONをコピー',body:'成功すると「キャラシJSONをコピーしました。」と表示され、キャストデータがJSONとしてクリップボードへコピーされます。',sideTitle:'コピーされない場合',side:'ブラウザがクリップボード書き込みを制限した場合は、手動コピー用の画面が表示されます。表示されたJSONをすべてコピーしてください。'},
    {title:'このアプリへ戻る',body:'キャスト管理アプリへ戻り、再び「データ取込」を開きます。',sideTitle:'ここまでの流れ',side:'キャラシ倉庫側での作業はここまでです。以降はこのアプリ側でJSONを取り込みます。'},
    {title:'JSONを貼り付ける',body:'「キャラシ倉庫JSON取込」の大きな入力欄へ、コピーしたJSONをそのまま貼り付けます。',sideTitle:'貼り付け時の注意',side:'JSONの一部だけを抜き出したり編集したりせず、コピーされた内容をそのまま貼り付けてください。'},
    {title:'編集画面へ反映',body:'「編集画面へ反映」を押します。プロフィール、スタイル、能力値、技能、アウトフィットなどへデータが反映されます。',sideTitle:'反映結果を確認',side:'キャラシ倉庫と本アプリでは項目名や形式が異なるため、完全一致しない場合があります。特に技能名・アウトフィット・詳細欄は確認してください。'},
    {title:'確認してキャストを保存',body:'反映された内容を確認し、必要な箇所を修正したうえで、最後に左側の「保存」を押します。',sideTitle:'重要',side:'「編集画面へ反映」しただけではDBには保存されていません。内容確認後に保存して、初めて取込が完了します。'}
  ];

  const dialog=document.createElement('dialog');
  dialog.id='sheet-import-help-dialog';
  dialog.className='sheet-import-help-dialog';
  dialog.innerHTML=`
    <article class="sheet-import-help-shell">
      <header class="sheet-import-help-header">
        <div><h2>データ取込ヘルプ</h2><small>IMPORT HELP</small></div>
        <button type="button" class="sheet-import-help-close" aria-label="ヘルプを閉じる">×</button>
      </header>
      <p class="sheet-import-help-intro">全体は10ステップです。番号を順番に追うと、必要な内容だけ表示されます。</p>
      <nav class="sheet-import-help-progress" aria-label="データ取込手順">
        ${steps.map((step,index)=>`<button type="button" data-import-step="${index}" aria-label="手順${index+1} ${escapeHtml(step.title)}"><b>${index+1}</b><span>${escapeHtml(shortTitle(step.title))}</span></button>`).join('')}
      </nav>
      <main class="sheet-import-help-stage">
        <section class="sheet-import-help-step-card">
          <p class="sheet-import-help-step-kicker">STEP <span data-import-step-number>1</span> / 10</p>
          <h3 data-import-step-title></h3>
          <p class="sheet-import-help-step-body" data-import-step-body></p>
        </section>
        <aside class="sheet-import-help-context">
          <span>POINT</span>
          <h4 data-import-side-title></h4>
          <p data-import-side-body></p>
        </aside>
      </main>
      <footer class="sheet-import-help-footer">
        <button type="button" data-import-prev>← 前へ <small>PREV</small></button>
        <p>反映内容は必ず確認し、最後にキャストを保存してください。</p>
        <button type="button" data-import-next>次へ → <small>NEXT</small></button>
      </footer>
    </article>`;
  document.body.append(dialog);

  let currentStep=0;
  const progress=[...dialog.querySelectorAll('[data-import-step]')];
  const prev=dialog.querySelector('[data-import-prev]');
  const next=dialog.querySelector('[data-import-next]');

  function renderStep(index){
    currentStep=Math.max(0,Math.min(steps.length-1,index));
    const step=steps[currentStep];
    dialog.querySelector('[data-import-step-number]').textContent=String(currentStep+1);
    dialog.querySelector('[data-import-step-title]').textContent=step.title;
    dialog.querySelector('[data-import-step-body]').textContent=step.body;
    dialog.querySelector('[data-import-side-title]').textContent=step.sideTitle;
    dialog.querySelector('[data-import-side-body]').textContent=step.side;
    progress.forEach((button,i)=>{
      const active=i===currentStep;
      const done=i<currentStep;
      button.classList.toggle('is-active',active);
      button.classList.toggle('is-done',done);
      if(active)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
    });
    prev.disabled=currentStep===0;
    next.disabled=currentStep===steps.length-1;
    next.innerHTML=currentStep===steps.length-2?'最後へ → <small>FINAL</small>':'次へ → <small>NEXT</small>';
  }

  progress.forEach(button=>button.addEventListener('click',()=>renderStep(Number(button.dataset.importStep))));
  prev.addEventListener('click',()=>renderStep(currentStep-1));
  next.addEventListener('click',()=>renderStep(currentStep+1));

  const openHelp=()=>{
    renderStep(0);
    if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
  };
  const closeHelp=()=>dialog.close?.();
  helpButton.addEventListener('click',openHelp);
  dialog.querySelector('.sheet-import-help-close').addEventListener('click',closeHelp);
  dialog.addEventListener('click',event=>{if(event.target===dialog)closeHelp();});

  function shortTitle(value){
    return String(value).replace('ブックマークレット','BM').replace('キャラシ倉庫の','').replace('キャストを','').replace('編集画面へ','').slice(0,8);
  }
  function escapeHtml(value){
    return String(value??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
})();
