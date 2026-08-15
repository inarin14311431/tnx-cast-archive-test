/* Style-skill separator rows. Keep the native sheet row/action DOM intact. */
(()=>{
  const MARKER="[[STYLE_SEPARATOR]]";
  const DETAIL_PREFIX="@@TNX_STYLE_DETAIL_V1@@";
  const container=document.querySelector("#style-skills");
  if(!container)return;

  let addButton=null;
  let decorateQueued=false;
  const wait=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const rows=()=>[...container.querySelectorAll('tr[data-skill-key]')];
  const emit=element=>{
    element?.dispatchEvent(new Event("input",{bubbles:true}));
    element?.dispatchEvent(new Event("change",{bubbles:true}));
  };

  function isMarker(value){
    const text=String(value||"");
    if(text.startsWith(MARKER))return true;
    if(!text.startsWith(DETAIL_PREFIX))return false;
    try{
      const detail=JSON.parse(text.slice(DETAIL_PREFIX.length).trim());
      return String(detail?.description||"").startsWith(MARKER);
    }catch{return false;}
  }

  function descriptionValue(row){
    const original=row?.querySelector('[data-f="description"]');
    if(original&&isMarker(original.value))return original.value;
    const expanded=row?.querySelector('[data-style-field="description"]');
    return expanded?.value||original?.value||"";
  }

  function isSeparator(row){
    return row?.dataset.styleSeparator==="1"||isMarker(descriptionValue(row));
  }

  function ensureNoneKind(row){
    const kind=row?.querySelector('[data-f="skill_kind"]');
    if(!kind)return;
    if(!kind.querySelector('option[value="none"]')){
      const option=document.createElement("option");
      option.value="none";
      option.textContent="なし";
      kind.prepend(option);
    }
    kind.dataset.styleSeparatorLocked="1";
    if(kind.value!=="none"){
      kind.value="none";
      emit(kind);
    }
  }

  function ensureNameField(row){
    const cell=row?.children?.[0];
    if(!cell)return null;
    cell.classList.add("style-separator-name-cell");
    let name=cell.querySelector('[data-f="name"]');
    if(!name){
      name=document.createElement("input");
      name.type="text";
      name.dataset.f="name";
      name.value=row.dataset.styleSeparatorTitle||"";
      cell.replaceChildren(name);
      emit(name);
    }
    if(name.value==="スタイル名"&&!row.dataset.styleSeparatorUserNamed){
      name.value="";
      emit(name);
    }
    name.disabled=false;
    name.readOnly=false;
    name.placeholder="スタイル名を入力（例：アヤカシ）";
    name.setAttribute("aria-label","スタイル技能の区切り名");
    name.dataset.styleSeparatorName="1";
    if(name.dataset.styleSeparatorRemember!=="1"){
      const remember=()=>{
        row.dataset.styleSeparatorTitle=name.value;
        row.dataset.styleSeparatorUserNamed=name.value?"1":"";
      };
      name.addEventListener("input",remember);
      name.addEventListener("change",remember);
      name.dataset.styleSeparatorRemember="1";
    }
    row.dataset.styleSeparatorTitle=name.value;
    return name;
  }

  function decorate(row){
    if(!isSeparator(row))return;
    row.classList.add("style-skill-separator-row");
    row.dataset.styleSeparator="1";
    ensureNoneKind(row);
    ensureNameField(row);
    /* Important: do not move, clone, remove, or rebuild the native right-edge action cell.
       sheet.js owns ▲/▼/× and their enabled state. */
  }

  function ensureAddButton(){
    const toolbar=document.querySelector("#add-style-skill")?.closest(".toolbar");
    const headingActions=container.querySelector('.skill-group-actions[data-v28],.skill-group-actions');
    const target=toolbar||headingActions;
    if(!target)return;
    if(!addButton){
      addButton=document.createElement("button");
      addButton.id="add-style-separator";
      addButton.type="button";
      addButton.className="skill-inline-add style-separator-add";
      addButton.innerHTML="区切りを追加<small>ADD DIVIDER</small>";
      addButton.addEventListener("click",createSeparator);
    }
    if(addButton.parentElement!==target)target.append(addButton);
    if(target===toolbar)toolbar.classList.add("has-style-divider");
  }

  function decorateAll(){
    ensureAddButton();
    rows().forEach(decorate);
  }

  function queueDecorate(){
    if(decorateQueued)return;
    decorateQueued=true;
    requestAnimationFrame(()=>{
      decorateQueued=false;
      decorateAll();
    });
  }

  async function createSeparator(){
    if(!addButton||addButton.disabled)return;
    addButton.disabled=true;
    try{
      const before=new Set(rows().map(row=>row.dataset.skillKey));
      document.querySelector("#add-style-skill")?.click();
      let row=null;
      for(let attempt=0;attempt<30&&!row;attempt++){
        await wait();
        row=rows().find(candidate=>!before.has(candidate.dataset.skillKey));
      }
      if(!row)return;

      /* Mark first so every later enhancer can recognize this as a separator. */
      row.dataset.styleSeparator="1";
      row.dataset.styleSeparatorTitle="";
      row.dataset.styleSeparatorUserNamed="";

      const name=row.querySelector('[data-f="name"]');
      const kind=row.querySelector('[data-f="skill_kind"]');
      const level=row.querySelector('[data-f="level"]');
      const detail=row.querySelector('[data-f="description"]');

      if(name&&name.value!==""){name.value="";emit(name);}
      if(kind){
        if(!kind.querySelector('option[value="none"]')){
          const option=document.createElement("option");
          option.value="none";
          option.textContent="なし";
          kind.prepend(option);
        }
        kind.dataset.styleSeparatorLocked="1";
        if(kind.value!=="none"){kind.value="none";emit(kind);}
      }
      if(level&&level.value!=="1"){level.value="1";emit(level);}
      row.querySelectorAll('input[type="checkbox"][data-f]').forEach(box=>{
        if(box.checked){box.checked=false;emit(box);}
      });
      if(detail&&detail.value!==MARKER){detail.value=MARKER;emit(detail);}

      decorate(row);
      ensureNameField(row)?.focus();
    }finally{
      addButton.disabled=false;
      queueDecorate();
    }
  }

  new MutationObserver(queueDecorate).observe(container,{childList:true,subtree:true});
  decorateAll();
})();
