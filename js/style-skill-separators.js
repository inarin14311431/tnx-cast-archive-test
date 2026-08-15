/* Style-skill separator rows. Normal style-skill rows remain owned by sheet.js/style-skill-fields.js. */
(()=>{
  const MARKER="[[STYLE_SEPARATOR]]";
  const DETAIL_PREFIX="@@TNX_STYLE_DETAIL_V1@@";
  const container=document.querySelector("#style-skills");
  if(!container)return;

  let addButton=null;
  let queued=false;
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

  function normalizeStructure(row){
    const name=row.querySelector('[data-f="name"]');
    const actions=row.querySelector('.row-actions');
    const nameCell=name?.closest("td");
    const actionCell=actions?.closest("td");
    if(!name||!actions||!nameCell||!actionCell||nameCell===actionCell)return false;

    nameCell.className="style-separator-main";
    actionCell.className="style-separator-actions";
    if(row.children.length!==2||row.firstElementChild!==nameCell||row.lastElementChild!==actionCell){
      row.replaceChildren(nameCell,actionCell);
    }
    row.dataset.styleSeparatorStructure="2cell";
    return true;
  }

  function decorate(row){
    if(!isSeparator(row))return;
    row.dataset.styleSeparator="1";
    row.classList.add("style-skill-separator-row");

    const kind=row.querySelector('[data-f="skill_kind"]');
    if(kind){
      kind.dataset.styleSeparatorLocked="1";
      if(kind.value!=="none")kind.value="none";
    }

    const name=row.querySelector('[data-f="name"]');
    if(name){
      if(name.value==="スタイル名"&&row.dataset.styleSeparatorMigrated!=="1")name.value="";
      row.dataset.styleSeparatorMigrated="1";
      name.disabled=false;
      name.readOnly=false;
      name.placeholder="スタイル名を入力（例：アヤカシ）";
      name.setAttribute("aria-label","スタイル技能の区切り名");
      name.dataset.styleSeparatorName="1";
    }

    normalizeStructure(row);
  }

  function ensureAddButton(){
    const toolbar=document.querySelector("#add-style-skill")?.closest(".toolbar");
    if(!toolbar)return;
    if(!addButton){
      addButton=document.createElement("button");
      addButton.id="add-style-separator";
      addButton.type="button";
      addButton.className="skill-inline-add style-separator-add";
      addButton.innerHTML="区切りを追加<small>ADD DIVIDER</small>";
      addButton.addEventListener("click",createSeparator);
    }
    if(addButton.parentElement!==toolbar)toolbar.append(addButton);
    toolbar.classList.add("has-style-divider");
  }

  function decorateAll(){
    ensureAddButton();
    rows().forEach(decorate);
  }

  function queueDecorate(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      decorateAll();
    });
  }

  async function stabilizeAfterReorder(){
    await wait();
    decorateAll();
    await wait();
    decorateAll();
  }

  async function createSeparator(){
    if(!addButton||addButton.disabled)return;
    addButton.disabled=true;
    try{
      const before=new Set(rows().map(row=>row.dataset.skillKey));
      document.querySelector("#add-style-skill")?.click();

      let row=null;
      for(let attempt=0;attempt<20&&!row;attempt++){
        await wait();
        row=rows().find(candidate=>!before.has(candidate.dataset.skillKey));
      }
      if(!row)return;

      row.dataset.styleSeparator="1";
      row.dataset.styleSeparatorMigrated="1";
      row.classList.add("style-skill-separator-row");

      const name=row.querySelector('[data-f="name"]');
      const kind=row.querySelector('[data-f="skill_kind"]');
      const level=row.querySelector('[data-f="level"]');
      const detail=row.querySelector('[data-f="description"]');

      if(name){name.value="";emit(name);}
      if(kind){kind.dataset.styleSeparatorLocked="1";kind.value="none";emit(kind);}
      if(level){level.value="1";emit(level);}
      row.querySelectorAll('input[type="checkbox"][data-f]').forEach(box=>{
        if(!box.checked)return;
        box.checked=false;
        emit(box);
      });
      if(detail){detail.value=MARKER;emit(detail);}

      decorate(row);
      row.querySelector('[data-f="name"]')?.focus();
    }finally{
      addButton.disabled=false;
      queueDecorate();
    }
  }

  container.addEventListener("click",event=>{
    const button=event.target.closest('.row-actions button');
    const row=button?.closest('tr[data-skill-key]');
    if(!button||!row||!isSeparator(row))return;
    stabilizeAfterReorder();
  });

  new MutationObserver(queueDecorate).observe(container,{childList:true,subtree:true});
  decorateAll();
})();
