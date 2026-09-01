import { normalizeImportedOutfitDetails } from "./outfit-ofc-adapter.js?v=1";

const STYLE_DETAIL_MARKER = "@@TNX_STYLE_DETAIL_V1@@";
const STYLE_SEPARATOR_MARKER = "[[STYLE_SEPARATOR]]";
const STYLE_NAMES = {
  kabuki:"カブキ",katana:"カタナ",vasara:"バサラ",tatara:"タタラ",mistress:"ミストレス",kabuto:"カブト",charisma:"カリスマ",mannequin:"マネキン",kaze:"カゼ",fate:"フェイト",kuromaku:"クロマク",exec:"エグゼク",kugutsu:"クグツ",kage:"カゲ",chakra:"チャクラ",legger:"レッガー",kabutowari:"カブトワリ",highlander:"ハイランダー",mayakashi:"マヤカシ",talkie:"トーキー",inu:"イヌ",neuro:"ニューロ",hiruko:"ヒルコ",common:"コモン",kurogane:"クロガネ",ibuki:"イブキ",shikigami:"シキガミ",arashi:"アラシ",kagemusha:"カゲムシャ",migiude:"ミギウデ",etranger:"エトランゼ",ayakashi:"アヤカシ",utsuwa:"ウツワ"
};
const OUTFIT_GROUPS = [["weapon",["weapons"]],["armor",["armours","armors"]],["cyberware",["cyberwares"]],["tron",["trons"]],["vehicle",["vehicles"]],["residence",["residences"]],["other",["outfits"]]];

