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

  function cleanRecoveredTitle(value){
    return String(value||"")
      .replace(/STYLE SECTION/gi,"")
      .replace(/[▲▼×✕✖]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function rememberTitle(row,name){
    const value=String(name?.value||"").trim();
    if(value)row.dataset.styleSeparatorTitle=value;
  }

  function ensureNameField(row){
    const cell=row?.children?.[0];
    if(!cell)return null;

    let name=cell.querySelector('[data-f="name"]');
    if(name){
      rememberTitle(row,name);
      return name;
    }

    const fallback=cleanRecoveredTitle(row.dataset.styleSeparatorTitle||cell.textContent)||"スタイル名";
    name=document.createElement("input");
    name.type="text";
    name.dataset.f="name";
    name.value=fallback;

    /* A separator title must always remain a real editable form control.  Some style-skill
     * enhancement passes can replace the original name field with presentation-only content;
     * rebuild it here so the normal sheet event/save pipeline can see data-f=name again.
     * Never trust action glyphs in cell.textContent as part of the title. */
    cell.replaceChildren(name);
    rememberTitle(row,name);
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
      rememberTitle(row,name);
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

      if(name){name.value="スタイル名";rememberTitle(row,name);emit(name);}
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
        rememberTitle(row,name);
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
    if(!row)return;
    if(event.target.matches?.('[data-f="name"]'))rememberTitle(row,event.target);
    decorate(row);
  });

  container.addEventListener("change",event=>{
    const row=event.target.closest?.('tr[data-skill-key]');
    if(!row)return;
    if(event.target.matches?.('[data-f="name"]'))rememberTitle(row,event.target);
    decorate(row);
  });

  decorateAll();
})();
