/* Skill level / suit synchronization DOM adapter.
 * Pure level/suit decisions live in sheet-skill-level-suit-state.js.
 */
(async function(){
  const SUITS=["reason","passion","life","mundane"];
  const ROOT_SELECTOR="#general-skills,#style-skills";
  const stateUrl=new URL("./sheet-skill-level-suit-state.js?v=1",document.currentScript?.src||document.baseURI);
  const {
    normalizeSkillLevel,
    shouldSelectAllSuits,
    resolveSkillLevelAfterSuitChange
  }=await import(stateUrl.href);

  function suitBoxes(row){
    return SUITS.map(suit=>row.querySelector(`[data-f="${suit}"]`)).filter(Boolean);
  }

  function selectedCount(row){
    return suitBoxes(row).filter(box=>box.checked).length;
  }

  function dispatchInput(control){
    control.dispatchEvent(new Event("input",{bubbles:true}));
  }

  function handleInput(event){
    const control=event.target;
    if(!control?.matches)return;
    const row=control.closest?.('tr[data-skill-key]');
    if(!row)return;

    if(control.matches('[data-f="level"]')){
      const value=normalizeSkillLevel(control.value);
      control.value=String(value);
      if(!shouldSelectAllSuits(value))return;

      for(const box of suitBoxes(row)){
        if(box.checked)continue;
        box.checked=true;
        dispatchInput(box);
      }
      return;
    }

    if(!SUITS.some(suit=>control.matches(`[data-f="${suit}"]`)))return;
    const level=row.querySelector('[data-f="level"]');
    if(!level)return;
    const currentLevel=normalizeSkillLevel(level.value);
    const nextLevel=resolveSkillLevelAfterSuitChange({
      currentLevel,
      selectedSuitCount:selectedCount(row),
      checked:control.checked
    });
    if(nextLevel===currentLevel)return;
    level.value=String(nextLevel);
    dispatchInput(level);
  }

  function initializeSkillLevelSuitRules(){
    const roots=[...document.querySelectorAll(ROOT_SELECTOR)];
    if(!roots.length){
      setTimeout(initializeSkillLevelSuitRules,100);
      return;
    }
    roots.forEach(root=>{
      if(root.dataset.levelSuitRulesObserver==="1")return;
      root.dataset.levelSuitRulesObserver="1";
      root.addEventListener("input",handleInput);
    });
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initializeSkillLevelSuitRules,{once:true});
  else initializeSkillLevelSuitRules();
})().catch(error=>console.error("Skill level/suit rules failed to initialize",error));
