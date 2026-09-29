import { supabase } from "./supabase-client.js";
import { escapeHtml, escapeAttribute } from "./dom-escape.js";

const COLUMNS = "public_id,character_name,handle,summary,profile,experience_points,style_1,style_1_mark,style_2,style_2_mark,style_3,style_3_mark,reason_value,passion_value,life_value,mundane_value,image_url,image_thumbnail_url";
const TIERS = [{ stars:2, weight:50, min:0,max:0 },{stars:3,weight:30,min:1,max:99},{stars:4,weight:15,min:100,max:299},{stars:5,weight:5,min:300,max:Infinity}];
const ARCANA = ["カブキ","バサラ","タタラ","ミストレス","カブト","カリスマ","マネキン","カゼ","フェイト","クロマク","エグゼク","カタナ","クグツ","カゲ","チャクラ","レッガー","カブトワリ","ハイランダー","マヤカシ","トーキー","ニューロ","イヌ"];
const $ = id => document.getElementById(id);
let pools = [];
function tierOf(exp) { return TIERS.find(t => exp >= t.min && exp <= t.max) ?? TIERS[0]; }
function pick(items) { return items[Math.floor(Math.random()*items.length)]; }
function drawTier(available) {
  const total = available.reduce((sum,t)=>sum+t.weight,0);
  let roll = Math.random()*total;
  for (const tier of available) { roll -= tier.weight; if(roll < 0) return tier; }
  return available.at(-1);
}
function persona(cast) {
  for (let n=1;n<=3;n++) if(String(cast[`style_${n}_mark`]||"").includes("◎")) return cast[`style_${n}`];
  return cast.style_1 || "";
}
function firstQuote(cast) {
  for(const value of [cast.summary,cast.profile]) {
    const match=String(value||"").match(/「([^」]+)」/);
    if(match) return `「${match[1]}」`;
  }
  return "―― NO SIGNAL ――";
}
function render(cast,tier) {
  const style=persona(cast), number=ARCANA.indexOf(style);
  const styles=[1,2,3].map(n=>[cast[`style_${n}`],cast[`style_${n}_mark`]]).filter(([name])=>name).map(([name,mark])=>escapeHtml(name)+escapeHtml(mark||"")).join(" / ");
  const image=cast.image_thumbnail_url||cast.image_url;
  const stats=[["理性",cast.reason_value],["感情",cast.passion_value],["生命",cast.life_value],["外界",cast.mundane_value]];
  const article=document.createElement("article");
  article.className="card"; article.dataset.rarity=String(tier.stars);
  article.innerHTML=`<div class="arcana" aria-hidden="true"><strong>${number>=0?number:"◇"}</strong><em>${escapeHtml(style)}</em></div>
    <div class="art">${image?`<img src="${escapeAttribute(image)}" alt="" referrerpolicy="no-referrer">`:'<span class="empty">◇</span>'}</div>
    <div class="content"><div class="stars" aria-label="${tier.stars}つ星">${"★".repeat(tier.stars)}</div>
    <p class="handle">${escapeHtml(cast.handle||"NO HANDLE")}</p><h2 class="name">${escapeHtml(cast.character_name||"UNKNOWN CAST")}</h2>
    <div class="styles">${styles}</div><p class="quote">${escapeHtml(firstQuote(cast))}</p>
    <div class="stats">${stats.map(([label,value])=>`<div>${label}<b>${Number.isFinite(Number(value))&&value!==null?Number(value):"—"}</b></div>`).join("")}</div>
    <div class="exp">CONSUMED EXP ${Number(cast.experience_points)||0} / ARCANA ${escapeHtml(style)}</div></div>`;
  article.querySelector("img")?.addEventListener("error",event=>{event.currentTarget.replaceWith(Object.assign(document.createElement("span"),{className:"empty",textContent:"◇"}));});
  $("stage").replaceChildren(article);
}
function draw() {
  const available=pools.filter(t=>t.items.length);
  if(!available.length) return;
  const tier=drawTier(available), cast=pick(tier.items);
  $("status").textContent=`TRANSMISSION COMPLETE / ${tier.stars}-STAR SIGNAL`;
  render(cast,tier); $("again").hidden=false;
}
async function init() {
  try {
    // Supabase's public visibility policy is retained; never request private/unlisted records.
    const {data,error}=await supabase.from("characters").select(COLUMNS).eq("visibility","public").order("public_id",{ascending:true});
    if(error) throw error;
    const unique=new Map((data||[]).filter(c=>c.public_id).map(c=>[c.public_id,c]));
    pools=TIERS.map(t=>({...t,items:[...unique.values()].filter(c=>tierOf(Math.max(0,Number(c.experience_points)||0)).stars===t.stars)}));
    if(!unique.size) throw new Error("公開キャストがありません。");
    $("draw").disabled=false;$("draw").textContent="SUMMON / 召喚";
    $("status").textContent=`${unique.size} CASTS ONLINE / ${pools.map(t=>`${t.stars}★:${t.items.length}`).join("  ")}`;
  } catch(error) {
    console.error("Cast gacha initialization failed",error);
    $("status").textContent="キャストの読み込みに失敗しました。ページを再読み込みしてください。";
    $("draw").textContent="CONNECTION FAILED";
  }
}
$("draw").addEventListener("click",draw);
$("again").addEventListener("click",draw);
init();
