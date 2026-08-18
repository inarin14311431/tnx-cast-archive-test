import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";

const PREFIX="@@TNX_STYLE_DETAIL_V1@@";
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
const FIELDS=LABELS.map(([key])=>key);
let rows=new Map();
const escapeRe=value=>String(value).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
function blank(){return Object.fromEntries(FIELDS.map(key=>[key,""]));}
function readLabel(text,names){const all=LABELS.flatMap(([,aliases])=>aliases).map(escapeRe).join("|");const label=names.map(escapeRe).join("|");const re=new RegExp(`(?:^|[\\s　／|｜])(?:${label})\\s*[：:]\\s*([\\s\\S]*?)(?=\\s*(?:(?:${all})\\s*[：:])|$)`,`i`);const match=String(text||"").match(re);return match?match[1].trim():"";}
function parse(row){const result=blank();const text=String(row?.description||"");if(text.startsWith(PREFIX)){try{Object.assign(result,JSON.parse(text.slice(PREFIX.length).trim())||{});}catch{}}else{for(const[key,names]of LABELS){const value=readLabel(text,names);if(value)result[key]=value;}if(!result.description)result.description=text;}for(const key of ["timing","target","range","difficulty","confrontation"])if(!result[key]&&row?.[key]!=null)result[key]=String(row[key]);return result;}
function assignControl(control,value){if(!control)return;const text=String(value??"");if(control.tagName==="SELECT"&&text&&![...control.options].some(option=>option.value===text)){const option=document.createElement("option");option.value=text;option.textContent=text;option.dataset.legacyValue="1";control.append(option);}control.value=text;}
function hydrate(id){const row=rows.get(String(id));if(!row)return;const detail=parse(row);for(const key of FIELDS)assignControl(document.querySelector(`[data-mobile-style-detail="${key}"]`),detail[key]);}
function patchCard(card,row){const detail=parse(row);const cells=card.querySelectorAll(".mobile-style-skill-card__secondary > span");const values=[null,detail.skill||"—",detail.timing||"—",detail.target||"—"];for(let i=1;i<values.length;i++)if(cells[i]&&cells[i].textContent!==values[i])cells[i].textContent=values[i];}
function patchCards(){document.querySelectorAll("#mobile-style-skills [data-style-id]").forEach(card=>{const row=rows.get(String(card.dataset.styleId||""));if(row)patchCard(card,row);});}
function bind(){document.addEventListener("click",event=>{const card=event.target.closest?.("#mobile-style-skills [data-style-id]");if(!card)return;requestAnimationFrame(()=>hydrate(card.dataset.styleId));});const root=document.querySelector("#mobile-style-skills");if(root)new MutationObserver(()=>requestAnimationFrame(patchCards)).observe(root,{childList:true,subtree:true});document.addEventListener("tnx:mobile-skills-saved",load);}
async function load(){const user=await requireAuth();if(!user)return;const publicId=new URLSearchParams(location.search).get("id");if(!publicId)return;const{data:character,error}=await supabase.from("characters").select("id").eq("public_id",publicId).eq("owner_id",user.id).maybeSingle();if(error||!character)return;const result=await supabase.from("character_skills").select("*").eq("character_id",character.id).eq("category","style");if(result.error){console.error(result.error);return;}rows=new Map((result.data||[]).map(row=>[String(row.id),row]));patchCards();}
function init(){bind();load();}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
