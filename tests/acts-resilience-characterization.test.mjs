import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const app = fs.readFileSync("js/acts-app.js", "utf8");

function bodyOf(name) {
  const marker = `function ${name}(`;
  const start = app.indexOf(marker);
  assert.notEqual(start, -1, `${name} must exist`);
  const brace = app.indexOf("{", start);
  let depth = 0;
  for (let i = brace; i < app.length; i += 1) {
    if (app[i] === "{") depth += 1;
    if (app[i] === "}") depth -= 1;
    if (depth === 0) return app.slice(start, i + 1);
  }
  throw new Error(`Unable to parse ${name}`);
}

test("initial ACT load always exposes explicit loading and failure messages", () => {
  const loadAll = bodyOf("loadAll");
  assert.match(loadAll, /登録キャストとアクト履歴を読み込み中/);
  assert.match(loadAll, /経験点消費履歴を読み込み中/);
  assert.match(loadAll, /キャスト情報を取得できませんでした/);
  assert.match(loadAll, /参加アクト情報を取得できませんでした/);
  assert.match(loadAll, /経験点消費履歴を取得できませんでした/);
});

test("ACT and experience mutations expose success and failure feedback", () => {
  const cases = [
    ["saveExperience", "獲得経験点を保存しました", "獲得経験点を保存できませんでした"],
    ["deleteParticipation", "参加アクト履歴を削除しました", "参加アクト履歴を削除できませんでした"],
    ["addSpending", "経験点消費履歴を追加しました", "経験点消費履歴を追加できませんでした"],
    ["onSpendingListClick", "経験点消費履歴を削除しました", "経験点消費履歴を削除できませんでした"]
  ];
  for (const [name, success, failure] of cases) {
    const body = bodyOf(name);
    assert.match(body, new RegExp(success));
    assert.match(body, new RegExp(failure));
  }
});

test("current mutation paths enter and leave the shared busy state", () => {
  for (const name of ["saveExperience", "deleteParticipation", "addSpending", "onSpendingListClick"]) {
    const body = bodyOf(name);
    assert.match(body, /setBusy\(true\)/, `${name} must enter busy state`);
    assert.match(body, /setBusy\(false\)/, `${name} must leave busy state`);
  }
});

test("confirmation remains mandatory before destructive ACT operations", () => {
  for (const name of ["deleteParticipation", "onSpendingListClick"]) {
    const body = bodyOf(name);
    assert.match(body, /await confirmAction\(/);
    assert.match(body, /if \(!ok\) return/);
  }
});
