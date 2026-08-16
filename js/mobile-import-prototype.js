(()=>{
  const PROTOTYPE_VERSION='0.4.0';
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
  const versionLabel=$('#prototype-version');
  let editorUrl='';

  if(versionLabel)versionLabel.textContent=`VERSION ${PROTOTYPE_VERSION}`;

  // iOS Shortcuts は completion() の戻り値を内部でJSON変換するため、
  // JSON.stringify()せず辞書オブジェクトを直接返す。
  const EXTRACTOR=`/* TNX MOBILE IMPORT v${PROTOTYPE_VERSION} */\ntry{var nodes=document.querySelectorAll('input,select,textarea');var fields=[];for(var i=0;i<nodes.length;i++){var e=nodes[i];var type=String(e.type||e.tagName||'').toLowerCase();if(type==='button'||type==='submit'||type==='password'||type==='reset'||type==='file')continue;var path=e.id||e.name||'';if(!path)continue;var isCheck=type==='checkbox'||type==='radio';fields.push({path:path,type:type,value:isCheck?(e.checked?(e.value||true):false):String(e.value==null?'':e.value),checked:!!e.checked});}completion({format:'tnx-character-sheets-v2',version:'${PROTOTYPE_VERSION}',url:location.href,title:document.title,fieldCount:fields.length,fields:fields});}catch(error){completion({format:'tnx-mobile-import-error',version:'${PROTOTYPE_VERSION}',error:String(error&&error.message?error.message:error)});}`;

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
    status(extractorStatus,ok?`抽出JavaScript v${PROTOTYPE_VERSION} をコピーしました。今回は「JavaScriptの結果を表示」だけで確認してください。`:'コピーできませんでした。',!ok);
  });

  source.addEventListener('input',()=>{
    const raw=source.value.trim();
    if(!raw){status(jsonStatus,'');return;}
    try{
      const data=JSON.parse(raw);
      if(data?.format==='tnx-mobile-import-error')throw new Error(data.error||'抽出エラー');
      const supported=Array.isArray(data?.fields)||(data&&typeof data==='object'&&(data.base||data.skills1||data.superhumanskills||data.weapons));
      if(!supported)throw new Error('対応するキャラシ倉庫JSONではありません。');
      const fieldCount=Array.isArray(data.fields)?data.fields.length:'旧形式';
      const dataVersion=data.version?` / v${data.version}`:'';
      status(jsonStatus,`JSONを確認しました。項目数: ${fieldCount} / ${raw.length.toLocaleString()}文字${dataVersion}`);
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
      if(data?.format==='tnx-mobile-import-error')throw new Error(data.error||'抽出エラー');
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
