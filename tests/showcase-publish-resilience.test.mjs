import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const app = fs.readFileSync("js/showcase-dynamic-publish.js", "utf8");

test("showcase publishing uses the shared finite RPC timeout boundary", () => {
  assert.match(app, /withRequestTimeout/);
  assert.match(app, /async-timeout\.js\?v=1/);
  assert.match(app, /publish_act_showcase_for_current_user/);
  assert.doesNotMatch(app, /class PublishTimeoutError/);
});

test("showcase publish timeout is reported as uncertain completion", () => {
  assert.match(app, /公開結果を確認できませんでした/);
  assert.match(app, /再読み込みして公開状態と参加履歴を確認してください/);
});

test("publish button state is always restored", () => {
  assert.match(app, /finally\s*\{/);
  assert.match(app, /publishing = false/);
  assert.match(app, /currentButton\.disabled = !String\(preview\?\.srcdoc/);
});

test("destructive or duplicate retry is not performed automatically", () => {
  assert.doesNotMatch(app, /retryPublish|retryRpc|setInterval/);
});
