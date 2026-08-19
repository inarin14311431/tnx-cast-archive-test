/* Skill level / suit synchronization rules.
 *
 * - Level 4 or higher selects all four suits.
 * - Level 0-3 does not automatically add suits.
 * - Adding a suit raises the level only when the suit count exceeds it.
 * - Removing a suit lowers the level to the remaining suit count.
 *
 * Dynamic skill rows now use delegated handlers in sheet-row-interactions.js,
 * so this module also delegates from the skill roots instead of wrapping
 * per-control oninput handlers.
 */
(function(){
  const SUITS=["reason","passion","life","mundane"];
  const ROOT_SELECTOR="#general-skills,#style-skills";

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
      const value=Math.max(0,Number(control.value||0));
      control.value=String(value);
      if(value<4)return;

      for(const box of suitBoxes(row)){
        if(box.checked)continue;
        box.checked=true;
        dispatchInput(box);
      }
      return;
    }

    if(!SUITS.some(suit=>control.matches(`[data-f="${suit}"]`)))return;
    if(control.checked)return;

    const level=row.querySelector('[data-f="level"]');
    if(!level)return;
    level.value=String(selectedCount(row));
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
})();
