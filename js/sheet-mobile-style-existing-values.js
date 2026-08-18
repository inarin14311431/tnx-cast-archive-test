import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";

const PREFIX="@@TNX_STYLE_DETAIL_V1@@";
const FIELDS=["skill","limit","timing","target","range","difficulty","confrontation","description","page"];
const $=s=>document.querySelector(s);
let rows=new Map();
function parse(row){const result={};for(const key of FIELDS)result[key]="";const text=String(row?.description||"");if(text.startsWith(PREFIX)){try{Object.assign(result,JSON.parse(text.slice(PREFIX.length).trim())||{});}catch{}}else result.description=text;for(const key of ["timing","target","range","difficulty","confrontation"])if(!result[key]&&row?.[key]!=null)result[key]=String(row[key]);return result;}
function assignControl(control,value){if(!control)return;const text=String(value??"");if(control.tagName==="SELECT"&&text&&![...control.options].some(option=>option.value===text)){const option=document.createElement("option");option.value=text;option.textContent=text;control.append(option);}control.value=text;}
function hydrate(id){const row=rows.get(String(id));if(!row)return;const detail=parse(row);for(const key of FIELDS)assignControl(document.querySelector(`[data-mobile-style-detail="${key}"]`),detail[key]);}
function bind(){document.addEventListener("click",event=>{const card=event.target.closest?.("[data-style-id]");if(!card)return;requestAnimationFrame(()=>hydrate(card.dataset.styleId));});}
async function init(){const user=await requireAuth();if(!user)return;const publicId=new URLSearchParams(location.search).get("id");if(!publicId)return;const{data:character,error}=await supabase.from("characters").select("id").eq("public_id",publicId).eq("owner_id",user.id).maybeSingle();if(error||!character)return;const result=await supabase.from("character_skills").select("*").eq("character_id",character.id).eq("category","style");if(result.error)return;rows=new Map((result.data||[]).map(row=>[String(row.id),row]));bind();}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();