import { canonicalizeArchiveBundle, canonicalizeCharacterSheetJsonp, diffCanonicalBundles } from '../js/character-sheet-jsonp-canonical.js';

const SUPABASE_URL='https://koprmbkoftuuffslhsvt.supabase.co';
const API_KEY=process.env.SUPABASE_PUBLISHABLE_KEY;
if(!API_KEY) throw new Error('SUPABASE_PUBLISHABLE_KEY is required');
const targets=[
['TNX-000029','ahVzfmNoYXJhY3Rlci1zaGVldHMtbXByFwsSDUNoYXJhY3RlckRhdGEYzOLfuQUM'],
['TNX-000036','ahVzfmNoYXJhY3Rlci1zaGVldHMtbXByGgsSDUNoYXJhY3RlckRhdGEYgIDgxIbq_wgM'],
['TNX-000037','ahVzfmNoYXJhY3Rlci1zaGVldHMtbXByGgsSDUNoYXJhY3RlckRhdGEYgIDg6uGwswoM'],
['TNX-000048','ahVzfmNoYXJhY3Rlci1zaGVldHMtbXByFwsSDUNoYXJhY3RlckRhdGEY5MeFhQUM'],
['TNX-000053','ahVzfmNoYXJhY3Rlci1zaGVldHMtbXByFwsSDUNoYXJhY3RlckRhdGEYitfGoAUM'],
['TNX-000054','ahVzfmNoYXJhY3Rlci1zaGVldHMtbXByFwsSDUNoYXJhY3RlckRhdGEYisT0pAUM'],
['TNX-000058','ahVzfmNoYXJhY3Rlci1zaGVldHMtbXByFwsSDUNoYXJhY3RlckRhdGEYpKm5uQUM'],
['TNX-000066','ahVzfmNoYXJhY3Rlci1zaGVldHMtbXByGgsSDUNoYXJhY3RlckRhdGEYgICQlsSK3wgM'],
['TNX-000070','ahVzfmNoYXJhY3Rlci1zaGVldHMtbXByGgsSDUNoYXJhY3RlckRhdGEYgICQyZ3I0woM'],
['TNX-000091','ahVzfmNoYXJhY3Rlci1zaGVldHMtbXByGgsSDUNoYXJhY3RlckRhdGEYgICQls3q_QgM'],
['TNX-000132','ahVzfmNoYXJhY3Rlci1zaGVldHMtbXByFwsSDUNoYXJhY3RlckRhdGEYx5G_6gQM'],
['TNX-000168','ahVzfmNoYXJhY3Rlci1zaGVldHMtbXByFwsSDUNoYXJhY3RlckRhdGEYrdTkqwUM']
];
const headers={apikey:API_KEY,Authorization:`Bearer ${API_KEY}`};
async function rest(path){const r=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{headers});if(!r.ok)throw new Error(`REST ${r.status} ${await r.text()}`);return r.json();}
function parseJsonp(text){const src=text.trim().replace(/^\/\*.*?\*\/\s*/s,'');const first=src.indexOf('('),last=src.lastIndexOf(')');let body=first>=0&&last>first?src.slice(first+1,last):src;if(body.endsWith(';'))body=body.slice(0,-1);return JSON.parse(body);}
function parseJsonData(value){if(typeof value!=='string')return value;let source=value.trim();if(source.endsWith(';'))source=source.slice(0,-1).trim();if(source.startsWith('(')&&source.endsWith(')'))source=source.slice(1,-1).trim();try{return JSON.parse(source)}catch{return value}}
function mergeWrapperMetadata(parsed,wrapper){if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return parsed;const result={...parsed};for(const key of ['outline','name','nameKana','player','display'])if((result[key]===undefined||result[key]===null||result[key]==='')&&wrapper?.[key]!==undefined)result[key]=wrapper[key];return result;}
function normalizePayload(payload){let data=payload;for(let i=0;i<6;i++){if(typeof data==='string'){const parsed=parseJsonData(data);if(parsed!==data){data=parsed;continue}break}if(data&&typeof data==='object'&&typeof data.jsonData==='string'&&data.jsonData.trim()){const parsed=parseJsonData(data.jsonData);if(parsed!==data.jsonData){data=mergeWrapperMetadata(parsed,data);continue}}if(data&&typeof data==='object'&&data.data&&typeof data.data==='object'&&!data.base&&!data.skills1&&!data.superhumanskills&&!data.weapons){data=mergeWrapperMetadata(data.data,data);continue}break}return data;}
async function warehouse(key){const cb='diag';const u=`https://character-sheets.appspot.com/tnx/display?ajax=1&key=${encodeURIComponent(key)}&callback=${cb}`;const r=await fetch(u,{headers:{'user-agent':'tnx-cast-archive-diagnostic'}});if(!r.ok)throw new Error(`warehouse ${r.status}`);return normalizePayload(parseJsonp(await r.text()));}
async function archive(publicId){const chars=await rest(`characters?select=*&public_id=eq.${encodeURIComponent(publicId)}&limit=1`);if(chars.length!==1)throw new Error(`archive character unavailable (${chars.length})`);const c=chars[0];const [skills,outfits]=await Promise.all([rest(`character_skills?select=*&character_id=eq.${c.id}&order=sort_order.asc`),rest(`character_outfits?select=*&character_id=eq.${c.id}&order=sort_order.asc`)]);return{character:c,skills,outfits};}
const totals={};let failures=0;
for(const [id,key] of targets){try{const [a,w]=await Promise.all([archive(id),warehouse(key)]);const diffs=diffCanonicalBundles(canonicalizeArchiveBundle(a),canonicalizeCharacterSheetJsonp(w));const by={};for(const d of diffs){by[d.category]=(by[d.category]||0)+1;totals[d.category]=(totals[d.category]||0)+1;}console.log(`RESULT ${id} diffs=${diffs.length} categories=${JSON.stringify(by)}`);for(const d of diffs.slice(0,30))console.log(`DIFF ${id} ${d.category} :: ${d.path} :: archive=${JSON.stringify(d.archive)} :: warehouse=${JSON.stringify(d.warehouse)}`);if(diffs.length>30)console.log(`DIFF ${id} ... ${diffs.length-30} more`);}catch(e){failures++;console.log(`ERROR ${id} ${e.message||e}`)}}
console.log(`TOTAL categories=${JSON.stringify(totals)} failures=${failures}`);
