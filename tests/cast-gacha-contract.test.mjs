import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const html=readFileSync(new URL("../gacha.html",import.meta.url),"utf8");
const js=readFileSync(new URL("../js/cast-gacha.js",import.meta.url),"utf8");
test("standalone gacha has no navigation integration and a dedicated entry point",()=>{
 assert.match(html,/cast-gacha\.js/);
 assert.match(html,/id="draw"/);
 assert.match(html,/id="stage"/);
});
test("only public characters are queried, no writes or persistence",()=>{
 assert.match(js,/\.eq\("visibility","public"\)/);
 assert.doesNotMatch(js,/\.insert\(|\.update\(|localStorage|sessionStorage/);
});
test("rarity thresholds and rates match the approved design",()=>{
 for(const item of ["stars:2, weight:50, min:0,max:0","stars:3,weight:30,min:1,max:99","stars:4,weight:15,min:100,max:299","stars:5,weight:5,min:300,max:Infinity"]) assert.ok(js.includes(item));
 assert.match(js,/available\.reduce\(\(sum,t\)=>sum\+t\.weight,0\)/);
});
test("persona mark and first Japanese quote are selected",()=>{
 assert.match(js,/includes\("◎"\)/);
 assert.match(js,/match\(\/「\(\[\^」\]\+\)」\//);
});
