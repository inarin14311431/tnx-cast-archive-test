(()=>{
  const input=document.querySelector('#source-url');
  const button=document.querySelector('#run-test');
  const status=document.querySelector('#status');
  const result=document.querySelector('#result');
  if(!input||!button||!status||!result)return;

  function setStatus(text,state=''){
    status.textContent=text;
    status.dataset.state=state;
  }

  function resolveKey(raw){
    const value=String(raw||'').trim();
    if(!value)throw new Error('キャラクターシート倉庫のURLを入力してください。');
    let url;
    try{url=new URL(value);}catch{throw new Error('URLの形式を確認してください。');}
    if(url.hostname!=='character-sheets.appspot.com')throw new Error('character-sheets.appspot.com のURLを指定してください。');
    const parts=url.pathname.split('/').filter(Boolean);
    if(parts[0]!=='tnx')throw new Error('TNXキャラクターシートURLではありません。');
    const key=url.searchParams.get('key')?.trim();
    if(!key)throw new Error('URLに key がありません。保存済みキャラクターのURLを指定してください。');
    return key;
  }

  async function run(){
    if(button.disabled)return;
    button.disabled=true;
    result.textContent='通信確認中…';
    setStatus('既存データのGET通信だけを実行しています。');
    try{
      const key=resolveKey(input.value);
      const url=`https://character-sheets.appspot.com/tnx/display?ajax=1&key=${encodeURIComponent(key)}`;
      const response=await fetch(url,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store'});
      const text=await response.text();
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      let payload;
      try{payload=JSON.parse(text);}catch{payload=text;}
      const detectedName=typeof payload==='object'&&payload
        ? String(payload?.base?.name||payload?.name||payload?.characterName||'').trim()
        : '';
      setStatus('通常のcross-origin fetchで応答を読み取れました。登録POSTの試作へ進める可能性があります。','success');
      result.textContent=[
        `HTTP: ${response.status} ${response.statusText}`,
        `Content-Type: ${response.headers.get('content-type')||'(なし)'}`,
        `取得データ: ${typeof payload==='object'?'JSON':'TEXT'}`,
        detectedName?`キャスト名: ${detectedName}`:'キャスト名: 判定できず',
        '',
        '※ この試験では /tnx/register へ送信していません。キャラクターの新規作成・更新は発生していません。'
      ].join('\n');
    }catch(error){
      console.error('direct transfer safe CORS test failed',error);
      const corsLike=error instanceof TypeError;
      setStatus(corsLike
        ? '通常のcross-origin fetchでは応答を読めませんでした。CORS制限の可能性が高いです。POSTは実行していません。'
        : `通信試験エラー：${error?.message||error}`,'error');
      result.textContent=[
        `結果: ${corsLike?'CORS/ネットワーク層で遮断':'エラー'}`,
        `詳細: ${error?.message||error}`,
        '',
        '安全確認: GETのみ。/tnx/register へのPOSTは未実装です。'
      ].join('\n');
    }finally{
      button.disabled=false;
    }
  }

  button.addEventListener('click',run);
  input.addEventListener('keydown',event=>{
    if(event.key!=='Enter')return;
    event.preventDefault();
    run();
  });
})();