const cleanName=value=>String(value??"").trim().replace(/^[★†※■┗]+\s*/,"").replace(/Ｎ◎ＶＡ/g,"N◎VA");
const exactName=value=>String(value??"").replace(/\r\n?/g,"\n").replace(/\\r\\n|\\n|\\r/g,"\n").trim().replace(/Ｎ◎ＶＡ/g,"N◎VA");
const number=value=>{const match=String(value??"").match(/-?\d+/);return match?Number(match[0]):0};
const truth=value=>value===true?true:value===false||value==null?false:!["","0","false","off","no","null","undefined"].includes(String(value).trim().toLowerCase());
const first=(object,...keys)=>{for(const key of keys){const value=object?.[key];if(value!==undefined&&value!==null&&String(value)!=="")return value}return ""};
const canonicalKey=value=>String(value||"").trim().replace(/\[\s*["']?([^\]"']+)["']?\s*\]/g,".$1").replace(/^[.#]+|[.]$/g,"").replace(/\.{2,}/g,".");
const text=value=>String(value??"").replace(/\r\n?/g,"\n").trim();
const scalar=value=>value===null||value===undefined?"":typeof value==="boolean"||typeof value==="number"?value:typeof value==="object"?JSON.stringify(value):String(value).trim();
const numberScalar=value=>{const result=Number(value??0);return Number.isFinite(result)?result:0};

function flatten(value,prefix,map){
  if(value===null||value===undefined)return;
  if(Array.isArray(value)){value.forEach((item,index)=>flatten(item,prefix?`${prefix}.${index}`:String(index),map));return;}
  if(typeof value==="object"){
    for(const [key,item] of Object.entries(value)){
      if(["fields","format","url","exportedAt","title"].includes(key)&&!prefix)continue;
      flatten(item,prefix?`${prefix}.${key}`:key,map);
    }
    return;
  }
  const key=canonicalKey(prefix);if(key&&!map.has(key))map.set(key,value);
}

export function characterSheetFieldMap(data={}){
  const map=new Map();
  const put=(key,value,prefer=false)=>{const normalized=canonicalKey(key);if(normalized&&(!map.has(normalized)||prefer||(!truth(map.get(normalized))&&truth(value))))map.set(normalized,value)};
  for(const field of Array.isArray(data?.fields)?data.fields:[]){
    const type=String(field.type||"").toLowerCase();
    const value=(type==="checkbox"||type==="radio")?(field.checked?(field.value||true):false):field.value;
    const prefer=(type==="checkbox"||type==="radio")?Boolean(field.checked):String(value??"")!=="";
    [field.path,field.id,field.name].forEach(key=>put(key,value,prefer));
  }
  flatten(data,"",map);return map;
}
const get=(map,...keys)=>{for(const key of keys){const normalized=canonicalKey(key);if(map.has(normalized))return map.get(normalized)}return ""};
function groups(map,prefixes){
  const list=Array.isArray(prefixes)?prefixes:[prefixes],output=new Map();
  for(const [id,value] of map){
    for(const prefix of list){
      const escaped=canonicalKey(prefix).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),match=id.match(new RegExp(`^${escaped}\\.([^.]*)\\.(.+)$`));
      if(!match)continue;
      if(!output.has(match[1]))output.set(match[1],{});output.get(match[1])[match[2]]=value;break;
    }
  }
  return [...output.entries()].sort(([a],[b])=>Number(a)-Number(b)||String(a).localeCompare(String(b),"ja")).map(([,value])=>value);
}
function styleName(value){const raw=cleanName(value).replace(/^STYLE:/i,"").replace(/[◎●□]/g,"").trim();if(!raw)return "";return STYLE_NAMES[raw.toLowerCase().replace(/[\s_\-・]/g,"")]||raw;}
function styleMark(value){const raw=String(value||"");return raw.includes("◎")&&raw.includes("●")?"◎●":raw.includes("◎")?"◎":raw.includes("●")?"●":"";}
function skillSuits(data){return{reason:truth(first(data,"s","reason","spade")),passion:truth(first(data,"c","passion","club")),life:truth(first(data,"h","life","heart")),mundane:truth(first(data,"d","mundane","diamond"))};}
function skillLevel(data){const suits=skillSuits(data);return Math.max(0,number(first(data,"level","lv")),Object.values(suits).filter(Boolean).length);}
function skillFreeLevel(data){const level=skillLevel(data);return Math.min(level,Math.max(0,number(first(data,"free_level","freeLevel"))));}
function skillKind(data,category){if(category==="general")return cleanName(first(data,"name")).includes("：")?"proper":"general";if(category!=="style")return "proper";const label=String(first(data,"type","kind","category")||"");if(/演出|方向/.test(label))return"direction";if(/奥義/.test(label))return"ultimate";if(/秘技/.test(label))return"secret";const cost=number(first(data,"expbase","experience","cost"));return cost>=50?"ultimate":cost>=20?"secret":cost>0&&cost<=2?"direction":"normal";}
function rawSkill(data,category,name){const suits=skillSuits(data);return{name,level:skillLevel(data),free_level:skillFreeLevel(data),skill_kind:skillKind(data,category),...suits,description:category==="style"?text(first(data,"notes","description")):text(first(data,"notes","description"))};}
function prefixed(value,prefix){const cleaned=cleanName(value);return !cleaned?"":cleaned.startsWith(prefix)?cleaned:`${prefix}${cleaned}`;}
function skillRowsFromJsonp(map){
  const rows=[];
  for(const data of [...groups(map,"skills1"),...groups(map,"skills2")]){const raw=first(data,"name"),name=cleanName(raw);if(name&&skillLevel(data))rows.push({category:"general",...rawSkill(data,"general",name)});}
  for(const data of groups(map,["skills3","socialskills","social"])){const raw=first(data,"name"),name=prefixed(raw,"社会：");if(name&&skillLevel(data))rows.push({category:"social",...rawSkill(data,"social",name)});}
  for(const data of groups(map,["skills4","connectionskills","connections"])){const raw=first(data,"name"),cleaned=cleanName(raw);if(cleaned&&!/^ー+$/.test(cleaned)&&skillLevel(data)){const name=prefixed(cleaned,"コネ：");rows.push({category:"connection",...rawSkill(data,"connection",name)});}}
  for(const data of groups(map,["superhumanskills","styleskills","styleSkills"])){const raw=first(data,"name"),name=exactName(raw);if(name&&!name.startsWith("■")&&skillLevel(data))rows.push({category:"style",...rawSkill(data,"style",name),style_detail:{skill:text(first(data,"skill")),limit:text(first(data,"limit")),timing:text(first(data,"timing")),target:text(first(data,"target")),range:text(first(data,"range")),difficulty:text(first(data,"aim","difficulty")),confrontation:text(first(data,"confront","confrontation")),page:text(first(data,"page")),description:text(first(data,"notes","description"))}});}
  return rows;
}
function parseStyleDetail(value){const source=text(value);if(!source.startsWith(STYLE_DETAIL_MARKER))return{description:source};try{const parsed=JSON.parse(source.slice(STYLE_DETAIL_MARKER.length).trim())||{};return{skill:text(parsed.skill),limit:text(parsed.limit),timing:text(parsed.timing),target:text(parsed.target),range:text(parsed.range),difficulty:text(parsed.difficulty??parsed.aim),confrontation:text(parsed.confrontation??parsed.confront),page:text(parsed.page),description:text(parsed.description)}}catch{return{description:source}};}
function normalizeSkillRow(row={}){const base={name:scalar(row.name),level:numberScalar(row.level),free_level:numberScalar(row.free_level),skill_kind:scalar(row.skill_kind),reason:Boolean(row.reason),passion:Boolean(row.passion),life:Boolean(row.life),mundane:Boolean(row.mundane),description:text(row.description)};if(row.category==="style"){const detail=row.style_detail||parseStyleDetail(row.description);base.description=text(detail.description);base.style_detail={skill:text(detail.skill),limit:text(detail.limit),timing:text(detail.timing),target:text(detail.target),range:text(detail.range),difficulty:text(detail.difficulty),confrontation:text(detail.confrontation),page:text(detail.page),description:text(detail.description)};}return base;}
function normalizeConcealment(value){const source=scalar(value);return source.includes("/")?source.split("/",1)[0].trim():source;}
function normalizeOutfitSlot(value){const source=scalar(value);return["0","全身","片手持ち"].includes(source)?"":source;}
function normalizeArchiveOutfit(row={}){const d=row.ofc_details&&typeof row.ofc_details==="object"?row.ofc_details:{};return{name:scalar(row.name),category:scalar(row.category||"other"),slot:normalizeOutfitSlot(row.slot??d.slot),range:scalar(row.range),attack:scalar(row.attack),concealment:normalizeConcealment(row.concealment??d.concealment),purchase_value:scalar(row.purchase_value),experience_cost:numberScalar(row.experience_cost),cs_modifier:numberScalar(row.cs_modifier),control_modifier:numberScalar(row.control_modifier),description:text(row.description||d.description),defense_s:scalar(d.defense_s),defense_p:scalar(d.defense_p),defense_i:scalar(d.defense_i),purchase_target:scalar(d.purchase_target),permanent_cost:scalar(d.permanent_cost),electronic_control:scalar(d.electronic_control),concealment_penalty:scalar(d.concealment_penalty)};}
function normalizeJsonpOutfit(category,data){const modifiers=normalizeImportedOutfitDetails(category,{control_modifier:first(data,"control","controlModifier","controlValue"),cs_modifier:first(data,"cs","csModifier")});const details=normalizeImportedOutfitDetails(category,{concealment_penalty:first(data,"concealB","concealmentPenalty","concealment_penalty"),defense_s:first(data,"protecS","defenseS"),defense_p:first(data,"protecP","defenseP"),defense_i:first(data,"protecI","defenseI"),purchase_target:first(data,"purchase","purchaseValue"),permanent_cost:first(data,"permanent","experienceCost"),electronic_control:first(data,"electrical_control","electronic_control","electricalControl","electronicControl"),description:first(data,"notes","description"),slot:first(data,"slot","part")});return{name:cleanName(first(data,"name")),category,slot:normalizeOutfitSlot(first(data,"slot","part")),range:scalar(first(data,"range")),attack:scalar(first(data,"attack")),concealment:normalizeConcealment(first(data,"concealA","concealment")),purchase_value:scalar(first(data,"purchase","purchaseValue")),experience_cost:numberScalar(first(data,"permanent","experienceCost")),cs_modifier:numberScalar(modifiers.cs_modifier),control_modifier:numberScalar(modifiers.control_modifier),description:text(first(data,"notes","description")),defense_s:scalar(details.defense_s),defense_p:scalar(details.defense_p),defense_i:scalar(details.defense_i),purchase_target:scalar(first(data,"purchase","purchaseValue")),permanent_cost:scalar(first(data,"permanent","experienceCost")),electronic_control:scalar(details.electronic_control),concealment_penalty:scalar(details.concealment_penalty)};}
function rowsByIdentity(rows,identity,normalize){const out={},counts=new Map();for(const row of rows){const base=String(identity(row)),count=(counts.get(base)||0)+1;counts.set(base,count);out[count===1?base:`${base} #${count}`]=normalize(row);}return out;}
function emptyCharacterCanonical(){return{basic:{},personal:{},styles:{},abilities:{},general:{},social:{},connection:{},styleSkills:{},outfits:{}};}

export function canonicalizeCharacterSheetJsonp(data={}){
  const map=characterSheetFieldMap(data),result=emptyCharacterCanonical(),cast=parseCastName(get(map,"base.name","name"));
  result.basic={character_name:cast.name,character_kana:scalar(get(map,"base.nameKana","base.kana","kana")),handle:scalar(get(map,"base.handle","handle")||cast.handle),handle_kana:scalar(get(map,"base.handleKana","base.handle_kana","handleKana","handle_kana")),player_name:scalar(get(map,"base.player","player")),affiliation:scalar(get(map,"base.post","base.affiliation","affiliation")),citizen_rank:scalar(get(map,"base.rank","rank")),summary:text(get(map,"base.lifepath.memo","base.summary","summary")),profile:buildProfile(map)};
  result.personal={age:scalar(get(map,"base.age","age")),gender:scalar(get(map,"base.sex","base.gender","sex","gender")),height:scalar(get(map,"base.height","height")),weight:scalar(get(map,"base.weight","weight")),eyes:scalar(get(map,"base.eyes","eyes")),hair:scalar(get(map,"base.hair","hair")),skin:scalar(get(map,"base.skin","skin")),life_path_origin:scalar(get(map,"base.lifepath.origin","base.lifepath.experience","life_path_origin")),life_path_experience:scalar(get(map,"base.lifepath.environment","life_path_experience")),life_path_encounter:scalar(get(map,"base.lifepath.encounter","base.lifepath.encouter","life_path_encounter"))};
  const direct=groups(map,["styles","style"]),outline=String(get(map,"outline","base.outline","base.style","stylesOutline")||"").replace(/^STYLE:/i,"").replace(/\s+(?:ID|AGE|GENDER):.*$/i,""),parts=outline.split(/[=,]/).map(v=>v.trim()).filter(Boolean);
  result.styles={};for(let i=0;i<3;i++){const item=direct[i]||{},raw=first(item,"name","style","value")||get(map,`style${i+1}`,`styles.${i}.name`)||parts[i]||"",name=styleName(raw);result.styles[`style_${i+1}`]=name;result.styles[`style_${i+1}_mark`]=styleMark(first(item,"mark","symbol")||raw);result.styles[`style_${i+1}_attribute`]=name==="ウツワ"?scalar(first(item,"attribute","utsuwa")):"";}
  result.abilities={};for(const key of ["reason","passion","life","mundane"]){const ability=number(get(map,`ability.${key}.abl`,`ability.${key}.value`,`abilities.${key}.value`)),controls=(String(get(map,`ability.${key}.ctl`,`ability.${key}.control`,`abilities.${key}.control`)??"").match(/-?\d+/g)||[]).map(Number),base=controls[0]||0,final=controls[1]??base;result.abilities[`${key}_base`]=ability;result.abilities[`${key}_gear`]=0;result.abilities[`${key}_control_base`]=base;result.abilities[`${key}_control_gear`]=final-base;}result.abilities.cs_base=number(get(map,"ability.cs","abilities.cs","cs"));result.abilities.cs_gear=0;
  const skills=skillRowsFromJsonp(map);for(const [category,key] of [["general","general"],["social","social"],["connection","connection"],["style","styleSkills"]])result[key]=rowsByIdentity(skills.filter(r=>r.category===category),r=>r.description===STYLE_SEPARATOR_MARKER?`区切り:${r.name}`:r.name||"名称なし",normalizeSkillRow);
  const outfits=[];for(const [category,prefixes] of OUTFIT_GROUPS)for(const item of groups(map,prefixes)){if(cleanName(first(item,"name")))outfits.push({category,...item});}result.outfits=rowsByIdentity(outfits,r=>`${r.category||"other"}:${cleanName(first(r,"name"))||"名称なし"}`,r=>normalizeJsonpOutfit(r.category,r));
  return result;
}
function parseCastName(value){const raw=String(value||"").trim(),match=raw.match(/^[\s　]*[“”"「『](.+?)[“”"」』][\s　]*(.+)$/);return match?{handle:match[1].trim(),name:match[2].trim()}:{handle:"",name:raw};}
function buildProfile(map){const parts=[get(map,"base.memoir","base.profile","profile"),get(map,"base.memo")&&`【メモ】\n${get(map,"base.memo")}`,get(map,"base.birth")&&`出身：${get(map,"base.birth")}`].filter(Boolean);return text(parts.join("\n\n"));}

export function canonicalizeArchiveBundle(bundle={}){
  const c=bundle.character||{},pick=fields=>Object.fromEntries(fields.map(field=>[field,scalar(c[field])])),skills=Array.isArray(bundle.skills)?bundle.skills:[],outfits=Array.isArray(bundle.outfits)?bundle.outfits:[];
  return{basic:pick(["character_name","character_kana","handle","handle_kana","player_name","affiliation","citizen_rank","summary","profile"]),personal:pick(["age","gender","height","weight","eyes","hair","skin","life_path_origin","life_path_experience","life_path_encounter"]),styles:pick(["style_1","style_1_mark","style_1_attribute","style_2","style_2_mark","style_2_attribute","style_3","style_3_mark","style_3_attribute"]),abilities:pick(["reason_base","reason_gear","reason_control_base","reason_control_gear","passion_base","passion_gear","passion_control_base","passion_control_gear","life_base","life_gear","life_control_base","life_control_gear","mundane_base","mundane_gear","mundane_control_base","mundane_control_gear","cs_base","cs_gear"]),general:rowsByIdentity(skills.filter(r=>r.category==="general"),r=>r.name||"名称なし",normalizeSkillRow),social:rowsByIdentity(skills.filter(r=>r.category==="social"),r=>r.name||"名称なし",normalizeSkillRow),connection:rowsByIdentity(skills.filter(r=>r.category==="connection"),r=>r.name||"名称なし",normalizeSkillRow),styleSkills:rowsByIdentity(skills.filter(r=>r.category==="style"),r=>r.description===STYLE_SEPARATOR_MARKER?`区切り:${r.name}`:r.name||"名称なし",normalizeSkillRow),outfits:rowsByIdentity(outfits,r=>`${r.category||"other"}:${r.name||"名称なし"}`,normalizeArchiveOutfit)};
}

export function diffCanonicalBundles(left={},right={}){const out=[];for(const category of ["basic","personal","styles","abilities","general","social","connection","styleSkills","outfits"])diffObject(left[category]||{},right[category]||{},category,[],out);return out;}
function diffObject(left,right,category,path,out){for(const key of new Set([...Object.keys(left||{}),...Object.keys(right||{})])){const a=left?.[key],b=right?.[key],next=[...path,key],oa=a&&typeof a==="object"&&!Array.isArray(a),ob=b&&typeof b==="object"&&!Array.isArray(b);if(oa||ob){diffObject(oa?a:{},ob?b:{},category,next,out);continue;}if(String(a??"")!==String(b??""))out.push({category,path:next.join(" / "),archive:a??"",warehouse:b??""});}}
