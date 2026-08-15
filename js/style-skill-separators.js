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

  function ensureActionCell(row){
    const cells=[...row.children].filter(cell=>cell.tagName==="TD");
    if(cells.length<2)return null;

    /* A normal skill row already owns its action cell at the far right.
     * Never manufacture a new td here: doing so is itself a childList mutation and,
     * while the row is being rebuilt by another enhancer, used to create one extra
     * cell on every observer pass. Reuse only the existing last cell. */
    const actionCell=cells[cells.length-1];
    cells.forEach(cell=>{
      if(cell!==actionCell)cell.classList.remove("style-separator-actions");
    });
    actionCell.classList.add("style-separator-actions");

    const actions=[...row.querySelectorAll('[data-skill-move],[data-delete-skill]')];
    for(const action of actions){
      if(action.parentElement!==actionCell)actionCell.append(action);
    }
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
    ensureActionCell(row);
    const name=ensureNameField(row);
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
