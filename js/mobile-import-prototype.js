(()=>{
  const $=selector=>document.querySelector(selector);
  const source=$('#source-json');
  const target=$('#target-id');
  const apply=$('#apply-mobile-import');
  const openEditor=$('#open-editor');
  const frame=$('#editor-frame');
  const frameWrap=$('#editor-frame-wrap');
  const copyExtractor=$('#copy-extractor');
  const extractorStatus=$('#extractor-status');
  const jsonStatus=$('#json-status');
  const applyStatus=$('#apply-status');
  let editorUrl='';

  const EXTRACTOR=`const label=e=>{const id=e.id;const l=id&&document.querySelector('label[for="'+CSS.escape(id)+'"]');return(l?.innerText||e.closest('label')?.innerText||e.closest('th,td')?.innerText||'').trim()};const section=e=>{let n=e;while(n&&n!==document.body){const h=n.querySelector?.(':scope>h1,:scope>h2,:scope>h3,:scope>legend');if(h)return h.innerText.trim();n=n.parentElement}return''};const fields=[...document.querySelectorAll('input,select,textarea')].filter(e=>!['button','submit','password'].includes(e.type)).map(e=>({path:e.id||e.name||'',id:e.id||'',name:e.name||'',type:e.type||e.tagName.toLowerCase(),value:e.type==='checkbox'||e.type==='radio'?(e.checked?(e.value||true):false):e.value,checked:!!e.checked,label:label(e),section:section(e)}));const data={format:'tnx-character-sheets-v2',url:location.href,exportedAt:new Date().toISOString(),title:document.title,fields};completion(JSON.stringify(data));`;

  function status(node,text,isError=false){
    node.textContent=text;
    node.classList.toggle('error',Boolean(isError));
  }

  async function copyText(text){
    try{
      await navigator.clipboard.writeText(text);
      return true;
    }catch{
      const area=document.createElement('textarea');
      area.value=text;
      area.style.position='fixed';area.style.opacity='0';
      document.body.append(area);area.select();
      const ok=document.execCommand('copy');area.remove();
      return ok;
    }
  }

  copyExtractor.addEventListener('click',async()=>{
    const ok=await copyText(EXTRACTOR);
    status(extractorStatus,ok?'ショートカット用JavaScriptをコピーしました。':'コピーできませんでした。長押しコピー用の表示機能を後続版で追加します。',!ok);
  });

  source.addEventListener('input',()=>{
    const raw=source.value.trim();
    if(!raw){status(jsonStatus,'');return;}
    try{
      const data=JSON.parse(raw);
      const supported=Array.isArray(data?.fields)||(data&&typeof data==='object'&&(data.base||data.skills1||data.superhumanskills||data.weapons));
      if(!supported)throw new Error('対応するキャラシ倉庫JSONではありません。');
      const fieldCount=Array.isArray(data.fields)?data.fields.length:'旧形式';
      status(jsonStatus,`JSONを確認しました。項目数: ${fieldCount}`);
    }catch(error){
      status(jsonStatus,`JSONエラー: ${error.message}`,true);
    }
  });

  function resolveEditorUrl(value){
    const raw=String(value||'').trim();
    if(!raw)throw new Error('反映先の公開IDまたはURLを入力してください。');
    try{
      const parsed=new URL(raw,location.href);
      if(parsed.pathname.endsWith('/sheet.html')){
        const id=parsed.searchParams.get('id')?.trim();
        if(!id)throw new Error('URLにキャストIDがありません。');
        return new URL(`./sheet.html?id=${encodeURIComponent(id)}`,location.href).href;
      }
    }catch(error){
      if(/^https?:/i.test(raw))throw error;
    }
    if(!/^[A-Za-z0-9_-]+$/.test(raw))throw new Error('公開IDの形式を確認してください。');
    return new URL(`./sheet.html?id=${encodeURIComponent(raw)}`,location.href).href;
  }

  function waitForEditor(timeout=20000){
    return new Promise((resolve,reject)=>{
      const started=Date.now();
      const tick=()=>{
        try{
          const doc=frame.contentDocument;
          const textarea=doc?.querySelector('#legacy-import-json');
          const button=doc?.querySelector('#legacy-import-apply');
          if(textarea&&button)return resolve({doc,textarea,button});
        }catch(error){return reject(error);}
        if(Date.now()-started>timeout)return reject(new Error('編集画面の初期化がタイムアウトしました。'));
        setTimeout(tick,150);
      };
      tick();
    });
  }

  function waitForImportResult(doc,timeout=45000){
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{cleanup();reject(new Error('取込処理がタイムアウトしました。'));},timeout);
      const onResult=event=>{cleanup();event.detail?.ok?resolve(event.detail):reject(new Error(event.detail?.error||'取込に失敗しました。'));};
      const cleanup=()=>{clearTimeout(timer);doc.removeEventListener('tnx:legacy-import-base-finished',onResult);};
      doc.addEventListener('tnx:legacy-import-base-finished',onResult,{once:true});
    });
  }

  apply.addEventListener('click',async()=>{
    apply.disabled=true;openEditor.disabled=true;
    frameWrap.classList.remove('active');
    status(applyStatus,'準備中…');
    try{
      const data=JSON.parse(source.value.trim());
      const supported=Array.isArray(data?.fields)||(data&&typeof data==='object'&&(data.base||data.skills1||data.superhumanskills||data.weapons));
      if(!supported)throw new Error('対応するキャラシ倉庫JSONではありません。');
      editorUrl=resolveEditorUrl(target.value);
      frame.src=editorUrl;
      status(applyStatus,'編集画面を読み込んでいます…');
      const {doc,textarea,button}=await waitForEditor();
      textarea.value=JSON.stringify(data);
      textarea.dispatchEvent(new Event('input',{bubbles:true}));
      const resultPromise=waitForImportResult(doc);
      status(applyStatus,'キャストデータを反映しています…');
      button.click();
      const result=await resultPromise;
      const stats=result.stats||{};
      status(applyStatus,`反映完了：一般技能${stats.general||0} / 社会${stats.social||0} / コネ${stats.connection||0} / スタイル技能${stats.style||0} / アウトフィット${stats.outfit||0}`);
      openEditor.disabled=false;
    }catch(error){
      console.error('mobile import prototype failed',error);
      status(applyStatus,`反映エラー: ${error.message||error}`,true);
    }finally{
      apply.disabled=false;
    }
  });

  openEditor.addEventListener('click',()=>{
    if(editorUrl)location.href=editorUrl;
  });
})();