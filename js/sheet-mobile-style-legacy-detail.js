import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";

const STYLE_PREFIX="@@TNX_STYLE_DETAIL_V1@@";
const LABELS=[
  ["skill",["技能"]],
  ["limit",["上限","使用上限"]],
  ["timing",["タイミング"]],
  ["target",["対象"]],
  ["range",["射程"]],
  ["difficulty",["目標値"]],
  ["confrontation",["対決"]],
  ["page",["参照P","参照Ｐ","参照ページ","ページ"]],
  ["description",["解説"]]
];
const DETAIL_KEYS=LABELS.map(([key])=>key);
const $=selector=>document.querySelector(selector);
const escRegExp=value=>String(value).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
let details=new Map();

function blank(){return Object.fromEntries(DETAIL_KEYS.map(key=>[key,""]));}
function parseJson(text){if(!text.startsWith(STYLE_PREFIX))return null;try{return{...blank(),...JSON.parse(text.slice(STYLE_PREFIX.length).trim())};}catch{return null;}}
function readLabel(text,names){const all=LABELS.flatMap(([,aliases])=>aliases).map(escRegExp).join("|");const label=names.map(escRegExp).join("|");const re=new RegExp(`(?:^|[\\n\\r\\t／|｜])\\s*(?:${label})\\s*[：:]\\s*([\\s\\S]*?)(?=\\s*(?:(?:${all})\\s*[：:])|$)`,`i`);const match=String(text||"").match(re);return match?match[1].trim():"";}
function parseLegacy(row){const text=String(row?.description||"");const encoded=parseJson(text);if(encoded)return encoded;const data=blank();data.timing=String(row?.timing||"");data.target=String(row?.target||"");data.range=String(row?.range||"");data.difficulty=String(row?.difficulty||"");data.confrontation=String(row?.confrontation||"");for(const[key,names]of LABELS){const found=readLabel(text,names);if(found)data[key]=found;}if(!data.description)data.description=text;return data;}
function ensureOption(select,value){if(!select||!value)return;if(Array.from(select.options).some(option=>option.value===value))return;const option=document.createElement("option");option.value=value;option.textContent=value;option.dataset.legacyValue="1";select.append(option);}
function patchCard(card,detail){const cells=card.querySelectorAll(".mobile-style-skill-card__secondary > span");if(cells[1]&&cells[1].textContent!==(detail.skill||"—"))cells[1].textContent=detail.skill||"—";if(cells[2]&&cells[2].textContent!==(detail.timing||"—"))cells[2].textContent=detail.timing||"—";if(cells[3]&&cells[3].textContent!==(detail.target||"—"))cells[3].textContent=detail.target||"—";}
function patchCards(){document.querySelectorAll("#mobile-style-skills [data-style-id]").forEach(card=>{const detail=details.get(String(card.dataset.styleId||""));if(detail)patchCard(card,detail);});}
function fillModal(id){const detail=details.get(String(id||""));if(!detail)return;for(const key of DETAIL_KEYS){const input=document.querySelector(`[data-mobile-style-detail="${key}"]`);if(!input)continue;const value=detail[key]||"";if(input.tagName==="SELECT")ensureOption(input,value);input.value=value;}}
function bind(){document.addEventListener("click",event=>{const card=event.target.closest("#mobile-style-skills [data-style-id]");if(!card)return;const id=card.dataset.styleId;queueMicrotask(()=>fillModal(id));});const root=$("#mobile-style-skills");if(root){const observer=new MutationObserver(()=>requestAnimationFrame(patchCards));observer.observe(root,{childList:true,subtree:true});}document.addEventListener("tnx:mobile-skills-saved",load);}
async function load(){const user=await requireAuth();if(!user)return;const publicId=new URLSearchParams(location.search).get("id");if(!publicId)return;const{data:character,error}=await supabase.from("characters").select("id").eq("public_id",publicId).eq("owner_id",user.id).maybeSingle();if(error||!character)return;const result=await supabase.from("character_skills").select("id,category,description,timing,target,range,difficulty,confrontation").eq("character_id",character.id).eq("category","style");if(result.error){console.error(result.error);return;}details=new Map((result.data||[]).map(row=>[String(row.id),parseLegacy(row)]));patchCards();}
function init(){bind();load();}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
