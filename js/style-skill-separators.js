/* Style-skill separator rows, stored as zero-cost style skills with an internal marker. */
(()=>{
  const MARKER="[[STYLE_SEPARATOR]]";
  const DETAIL_PREFIX="@@TNX_STYLE_DETAIL_V1@@";
  const container=document.querySelector("#style-skills");
  if(!container)return;

  let addButton=null;

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

  function cleanFallbackTitle(text){
    return String(text||"")
      .replace(/STYLE\s*SECTION/gi,"")
      .replace(/[▲△▼▽×✕✖]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function isActionNode(node){
    if(!(node instanceof Element))return false;
    return node.matches('button,[data-skill-move],[data-delete-skill],.row-actions,.skill-row-actions')||
      Boolean(node.querySelector('button,[data-skill-move],[data-delete-skill]'));
  }

  function ensureNameField(row){
    const cell=row?.children?.[0];
    if(!cell)return null;

    let name=cell.querySelector('[data-f="name"]');
    if(name){
      row.dataset.styleSeparatorTitle=name.value||row.dataset.styleSeparatorTitle||"スタイル名";
      return name;
    }

    const fallback=cleanFallbackTitle(row.dataset.styleSeparatorTitle||cell.textContent)||"スタイル名";
    name=document.createElement("input");
    name.type="text";
    name.dataset.f="name";
    name.value=fallback;

    /* Never replace the whole name cell: depending on which editor enhancer ran last,
     * the row-action buttons can temporarily live in the same cell/wrapper. Preserve
     * every action node and remove only presentation/name remnants before inserting
     * the editable separator title field. */
    for(const node of [...cell.childNodes]){
      if(node===name)continue;
      if(node instanceof Element&&isActionNode(node))continue;
      node.remove();
    }
    cell.prepend(name);
    row.dataset.styleSeparatorTitle=name.value;
    emit(name);
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
    if(name){
      name.disabled=false;
      name.readOnly=false;
      name.removeAttribute("disabled");
      name.removeAttribute("readonly");
      name.tabIndex=0;
      name.placeholder="スタイル名を入力（例：アヤカシ）";
      name.setAttribute("aria-label","スタイル技能の区切り名");
      name.dataset.styleSeparatorName="1";
      const remember=()=>{row.dataset.styleSeparatorTitle=name.value||"スタイル名";};
      if(name.dataset.styleSeparatorRemember!=="1"){
        name.addEventListener("input",remember);
        name.addEventListener("change",remember);
        name.dataset.styleSeparatorRemember="1";
      }
      remember();
    }
  }

  function decorateAll(){
    ensureAddButton();
    rows().forEach(decorate);
  }

  async function createSeparator(){
    if(!addButton)return;
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

      let name=row.querySelector('[data-f="name"]');
      const kind=row.querySelector('[data-f="skill_kind"]');
      const level=row.querySelector('[data-f="level"]');
      const detail=row.querySelector('[data-f="description"]');

      if(name){name.value="スタイル名";emit(name);}
      if(kind){
        if(!kind.querySelector('option[value="none"]')){
          const option=document.createElement("option");
          option.value="none";
          option.textContent="なし";
          kind.prepend(option);
        }
        kind.value="none";
        emit(kind);
      }

      /* Level 1 keeps the row in the existing save pipeline; kind=none keeps EXP at zero. */
      if(level){level.value="1";emit(level);}
      row.querySelectorAll('input[type="checkbox"][data-f]').forEach(box=>{
        box.checked=false;
        emit(box);
      });
      if(detail){detail.value=MARKER;emit(detail);}

      row.dataset.styleSeparator="1";
      row.dataset.styleSeparatorTitle="スタイル名";
      decorate(row);
      name=ensureNameField(row);
      if(name&&name.value!=="スタイル名"){
        name.value="スタイル名";
        row.dataset.styleSeparatorTitle="スタイル名";
        emit(name);
      }
      name?.focus();
      name?.select?.();
    }finally{
      addButton.disabled=false;
    }
  }

  const observer=new MutationObserver(()=>{
    decorateAll();
  });
  observer.observe(container,{childList:true,subtree:true});

  container.addEventListener("input",event=>{
    const row=event.target.closest?.('tr[data-skill-key]');
    if(row)decorate(row);
  });

  container.addEventListener("change",event=>{
    const row=event.target.closest?.('tr[data-skill-key]');
    if(row)decorate(row);
  });

  decorateAll();
})();
