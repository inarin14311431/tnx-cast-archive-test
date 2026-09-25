import test from "node:test";
import assert from "node:assert/strict";
import { applyStylePresentation, applyAbilityFinals } from "../js/sheet-presentation-dom.js";

function rootFor(selectors) {
  const nodes = new Map(selectors.map(key => [key, { textContent: "old" }]));
  return { nodes, querySelector: key => nodes.get(key) };
}
test("divine names, readings and warning update and clear without HTML parsing", () => {
  const root = rootFor(["#divine-1", "#divine-1-yomi", "#divine-2", "#divine-2-yomi", "#divine-3", "#divine-3-yomi", "#style-warning"]);
  const divines = [{name:"<b>神業</b>",yomi:"よみ"},{name:"未選択",yomi:""},{name:"神意",yomi:"ミラクル"}];
  applyStylePresentation(root, {divines, warning:"未選択あり"});
  divines.forEach((d,i) => {
    assert.equal(root.querySelector("#divine-"+(i+1)).textContent,d.name);
    assert.equal(root.querySelector("#divine-"+(i+1)+"-yomi").textContent,d.yomi);
  });
  assert.equal(root.querySelector("#style-warning").textContent,"未選択あり");
  applyStylePresentation(root, {divines, warning:""});
  assert.equal(root.querySelector("#style-warning").textContent,"");
});
test("ability/control and CS outputs preserve zero and negative values", () => {
  const root = rootFor(["#reason-final","#reason-control-final","#cs-final"]);
  applyAbilityFinals(root,[["reason"]],{reason:0,"reason-control":-2,cs:7});
  assert.equal(root.querySelector("#reason-final").textContent,0);
  assert.equal(root.querySelector("#reason-control-final").textContent,-2);
  assert.equal(root.querySelector("#cs-final").textContent,7);
});
