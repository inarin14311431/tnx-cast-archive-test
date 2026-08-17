const SUITS=["reason","passion","life","mundane"];
const $=selector=>document.querySelector(selector);
let previousStyleSuits=new Map();

function styleSuitBox(key){return $("#mobile-style-suit-"+key);}
function styleSuitCount(){return SUITS.reduce((sum,key)=>sum+(styleSuitBox(key)?.checked?1:0),0);}
function rememberStyleSuits(){previousStyleSuits=new Map(SUITS.map(key=>[key,Boolean(styleSuitBox(key)?.checked)]));}
function syncStyleModalFromLevel(){const level=$("#mobile-style-level");if(!level)return;const value=Math.max(0,Number(level.value)||0);level.value=String(value);if(value>=4){for(const key of SUITS){const box=styleSuitBox(key);if(box&&!box.checked){box.checked=true;box.dispatchEvent(new Event("change",{bubbles:true}));}}}rememberStyleSuits();}
function syncStyleModalFromSuit(key){const level=$("#mobile-style-level");const box=styleSuitBox(key);if(!level||!box)return;const wasChecked=previousStyleSuits.get(key)===true;const count=styleSuitCount();const current=Math.max(0,Number(level.value)||0);if(wasChecked&&!box.checked){level.value=String(count);}else if(box.checked&&current<count){level.value=String(count);}rememberStyleSuits();}

function bindStyleModal(){const level=$("#mobile-style-level");if(!level)return;rememberStyleSuits();level.addEventListener("input",syncStyleModalFromLevel,true);level.addEventListener("change",syncStyleModalFromLevel,true);for(const key of SUITS){styleSuitBox(key)?.addEventListener("change",()=>syncStyleModalFromSuit(key),true);}}

function selectedGeneralSuits(row){return SUITS.filter(key=>row.querySelector(`[data-mobile-general-field="${key}"]`)?.checked).length;}
function bindGeneralRow(row){if(row.dataset.mobilePcSuitRules==="1")return;const level=row.querySelector('[data-mobile-general-field="level"]');if(!level)return;const boxes=SUITS.map(key=>row.querySelector(`[data-mobile-general-field="${key}"]`)).filter(Boolean);if(boxes.length!==4)return;row.dataset.mobilePcSuitRules="1";for(const box of boxes)box.dataset.previousChecked=box.checked?"1":"0";
 level.addEventListener("change",()=>{const value=Math.max(0,Number(level.value)||0);level.value=String(value);if(value>=4){for(const box of boxes){if(!box.checked){box.checked=true;box.dispatchEvent(new Event("change",{bubbles:true}));}}}},true);
 for(const box of boxes){box.addEventListener("change",()=>{const was=box.dataset.previousChecked==="1";const count=selectedGeneralSuits(row);const current=Math.max(0,Number(level.value)||0);if(was&&!box.checked){level.value=String(count);level.dispatchEvent(new Event("change",{bubbles:true}));}else if(box.checked&&current<count){level.value=String(count);level.dispatchEvent(new Event("change",{bubbles:true}));}for(const item of boxes)item.dataset.previousChecked=item.checked?"1":"0";},true);}}
function bindGeneralRows(){document.querySelectorAll('[data-mobile-general-skill]').forEach(bindGeneralRow);}

function init(){bindStyleModal();bindGeneralRows();const general=$("#mobile-general-skills");if(general)new MutationObserver(bindGeneralRows).observe(general,{childList:true,subtree:true});const dialog=$("#style-skill-dialog");dialog?.addEventListener("toggle",rememberStyleSuits);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
