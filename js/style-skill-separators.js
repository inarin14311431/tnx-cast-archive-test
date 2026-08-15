/* Style-skill separator rows, stored as zero-cost style skills with an internal marker. */
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
    const original=row.querySelector('[data-f="description"]');
    if(original&&isMarker(original.value))return original.value;
    const expanded=row.querySelector('[data-style-field="description"]');
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
    kind.title="区切り行の種別は「なし」に固定されます。";
    if(kind.value==="none")return;
    kind.value="none";
    emit(kind);
  }

  function createActionButton(type,key){
    const button=document.createElement("button");
    button.type="button";
    button.className="row-action skill-action-button";
    if(type==="up"){
      button.classList.add("row-action--up");
      button.textContent="▲";
      button.dataset.skillMove="up";
      button.dataset.skillKey=key;
      button.title="上へ移動";
      button.setAttribute("aria-label","上へ移動");
    }else if(type==="down"){
      button.classList.add("row-action--down");
      button.textContent="▼";
      button.dataset.skillMove="down";
      button.dataset.skillKey=key;
      button.title="下へ移動";
      button.setAttribute("aria-label","下へ移動");
    }else{
      button.classList.add("row-action--delete","skill-action-delete");
      button.textContent="×";
      button.dataset.deleteSkill=key;
      button.title="削除";
      button.setAttribute("aria-label","削除");
    }
    return button;
  }

  function ensureActionCell(row){
    const cells=[...row.children].filter(cell=>cell.tagName==="TD");
    if(cells.length<2)return null;
    const actionCell=cells[cells.length-1];
    cells.forEach(cell=>cell.classList.toggle("style-separator-actions",cell===actionCell));
    actionCell.classList.add("row-actions","row-action-group");

    const key=row.dataset.skillKey;
    if(!key)return actionCell;

    let up=actionCell.querySelector('[data-skill-move="up"]');
    let down=actionCell.querySelector('[data-skill-move="down"]');
    let del=actionCell.querySelector('[data-delete-skill]');

    if(!up){up=createActionButton("up",key);actionCell.append(up);}
    if(!down){down=createActionButton("down",key);actionCell.append(down);}
    if(!del){del=createActionButton("delete",key);actionCell.append(del);}

    up.dataset.skillKey=key;
    down.dataset.skillKey=key;
    del.dataset.deleteSkill=key;

    /* Remove duplicate action controls left behind by prior enhancement passes. */
    row.querySelectorAll('[data-skill-move],[data-delete-skill]').forEach(action=>{
      if(action===up||action===down||action===del)return;
      action.remove();
    });

    const styleRows=rows();
    const index=styleRows.findIndex(candidate=>candidate.dataset.skillKey===key);
    up.disabled=index<=0;
    down.disabled=index<0||index>=styleRows.length-1;
    del.disabled=false;
    return actionCell;
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
      row.dataset.styleSeparatorTitle="";
      emit(name);
    }
    return name;
  }

  function ensureAddButton(){
    const headingActions=container.querySelector('.skill-group-actions[data-v28],.skill-group-actions');
    const toolbar=document.querySelector("#add-style-skill")?.closest(".toolbar");
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

  function decorate(row){
    if(!isSeparator(row))return;
    row.classList.add("style-skill-separator-row");
    row.dataset.styleSeparator="1";
    ensureNoneKind(row);
    const name=ensureNameField(row);
    ensureActionCell(row);
    if(name){
      name.disabled=false;
      name.readOnly=false;
      name.removeAttribute("disabled");
      name.removeAttribute("readonly");
      name.tabIndex=0;
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
    }
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
      for(let attempt=0;attempt<20&&!row;attempt++){
        await wait();
        row=rows().find(candidate=>!before.has(candidate.dataset.skillKey));
      }
      if(!row)return;

      const kind=row.querySelector('[data-f="skill_kind"]');
      const level=row.querySelector('[data-f="level"]');
      const detail=row.querySelector('[data-f="description"]');
      const name=row.querySelector('[data-f="name"]');

      row.dataset.styleSeparator="1";
      row.dataset.styleSeparatorTitle="";
      row.dataset.styleSeparatorUserNamed="";

      if(name){name.value="";emit(name);}
      if(kind){
        if(!kind.querySelector('option[value="none"]')){
          const option=document.createElement("option");
          option.value="none";
          option.textContent="なし";
          kind.prepend(option);
        }
        kind.dataset.styleSeparatorLocked="1";
        kind.value="none";
        emit(kind);
      }
      if(level){level.value="1";emit(level);}
      row.querySelectorAll('input[type="checkbox"][data-f]').forEach(box=>{
        if(!box.checked)return;
        box.checked=false;
        emit(box);
      });
      if(detail){detail.value=MARKER;emit(detail);}

      decorate(row);
      ensureActionCell(row);
      const editable=ensureNameField(row);
      editable?.focus();
    }finally{
      addButton.disabled=false;
      queueDecorate();
    }
  }

  const observer=new MutationObserver(queueDecorate);
  observer.observe(container,{childList:true,subtree:true});

  container.addEventListener("input",event=>{
    const row=event.target.closest?.('tr[data-skill-key]');
    if(row&&isSeparator(row))queueDecorate();
  });
  container.addEventListener("change",event=>{
    const row=event.target.closest?.('tr[data-skill-key]');
    if(row&&isSeparator(row))queueDecorate();
  });

  decorateAll();
})();
