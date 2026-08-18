const SUITS=["reason","passion","life","mundane"];
const $=selector=>document.querySelector(selector);
const MUTABLE_GENERAL_PREFIXES=["製作：","芸術：","操縦："];
let previousStyleSuits=new Map();
let queuedRuleGuard=false;

function styleSuitBox(key){return $("#mobile-style-suit-"+key);}
function styleSuitCount(){return SUITS.reduce((sum,key)=>sum+(styleSuitBox(key)?.checked?1:0),0);}
function rememberStyleSuits(){previousStyleSuits=new Map(SUITS.map(key=>[key,Boolean(styleSuitBox(key)?.checked)]));}
function syncStyleModalFromLevel(){const level=$("#mobile-style-level");if(!level)return;const value=Math.max(0,Number(level.value)||0);level.value=String(value);if(value>=4){for(const key of SUITS){const box=styleSuitBox(key);if(box&&!box.checked){box.checked=true;box.dispatchEvent(new Event("change",{bubbles:true}));}}}rememberStyleSuits();}
function syncStyleModalFromSuit(key){const level=$("#mobile-style-level");const box=styleSuitBox(key);if(!level||!box)return;const wasChecked=previousStyleSuits.get(key)===true;const count=styleSuitCount();const current=Math.max(0,Number(level.value)||0);if(wasChecked&&!box.checked){level.value=String(count);}else if(box.checked&&current<count){level.value=String(count);}rememberStyleSuits();}
function bindStyleModal(){const level=$("#mobile-style-level");if(!level)return;rememberStyleSuits();level.addEventListener("input",syncStyleModalFromLevel,true);level.addEventListener("change",syncStyleModalFromLevel,true);for(const key of SUITS){styleSuitBox(key)?.addEventListener("change",()=>syncStyleModalFromSuit(key),true);}}

function mutableGeneralName(name){return MUTABLE_GENERAL_PREFIXES.some(prefix=>String(name||"").startsWith(prefix));}
function generalCategory(row){const heading=row.closest('.mobile-general-group')?.querySelector('h3')?.textContent||"";return heading.includes("社会")?"social":heading.includes("コネ")?"connection":"general";}
function rowFloor(row){const category=generalCategory(row);if(category!=="general")return 1;const name=row.querySelector('[data-mobile-general-field="name"]')?.value||"";return mutableGeneralName(name)?0:1;}
function selectedGeneralSuits(row){return SUITS.filter(key=>row.querySelector(`[data-mobile-general-field="${key}"]`)?.checked).length;}
function clampRowLevel(row){const level=row.querySelector('[data-mobile-general-field="level"]');if(!level)return;const floor=rowFloor(row);const value=Math.max(floor,Number(level.value)||0);level.min=String(floor);if(Number(level.value)!==value)level.value=String(value);}
function bindGeneralRow(row){if(row.dataset.mobilePcSuitRules==="1")return;const level=row.querySelector('[data-mobile-general-field="level"]');if(!level)return;const boxes=SUITS.map(key=>row.querySelector(`[data-mobile-general-field="${key}"]`)).filter(Boolean);if(boxes.length!==4)return;row.dataset.mobilePcSuitRules="1";for(const box of boxes)box.dataset.previousChecked=box.checked?"1":"0";clampRowLevel(row);
 level.addEventListener("input",()=>clampRowLevel(row),true);
 level.addEventListener("change",()=>{clampRowLevel(row);const value=Math.max(rowFloor(row),Number(level.value)||0);if(value>=4){for(const box of boxes){if(!box.checked){box.checked=true;box.dispatchEvent(new Event("change",{bubbles:true}));}}}},true);
 for(const box of boxes){box.addEventListener("change",()=>{const was=box.dataset.previousChecked==="1";const count=selectedGeneralSuits(row);const floor=rowFloor(row);const current=Math.max(floor,Number(level.value)||0);if(was&&!box.checked){level.value=String(Math.max(floor,count));level.dispatchEvent(new Event("change",{bubbles:true}));}else if(box.checked&&current<count){level.value=String(Math.max(floor,count));level.dispatchEvent(new Event("change",{bubbles:true}));}for(const item of boxes)item.dataset.previousChecked=item.checked?"1":"0";},true);}}
function bindGeneralRows(){document.querySelectorAll('[data-mobile-general-skill]').forEach(bindGeneralRow);}

function queuedFloor(){const title=$("#mobile-queued-general-title")?.textContent||"";if(!title.includes("一般技能"))return 1;const name=$("#mobile-queued-general-name")?.value||"";return !name.trim()||mutableGeneralName(name)?0:1;}
function enforceQueuedMinimum(){if(queuedRuleGuard)return;const level=$("#mobile-queued-general-level");if(!level)return;const floor=queuedFloor();level.min=String(floor);if((Number(level.value)||0)>=floor)return;queuedRuleGuard=true;level.value=String(floor);level.dispatchEvent(new Event("change",{bubbles:true}));queuedRuleGuard=false;}
function bindQueuedDialog(){const dialog=$("#mobile-queued-general-dialog");if(!dialog||dialog.dataset.minimumRules==="1")return false;dialog.dataset.minimumRules="1";dialog.addEventListener("input",event=>{if(event.target.matches('#mobile-queued-general-name,#mobile-queued-general-level'))queueMicrotask(enforceQueuedMinimum);},true);dialog.addEventListener("change",()=>queueMicrotask(enforceQueuedMinimum),true);return true;}

function init(){bindStyleModal();bindGeneralRows();bindQueuedDialog();const general=$("#mobile-general-skills");if(general)new MutationObserver(bindGeneralRows).observe(general,{childList:true,subtree:true});const dialog=$("#style-skill-dialog");dialog?.addEventListener("toggle",rememberStyleSuits);if(!bindQueuedDialog()){const observer=new MutationObserver(()=>{if(bindQueuedDialog())observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true});}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
