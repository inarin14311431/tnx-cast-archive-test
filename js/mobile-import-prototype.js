(()=>{
  const PROTOTYPE_VERSION='0.5.0';
  const $=selector=>document.querySelector(selector);
  const sourceUrl=$('#source-url');
  const fetchButton=$('#fetch-source');
  const fetchStatus=$('#fetch-status');
  const source=$('#source-json');
  const target=$('#target-id');
  const apply=$('#apply-mobile-import');
  const openEditor=$('#open-editor');
  const frame=$('#editor-frame');
  const frameWrap=$('#editor-frame-wrap');
  const jsonStatus=$('#json-status');
  const applyStatus=$('#apply-status');
  const versionLabel=$('#prototype-version');
  let editorUrl='';

  if(versionLabel)versionLabel.textContent=`VERSION ${PROTOTYPE_VERSION}`;

  function status(node,text,isError=false){
    if(!node)return;
    node.textContent=text;
    node.classList.toggle('error',Boolean(isError));
  }

  function resolveSource(value){
    const raw=String(value||'').trim();
    if(!raw)throw new Error('キャラクターシート倉庫のURLを入力してください。');
    const parsed=new URL(raw);
    if(parsed.hostname!=='character-sheets.appspot.com')throw new Error('character-sheets.appspot.com のURLを指定してください。');
    const parts=parsed.pathname.split('/').filter(Boolean);
    if(parts[0]!=='tnx')throw new Error('トーキョーN◎VAのキャラクターシートURLではありません。');
    const key=parsed.searchParams.get('key')?.trim();
    if(!key)throw new Error('URLに key がありません。保存済みキャラクターの編集URLを指定してください。');
    return {key};
  }

  function normalizePayload(payload){
    let data=payload;
    for(let i=0;i<3;i++){
      if(typeof data==='string'){
        try{data=JSON.parse(data);continue;}catch{break;}
      }
      if(data&&typeof data==='object'&&typeof data.jsonData==='string'&&data.jsonData.trim()){
        try{data=JSON.parse(data.jsonData);continue;}catch{}
      }
      if(data&&typeof data==='object'&&data.data&&typeof data.data==='object'&&!data.base&&!data.skills1&&!data.superhumanskills&&!data.weapons){
        data=data.data;continue;
      }
      break;
    }
    if(!data||typeof data!=='object')throw new Error('キャラシ倉庫から有効なデータを取得できませんでした。');
    return data;
  }

  function fetchJsonp(key,timeout=15000){
    return new Promise((resolve,reject)=>{
      const callback=`__tnxMobileImport_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script=document.createElement('script');
      let settled=false;
      const cleanup=()=>{
        try{delete window[callback];}catch{window[callback]=undefined;}
        script.remove();
      };
      const timer=setTimeout(()=>{
        if(settled)return;
        settled=true;cleanup();reject(new Error('キャラシ倉庫からの応答がタイムアウトしました。'));
      },timeout);
      window[callback]=payload=>{
        if(settled)return;
        settled=true;clearTimeout(timer);cleanup();resolve(payload);
      };
      script.onerror=()=>{
        if(settled)return;
        settled=true;clearTimeout(timer);cleanup();reject(new Error('キャラシ倉庫のデータ取得に失敗しました。'));
      };
      script.src=`https://character-sheets.appspot.com/tnx/display?ajax=1&key=${encodeURIComponent(key)}&callback=${encodeURIComponent(callback)}`;
      document.head.append(script);
    });
  }

  function validateAndDescribe(data,raw){
    const supported=Array.isArray(data?.fields)||(data&&typeof data==='object'&&(data.base||data.skills1||data.skills2||data.superhumanskills||data.weapons||data.outfits));
    if(!supported)throw new Error('取得データをTNXキャラクターシートとして認識できません。');
    const name=data?.base?.name||data?.characterName||data?.name||'';
    const fieldCount=Array.isArray(data.fields)?data.fields.length:null;
    const suffix=fieldCount!==null?` / 項目数 ${fieldCount}`:'';
    return `${name?`「${name}」 `:''}データ取得済み / ${raw.length.toLocaleString()}文字${suffix}`;
  }

  fetchButton.addEventListener('click',async()=>{
    fetchButton.disabled=true;
    status(fetchStatus,'キャラシ倉庫へ接続中…');
    status(jsonStatus,'');
    try{
      const {key}=resolveSource(sourceUrl.value);
      const payload=await fetchJsonp(key);
      const data=normalizePayload(payload);
      const raw=JSON.stringify(data);
      const description=validateAndDescribe(data,raw);
      source.value=raw;
      source.dispatchEvent(new Event('input',{bubbles:true}));
      status(fetchStatus,description);
    }catch(error){
      console.error('character-sheets jsonp fetch failed',error);
      status(fetchStatus,`取得エラー: ${error.message||error}`,true);
    }finally{
      fetchButton.disabled=false;
    }
  });

  source.addEventListener('input',()=>{
    const raw=source.value.trim();
    if(!raw){status(jsonStatus,'');return;}
    try{
      const data=normalizePayload(JSON.parse(raw));
      status(jsonStatus,validateAndDescribe(data,raw));
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
      const data=normalizePayload(JSON.parse(source.value.trim()));
      validateAndDescribe(data,source.value.trim());
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
