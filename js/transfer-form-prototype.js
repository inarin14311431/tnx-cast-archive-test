(()=>{
  const form=document.querySelector('#prototype-form');
  const nameInput=document.querySelector('#test-name');
  const playerInput=document.querySelector('#test-player');
  const passwordInput=document.querySelector('#test-password');
  const confirmInput=document.querySelector('#confirm-register');
  const submitButton=document.querySelector('#submit-register');
  const status=document.querySelector('#status');
  if(!form||!nameInput||!playerInput||!passwordInput||!confirmInput||!submitButton||!status)return;

  const REGISTER_URL='https://character-sheets.appspot.com/tnx/register';
  const BASELINE=String.raw`({"ability":({"cs":"7","life":({"abl":"6","ctl":"12"}),"mundane":({"abl":"6","ctl":"12"}),"outfits":({"cs":null,"life":({"abl":null,"ctl":null}),"mundane":({"abl":null,"ctl":null}),"passion":({"abl":null,"ctl":null}),"reason":({"abl":null,"ctl":null})}),"passion":({"abl":"9","ctl":"15"}),"reason":({"abl":"0","ctl":"9"}),"up":({"cs":null,"life":({"abl":null,"ctl":null}),"mundane":({"abl":null,"ctl":null}),"passion":({"abl":null,"ctl":null}),"reason":({"abl":null,"ctl":null})})}),"armours":[({"concealA":null,"concealB":null,"control":null,"electrical_control":null,"name":null,"notes":null,"page":null,"part":null,"permanent":null,"protecI":null,"protecP":null,"protecS":null,"purchase":null})],"autoresize":null,"base":({"age":null,"birth":"Ｎ◎ＶＡ","birthday":null,"dept":null,"exp":"-170","eyes":null,"hair":null,"height":null,"lifepath":({"encouter":null,"environment":null,"experience":null,"memo":null}),"memo":null,"memoir":null,"name":"ブルー・デスルーア","nameKana":null,"player":"稲荷秋","post":null,"rank":null,"reward":null,"sex":null,"skin":null,"weight":null}),"ccfolia":({"crude":null,"trump":null}),"display":null,"exp":({"ability":"0","armours":"0","initial":"-170","outfits":"0","residences":"0","skills":"0","superhumanskills":"0","total":"-170","vehicles":"0","weapons":"0"}),"outfits":[({"concealA":null,"concealB":null,"electrical_control":null,"name":null,"notes":null,"page":null,"part":null,"permanent":null,"purchase":null,"slot":null})],"outline":"STYLE:Kabuki=Kabuki=Kabuki","residences":[({"electrical_control":null,"entry":null,"name":null,"notes":null,"page":null,"part":null,"permanent":null,"purchase":null})],"skills1":[({"c":null,"d":null,"h":null,"level":"1","name":"医療","s":"1"}),({"c":null,"d":null,"h":null,"level":"1","name":"★射撃","s":"1"}),({"c":null,"d":null,"h":null,"level":"1","name":"知覚","s":"1"}),({"c":null,"d":null,"h":null,"level":"1","name":"電脳","s":"1"}),({"c":null,"d":null,"h":null,"level":null,"name":"製作：","s":null}),({"c":"1","d":null,"h":null,"level":"1","name":"★心理","s":null}),({"c":"1","d":null,"h":null,"level":"1","name":"★自我","s":null}),({"c":"1","d":null,"h":null,"level":"1","name":"交渉","s":null})],"skills2":[({"c":null,"d":null,"h":null,"level":null,"name":"芸術：","s":null}),({"c":null,"d":null,"h":"1","level":"1","name":"運動","s":null}),({"c":null,"d":null,"h":"1","level":"1","name":"★回避","s":null}),({"c":null,"d":null,"h":null,"level":null,"name":"★操縦：","s":null}),({"c":null,"d":null,"h":"1","level":"1","name":"★白兵","s":null}),({"c":null,"d":"1","h":null,"level":"1","name":"★圧力","s":null}),({"c":null,"d":"1","h":null,"level":"1","name":"★信用","s":null}),({"c":null,"d":"1","h":null,"level":"1","name":"隠密","s":null})],"skills3":[({"c":null,"d":null,"h":null,"level":"1","name":"社会：Ｎ◎ＶＡ","s":null}),({"c":null,"d":null,"h":null,"level":"1","name":"社会：ライフパス1","s":null}),({"c":null,"d":null,"h":null,"level":"1","name":"社会：ライフパス2","s":null}),({"c":null,"d":null,"h":null,"level":"1","name":"社会：ライフパス3","s":null})],"skills4":[({"c":null,"d":null,"h":null,"level":"1","name":"コネ：ライフパス1","s":null}),({"c":null,"d":null,"h":null,"level":"1","name":"コネ：ライフパス2","s":null}),({"c":null,"d":null,"h":null,"level":"1","name":"コネ：ライフパス3","s":null})],"styles":({"pk1":null,"pk2":null,"pk3":null,"style1":"0","style2":"0","style3":"0","utsuwa":({"element1":"雷神","element2":"雷神","element3":"雷神"})}),"superhumanskills":[({"aim":null,"c":null,"confront":null,"d":null,"expbase":"10","h":null,"level":null,"limit":null,"name":null,"notes":null,"page":null,"range":null,"s":null,"skill":null,"target":null,"timing":null})],"vehicles":[({"attack":null,"concealA":null,"concealB":null,"control":null,"crew":null,"electrical_control":null,"name":null,"notes":null,"page":null,"part":null,"permanent":null,"protecI":null,"protecP":null,"protecS":null,"purchase":null,"sf":null,"slot":null})],"weapons":[({"attack":null,"concealA":null,"concealB":null,"defense":null,"electrical_control":null,"name":null,"notes":null,"page":null,"part":null,"permanent":null,"purchase":null,"range":null})]})`;

  function escapedJsonString(value){
    return JSON.stringify(String(value??'')).slice(1,-1);
  }

  function buildJsonData(name,player){
    const safeName=escapedJsonString(name);
    const safePlayer=escapedJsonString(player);
    const withName=BASELINE.replace('"name":"ブルー・デスルーア"',`"name":"${safeName}"`);
    return withName.replace('"player":"稲荷秋"',`"player":"${safePlayer}"`);
  }

  function updateReadyState(){
    const ready=Boolean(
      nameInput.value.trim()&&
      passwordInput.value&&
      confirmInput.checked
    );
    submitButton.disabled=!ready;
  }

  [nameInput,playerInput,passwordInput,confirmInput].forEach(control=>{
    control.addEventListener('input',updateReadyState);
    control.addEventListener('change',updateReadyState);
  });

  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(submitButton.disabled)return;

    const name=nameInput.value.trim();
    const player=playerInput.value.trim();
    const password=passwordInput.value;
    if(!name||!password||!confirmInput.checked)return;

    const jsonData=buildJsonData(name,player);
    if(!jsonData.includes(`"name":"${escapedJsonString(name)}"`)){
      status.textContent='安全停止：キャスト名を送信データへ反映できませんでした。送信していません。';
      return;
    }

    submitButton.disabled=true;
    nameInput.readOnly=true;
    playerInput.readOnly=true;
    passwordInput.readOnly=true;
    confirmInput.disabled=true;
    status.textContent='キャラクターシート倉庫へ通常フォームPOSTで移動します。再送信しないでください。';

    const outbound=document.createElement('form');
    outbound.method='POST';
    outbound.action=REGISTER_URL;
    outbound.acceptCharset='UTF-8';
    outbound.style.display='none';

    const fields={
      key:'',
      player,
      name,
      nameKana:'',
      display:'null',
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

  updateReadyState();
})();
