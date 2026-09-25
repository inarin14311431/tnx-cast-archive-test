import test from "node:test";
import assert from "node:assert/strict";
import { getComboActUseLimit, isSkillCounterCombo, getComboSkills, getComboValue } from "../js/cast-combo-rules.js";
test("combo value normalization preserves zero, whitespace and fallback priority",()=>{
 assert.equal(getComboValue(null,undefined," ",0,"later"),"0");
 assert.equal(getComboValue(" first ","second"),"first");
 assert.equal(getComboValue(null,""),"");
});
test("skills prefer current text then normalized legacy names",()=>{
 assert.equal(getComboSkills({skills:" 射撃 ",skill_names:["別名"]}),"射撃");
 assert.equal(getComboSkills({skill_names:[" 射撃 ",null,"","知覚"]}),"射撃＋知覚");
 assert.equal(getComboSkills({skill_names:" 白兵 "}),"白兵");
 assert.equal(getComboSkills({}),"");
});
test("positive use limits preserve integer parsing",()=>{
 for(const value of [null,undefined,"",0,-1,"abc"]) assert.equal(getComboActUseLimit({act_use_limit:value}),null);
 assert.equal(getComboActUseLimit({act_use_limit:"3"}),3);
 assert.equal(getComboActUseLimit({act_use_limit:"2.9"}),2);
});
test("counter classification excludes any populated combo detail",()=>{
 const combo={name:"射撃",skills:"射撃",act_use_limit:3};
 assert.equal(isSkillCounterCombo(combo),true);
 for(const key of ["ability","ability_key","modifier","target_value","achievement","timing","target","range","difficulty","confrontation","description","effect"]){
  assert.equal(isSkillCounterCombo({...combo,[key]:0}),false,key);
 }
 assert.equal(isSkillCounterCombo({...combo,skills:"別名"}),false);
 assert.equal(isSkillCounterCombo({...combo,act_use_limit:0}),false);
 assert.equal(isSkillCounterCombo({}),false);
});
