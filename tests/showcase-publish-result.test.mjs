import test from "node:test";
import assert from "node:assert/strict";
import {
  SHOWCASE_HASHTAG, buildSharePostText, buildXIntentUrl, modeLabel, otherMode, normalizeSlug,
  emptyPublishedState, afterPublished, afterRestored, isRepublish
} from "../js/showcase-publish-result-core.js";

test("the post text is the title, the hashtag on the next line, with the subtitle after the title", () => {
  assert.equal(buildSharePostText({ actName: "ネオンの残像" }), `『ネオンの残像』のアクト紹介を公開しました\n${SHOWCASE_HASHTAG}`);
  assert.equal(buildSharePostText({ actName: "ネオンの残像", subtitle: " 夜明け前 " }), `『ネオンの残像 ― 夜明け前』のアクト紹介を公開しました\n${SHOWCASE_HASHTAG}`);
  assert.equal(buildSharePostText({ actName: "A", subtitle: "  " }), `『A』のアクト紹介を公開しました\n${SHOWCASE_HASHTAG}`);
  assert.equal(buildSharePostText({ actName: "A" }, "#別のタグ"), "『A』のアクト紹介を公開しました\n#別のタグ");
});

test("the X link carries the encoded text and URL", () => {
  const url = "https://example.test/act-showcase.html?id=a-1&theme=nova";
  const link = new URL(buildXIntentUrl({ actName: "題&名", subtitle: "副", url }));
  assert.equal(`${link.origin}${link.pathname}`, "https://x.com/intent/post");
  assert.equal(link.searchParams.get("url"), url);
  assert.equal(link.searchParams.get("text"), `『題&名 ― 副』のアクト紹介を公開しました\n${SHOWCASE_HASHTAG}`);
  assert.ok(buildXIntentUrl({ actName: "x", url }).includes(encodeURIComponent(url)));
});

test("version labels", () => {
  assert.equal(modeLabel("standard"), "スタンダード版");
  assert.equal(modeLabel("cinematic"), "豪華版");
  assert.equal(modeLabel("anything"), "豪華版");
  assert.equal(otherMode("standard"), "cinematic");
  assert.equal(otherMode("cinematic"), "standard");
});

test("a published act turns the button of the published version into a republish button", () => {
  let state = emptyPublishedState();
  assert.equal(isRepublish(state, "act-1", "cinematic"), false);
  state = afterPublished(state, "act-1", "cinematic");
  assert.equal(isRepublish(state, "act-1", "cinematic"), true);
  assert.equal(isRepublish(state, "act-1", "standard"), false);
  assert.equal(isRepublish(state, "ACT 1", "cinematic"), true, "the slug is compared the way the publisher normalizes it");
  assert.equal(isRepublish(state, "act-2", "cinematic"), false, "another identifier is a new act");
  assert.equal(isRepublish(state, "", "cinematic"), false);
  state = afterPublished(state, "act-1", "standard");
  assert.equal(isRepublish(state, "act-1", "standard"), true);
  assert.equal(isRepublish(state, "act-1", "cinematic"), true);
  state = afterPublished(state, "act-2", "standard");
  assert.equal(isRepublish(state, "act-1", "cinematic"), false);
  assert.equal(isRepublish(state, "act-2", "cinematic"), false);
});

test("an act loaded for editing reads as published in both versions", () => {
  const state = afterRestored("my-act");
  assert.equal(isRepublish(state, "my-act", "cinematic"), true);
  assert.equal(isRepublish(state, "my-act", "standard"), true);
  assert.equal(isRepublish(state, "other", "standard"), false);
  assert.equal(normalizeSlug("My Act!"), "my-act");
});
