(()=>{
  const form=document.querySelector('#prototype-form');
  const modeInputs=[...document.querySelectorAll('input[name="transfer-mode"]')];
  const updateOnly=[...document.querySelectorAll('.update-only')];
  const updateUrlInput=document.querySelector('#update-url');
  const nameInput=document.querySelector('#test-name');
  const playerInput=document.querySelector('#test-player');
  const passwordInput=document.querySelector('#test-password');
  const hideInput=document.querySelector('#hide-from-list');
  const confirmInput=document.querySelector('#confirm-register');
  const confirmText=document.querySelector('#confirm-text');
  const submitButton=document.querySelector('#submit-register');
  const status=document.querySelector('#status');
  const previewMode=document.querySelector('#preview-mode');
  const previewKey=document.querySelector('#preview-key');
  const previewDisplay=document.querySelector('#preview-display');
  if(!form||!modeInputs.length||!updateUrlInput||!nameInput||!playerInput||!passwordInput||!hideInput||!confirmInput||!confirmText||!submitButton||!status||!previewMode||!previewKey||!previewDisplay)return;

  const REGISTER_URL='https://character-sheets.appspot.com/tnx/register';
  const BASELINE=String.raw`({"ability":({"cs":"7","life":({"abl":"6","ctl":"12"}),"mundane":({"abl":"6","ctl":"12"}),"outfits":({"cs":null,"life":({"abl":null,"ctl":null}),"mundane":({"abl":null,"ctl":null}),"passion":({"abl":null,"ctl":null}),"reason":({"abl":null,"ctl":null})}),"passion":({"abl":"9","ctl":"15"}),"reason":({"abl":"0","ctl":"9"}),"up":({"cs":null,"life":({"abl":null,"ctl":null}),"mundane":({"abl":null,"ctl":null}),"passion":({"abl":null,"ctl":null}),"reason":({"abl":null,"ctl":null})})}),"armours":[({"concealA":null,"concealB":null,"control":null,"electrical_control":null,"name":null,"notes":null,"page":null,"part":null,"permanent":null,"protecI":null,"protecP":null,"protecS":null,"purchase":null})],"autoresize":null,"base":({"age":null,"birth":"Ｎ◎ＶＡ","birthday":null,"dept":null,"exp":"-170","eyes":null,"hair":null,"height":null,"lifepath":({"encouter":null,"environment":null,"experience":null,"memo":null}),"memo":null,"memoir":null,"name":"ブルー・デスルーア","nameKana":null,"player":"稲荷秋","post":null,"rank":null,"reward":null,"sex":null,"skin":null,"weight":null}),"ccfolia":({"crude":null,"trump":null}),"display":null,"exp":({"ability":"0","armours":"0","initial":"-170","outfits":"0","residences":"0","skills":"0","superhumanskills":"0","total":"-170","vehicles":"0","weapons":"0"}),"outfits":[({"concealA":null,"concealB":null,"electrical_control":null,"name":null,"notes":null,"page":null,"part":null,"permanent":null,"purchase":null,"slot":null})],"outline":"STYLE:Kabuki=Kabuki=Kabuki","residences":[({"electrical_control":null,"entry":null,"name":null,"notes":null,"page":null,"part":null,"permanent":null,"purchase":null})],"skills1":[({"c":null,"d":null,"h":null,"level":"1","name":"医療","s":"1"}),({"c":null,"d":null,"h":null,"level":"1","name":"★射撃","s":"1"}),({"c":null,"d":null,"h":null,"level":"1","name":"知覚","s":"1"}),({"c":null,"d":null,"h":null,"level":"1","name":"電脳","s":"1"}),({"c":null,"d":null,"h":null,"level":null,"name":"製作：","s":null}),({"c":"1","d":null,"h":null,"level":"1","name":"★心理","s":null}),({"c":"1","d":null,"h":null,"level":"1","name":"★自我","s":null}),({"c":"1","d":null,"h":null,"level":"1","name":"交渉","s":null})],"skills2":[({"c":null,"d":null,"h":null,"level":null,"name":"芸術：","s":null}),({"c":null,"d":null,"h":"1","level":"1","name":"運動","s":null}),({"c":null,"d":null,"h":"1","level":"1","name":"★回避","s":null}),({"c":null,"d":null,"h":null,"level":null,"name":"★操縦：","s":null}),({"c":null,"d":null,"h":"1","level":"1","name":"★白兵","s":null}),({"c":null,"d":"1","h":null,"level":"1","name":"★圧力","s":null}),({"c":null,"d":"1","h":null,"level":"1","name":"★信用","s":null}),({"c":null,"d":"1","h":null,"level":"1","name":"隠密","s":null})],"skills3":[({"c":null,"d":null,"h":null,"level":"1","name":"社会：Ｎ◎ＶＡ","s":null}),({"c":null,"d":null,"h":null,"level":"1","name":"社会：ライフパス1","s":null}),({"c":null,"d":null,"h":null,"level":"1","name":"社会：ライフパス2","s":null}),({"c":null,"d":null,"h":null,"level":"1","name":"社会：ライフパス3","s":null})],"skills4":[({"c":null,"d":null,"h":null,"level":"1","name":"コネ：ライフパス1","s":null}),({"c":null,"d":null,"h":null,"level":"1","name":"コネ：ライフパス2","s":null}),({"c":null,"d":null,"h":null,"level":"1","name":"コネ：ライフパス3","s":null})],"styles":({"pk1":null,"pk2":null,"pk3":null,"style1":"0","style2":"0","style3":"0","utsuwa":({"element1":"雷神","element2":"雷神","element3":"雷神"})}),"superhumanskills":[({"aim":null,"c":null,"confront":null,"d":null,"expbase":"10","h":null,"level":null,"limit":null,"name":null,"notes":null,"page":null,"range":null,"s":null,"skill":null,"target":null,"timing":null})],"vehicles":[({"attack":null,"concealA":null,"concealB":null,"control":null,"crew":null,"electrical_control":null,"name":null,"notes":null,"page":null,"part":null,"permanent":null,"protecI":null,"protecP":null,"protecS":null,"purchase":null,"sf":null,"slot":null})],"weapons":[({"attack":null,"concealA":null,"concealB":null,"defense":null,"electrical_control":null,"name":null,"notes":null,"page":null,"part":null,"permanent":null,"purchase":null,"range":null})]})`;

  function currentMode(){
    return modeInputs.find(input=>input.checked)?.value==='update'?'update':'new';
  }

  function escapedJsonString(value){
    return JSON.stringify(String(value??'')).slice(1,-1);
  }

  function resolveUpdateKey(raw){
    const value=String(raw||'').trim();
    if(!value)throw new Error('更新先URLを入力してください。');
    let url;
    try{url=new URL(value);}catch{throw new Error('更新先URLの形式が正しくありません。');}
    if(url.protocol!=='https:'||url.hostname!=='character-sheets.appspot.com')throw new Error('character-sheets.appspot.com のHTTPS URLを指定してください。');
    const path=url.pathname.replace(/\/+$/,'');
    if(path!=='/tnx/edit.html')throw new Error('TNXの edit.html URLを指定してください。');
    const key=url.searchParams.get('key')?.trim()||'';
    if(!key)throw new Error('更新先URLに key がありません。');
    if(!/^[A-Za-z0-9_-]+$/.test(key))throw new Error('更新先keyの形式を確認してください。');
    return key;
  }

  function buildJsonData(name,player,hidden){
    const safeName=escapedJsonString(name);
    const safePlayer=escapedJsonString(player);
    const withName=BASELINE.replace('"name":"ブルー・デスルーア"',`"name":"${safeName}"`);
    const withPlayer=withName.replace('"player":"稲荷秋"',`"player":"${safePlayer}"`);
    return withPlayer.replace('"display":null',hidden?'"display":"0"':'"display":null');
  }

  function getValidatedKey(){
    if(currentMode()==='new')return '';
    try{return resolveUpdateKey(updateUrlInput.value);}catch{return '';}
  }

  function refreshUi(){
    const mode=currentMode();
    const isUpdate=mode==='update';
    updateOnly.forEach(node=>{node.hidden=!isUpdate;});
    updateUrlInput.required=isUpdate;
    confirmInput.checked=false;
    previewMode.textContent=isUpdate?'既存キャストを更新':'新規登録';
    let keyLabel='空欄（新規登録）';
    if(isUpdate){
      try{keyLabel=resolveUpdateKey(updateUrlInput.value);}catch{keyLabel='未確定（有効な更新先URLが必要）';}
    }
    previewKey.textContent=keyLabel;
    previewDisplay.textContent=hideInput.checked?'リストに載せない':'表示する';
    confirmText.textContent=isUpdate
      ?'指定した既存キャストを上書き更新することを確認しました。'
      :'キャラクターシート倉庫にテストキャストが1件新規登録されることを確認しました。';
    submitButton.innerHTML=isUpdate
      ?'既存キャストを更新 <small>POST UPDATE TO CHARACTER SHEETS</small>'
      :'テストキャストを新規登録 <small>POST TO CHARACTER SHEETS</small>';
    updateReadyState();
  }

  function updateReadyState(){
    const isUpdate=currentMode()==='update';
    let targetReady=true;
    if(isUpdate){
      try{resolveUpdateKey(updateUrlInput.value);}catch{targetReady=false;}
    }
    const ready=Boolean(nameInput.value.trim()&&passwordInput.value&&confirmInput.checked&&targetReady);
    submitButton.disabled=!ready;
    previewDisplay.textContent=hideInput.checked?'リストに載せない':'表示する';
    if(isUpdate){
      try{previewKey.textContent=resolveUpdateKey(updateUrlInput.value);}catch{previewKey.textContent='未確定（有効な更新先URLが必要）';}
    }
  }

  modeInputs.forEach(control=>control.addEventListener('change',refreshUi));
  [updateUrlInput,nameInput,playerInput,passwordInput,hideInput,confirmInput].forEach(control=>{
    control.addEventListener('input',updateReadyState);
    control.addEventListener('change',updateReadyState);
  });

  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(submitButton.disabled)return;

    const mode=currentMode();
    const isUpdate=mode==='update';
    const name=nameInput.value.trim();
    const player=playerInput.value.trim();
    const password=passwordInput.value;
    const hidden=hideInput.checked;
    let key='';

    try{
      if(!name)throw new Error('キャスト名がありません。');
      if(!password)throw new Error('編集パスワードがありません。');
      if(!confirmInput.checked)throw new Error('最終確認が未チェックです。');
      if(isUpdate)key=resolveUpdateKey(updateUrlInput.value);
    }catch(error){
      status.textContent=`安全停止：${error.message} 送信していません。`;
      updateReadyState();
      return;
    }

    const jsonData=buildJsonData(name,player,hidden);
    const expectedName=`"name":"${escapedJsonString(name)}"`;
    const expectedPlayer=`"player":"${escapedJsonString(player)}"`;
    const expectedDisplay=hidden?'"display":"0"':'"display":null';
    if(!jsonData.includes(expectedName)||!jsonData.includes(expectedPlayer)||!jsonData.includes(expectedDisplay)){
      status.textContent='安全停止：送信データの検証に失敗しました。送信していません。';
      return;
    }
    if(isUpdate&&!key){
      status.textContent='安全停止：更新先keyを確定できません。送信していません。';
      return;
    }

    submitButton.disabled=true;
    [...form.elements].forEach(control=>{if(control instanceof HTMLInputElement)control.readOnly=true;});
    modeInputs.forEach(control=>control.disabled=true);
    hideInput.disabled=true;
    confirmInput.disabled=true;
    status.textContent=isUpdate
      ?'既存キャストを更新するためキャラクターシート倉庫へ移動します。再送信しないでください。'
      :'新規登録のためキャラクターシート倉庫へ移動します。再送信しないでください。';

    const outbound=document.createElement('form');
    outbound.method='POST';
    outbound.action=REGISTER_URL;
    outbound.acceptCharset='UTF-8';
    outbound.style.display='none';

    const fields={
      key,
      player,
      name,
      nameKana:'',
      display:hidden?'0':'null',
      jsonData,
      outline:'STYLE:Kabuki=Kabuki=Kabuki',
      password,
      ajax:'1'
    };

    Object.entries(fields).forEach(([field,value])=>{
      const input=document.createElement('input');
      input.type='hidden';
      input.name=field;
      input.value=String(value??'');
      outbound.append(input);
    });

    document.body.append(outbound);
    outbound.submit();
  });

  refreshUi();
})();
