import assert from "node:assert/strict";
import test from "node:test";
import { HANDOUT_PLACEHOLDERS, MAX_BANDS, castCards, creditItems, finaleTrailer, guestCards, heroBands, heroSubtitle, safeImageUrl, safeLinkUrl } from "../js/act-showcase-finale-b-model.js";

// What the finale pattern B ("key visual") shows, read from the model (docs/ACT_SHOWCASE_SCENES.md §6 #7, 5th pattern: finale).
const BASE = "https://example.test/act-showcase.html";
const cast = (n, extra = {}) => ({ fullName: `“ハンドル${n}” 名前${n}`, imageUrl: `https://img.test/${n}.png`, ...extra });

test("a band per cast, in order, at most six; each has its PC number, a usable picture or none, and the handle for the plain band", () => {
  for (const count of [1, 2, 3, 4, 5, 6]) {
    const bands = heroBands(Array.from({ length: count }, (_, index) => cast(index + 1)), BASE);
    assert.equal(bands.length, count);
    assert.deepEqual(bands.map(band => band.slot), Array.from({ length: count }, (_, index) => `PC${index + 1}`));
    assert.ok(bands.every(band => band.imageUrl.startsWith("https://img.test/")));
  }
  assert.equal(heroBands(Array.from({ length: 9 }, (_, index) => cast(index + 1)), BASE).length, MAX_BANDS);
  assert.deepEqual(heroBands(null), []);
  assert.deepEqual(heroBands([]), []);
});

test("a cast without a usable picture gets no imageUrl (a plain band with the handle, never the placeholder picture)", () => {
  const [none, blank, script, data, relative, named] = heroBands([
    cast(1, { imageUrl: undefined }),
    cast(2, { imageUrl: "   " }),
    cast(3, { imageUrl: "javascript:alert(1)" }),
    cast(4, { imageUrl: "data:image/svg+xml;utf8,%3Csvg%2F%3E" }),
    cast(5, { imageUrl: "./a.png" }),
    { fullName: "名前だけ", imageUrl: "" }
  ], BASE);
  assert.equal(none.imageUrl, "");
  assert.equal(blank.imageUrl, "");
  assert.equal(script.imageUrl, "");
  assert.equal(data.imageUrl, "data:image/svg+xml;utf8,%3Csvg%2F%3E");
  assert.equal(relative.imageUrl, "https://example.test/a.png");
  // the label of the plain band: the quoted handle, else the name
  assert.equal(none.label, "“ハンドル1”");
  assert.equal(named.label, "名前だけ");
  assert.doesNotMatch(JSON.stringify([none, blank, script]), /scan-failed/);
});

test("image and link URLs: http(s) only (a data: image only for images)", () => {
  assert.equal(safeImageUrl("https://a.test/x.png", BASE), "https://a.test/x.png");
  assert.equal(safeImageUrl("ftp://a.test/x.png", BASE), "");
  assert.equal(safeLinkUrl("https://a.test/cast", BASE), "https://a.test/cast");
  assert.equal(safeLinkUrl("data:text/html,x", BASE), "");
  assert.equal(safeLinkUrl("javascript:alert(1)", BASE), "");
  assert.equal(safeLinkUrl("", BASE), "");
});

test("a card per cast: the handle and the name apart, the role, the styles, at most six data rows, the link only when it is usable", () => {
  const [one, two] = castCards([
    cast(1, {
      reading: "ヨミ", tagline: "ひとこと", imageAlt: "x",
      styles: [{ label: "カブキ◎", handoutRole: true }, { label: "カゼ●" }, { label: "" }],
      meta: Array.from({ length: 8 }, (_, index) => ({ label: `L${index}`, value: `V${index}` })),
      link: { disabled: false, href: "https://a.test/c/1" }
    }),
    cast(2, { link: { disabled: true, href: "https://a.test/c/2" }, meta: [{ label: "", value: "" }] })
  ], BASE);
  assert.equal(one.slot, "PC1");
  assert.equal(one.handle, "“ハンドル1”");
  assert.equal(one.name, "名前1");
  assert.equal(one.reading, "ヨミ");
  assert.equal(one.tagline, "ひとこと");
  assert.equal(one.role, "カブキ◎");
  assert.deepEqual(one.styles, ["カブキ◎", "カゼ●"]);
  assert.equal(one.meta.length, 6);
  assert.equal(one.link, "https://a.test/c/1");
  assert.equal(two.link, "");
  assert.deepEqual(two.meta, [{ label: "DATA", value: "—" }]);
  assert.equal(two.role, "");
  assert.deepEqual(two.styles, []);
});

test("every cast has its own handout: shown with its title and text, left out when the text is empty or a placeholder", () => {
  const cards = castCards([
    cast(1, { handout: { title: "『カブキ』用ハンドアウト", body: "推奨スタイル：カブキ\nコネ：千早雅之" } }),
    cast(2, { handout: { title: "x", body: "" } }),
    cast(3, { handout: { title: "x", body: "ハンドアウト詳細は未登録です。" } }),
    cast(4, { handout: { title: "x", body: "公開用ハンドアウトは登録されていません。" } }),
    cast(5, { handout: { body: "本文だけ" } }),
    cast(6)
  ], BASE);
  assert.deepEqual(cards[0].handout, { title: "『カブキ』用ハンドアウト", body: "推奨スタイル：カブキ\nコネ：千早雅之" });
  assert.equal(cards[1].handout, null);
  assert.equal(cards[2].handout, null);
  assert.equal(cards[3].handout, null);
  assert.deepEqual(cards[4].handout, { title: "HANDOUT", body: "本文だけ" });
  assert.equal(cards[5].handout, null);
  assert.deepEqual([...HANDOUT_PLACEHOLDERS].sort(), ["ハンドアウト詳細は未登録です。", "公開用ハンドアウトは登録されていません。"]);
});

test("a name without a quoted handle is all name; a cast without a name is called CAST n", () => {
  const [plain, nameless] = castCards([{ fullName: "名前だけ" }, {}], BASE);
  assert.equal(plain.handle, "");
  assert.equal(plain.name, "名前だけ");
  assert.equal(nameless.name, "CAST 2");
});

test("the credits strip: RULER, SCENARIO WRITER and the cast, nothing for what is missing", () => {
  const items = creditItems({ rulerName: " ルーラー ", scenarioWriterName: "脚本 太郎", casts: [cast(1), cast(2)] });
  assert.deepEqual(items, [
    { label: "RULER", value: "ルーラー" },
    { label: "SCENARIO WRITER", value: "脚本 太郎" },
    { label: "CAST", value: "“ハンドル1” 名前1 / “ハンドル2” 名前2" }
  ]);
  assert.deepEqual(creditItems({ casts: [cast(1)] }), [{ label: "CAST", value: "“ハンドル1” 名前1" }]);
  assert.deepEqual(creditItems({}), []);
});

test("the sub title is left out when it is the default; the trailer and the guests come from the model, nothing when missing", () => {
  assert.equal(heroSubtitle({ heroSubTitle: "CAST SHOWCASE" }), "");
  assert.equal(heroSubtitle({ heroSubTitle: " cast showcase " }), "");
  assert.equal(heroSubtitle({ heroSubTitle: "夜明けの物語" }), "夜明けの物語");
  assert.equal(heroSubtitle({}), "");
  assert.equal(finaleTrailer({ trailer: "" }), null);
  assert.equal(finaleTrailer({}), null);
  assert.deepEqual(finaleTrailer({ trailer: "本文\n二行目", trailerTitle: "ACT TRAILER" }), { title: "アクトトレーラー", body: "本文\n二行目" });
  assert.deepEqual(finaleTrailer({ trailer: "本文", trailerTitle: "夜明け前の通信" }), { title: "夜明け前の通信", body: "本文" });
});

test("one guest card per registered guest, with the content of pattern A's guest cards; nothing for a guest without a name", () => {
  const rows = [
    { sort_order: 1, handle: "ゲスト", name: " 協力者 K ", persona_style: "トーキー", affiliation: "N◎VA市政調査局", gender: "—", age: "—", tagline: "SUPPORTING", summary: "アクトを支える協力者。\n二行目", image_url: "" },
    { sort_order: 2, handle: "", name: "", persona_style: "カブキ" },
    { sort_order: 3, handle: "“夜鷹”", name: "情報屋", persona_style: "", affiliation: "", gender: "女性", age: "24", tagline: "「見ていたよ」", summary: "", image_url: "https://example.com/g.png" }
  ];
  assert.deepEqual(guestCards(rows), [
    {
      slot: "GUEST 01",
      imageUrl: "",
      handle: "“ゲスト”",
      name: "協力者 K",
      // the persona: style name followed by ◎, like the cast styles
      personaStyle: "トーキー◎",
      // a value that is only a dash says nothing
      meta: [{ label: "AFFILIATION", value: "N◎VA市政調査局" }],
      // no quotes, as on the cast cards
      tagline: "SUPPORTING",
      summary: "アクトを支える協力者。\n二行目"
    },
    {
      // numbered among the guests shown, after the nameless row is left out; quotes are not doubled
      slot: "GUEST 02",
      imageUrl: "https://example.com/g.png",
      handle: "“夜鷹”",
      name: "情報屋",
      personaStyle: "",
      meta: [{ label: "AGE", value: "24" }, { label: "GENDER", value: "女性" }],
      tagline: "見ていたよ",
      summary: ""
    }
  ]);
  // ◎ or ● already on the value is not doubled; outer quotes and brackets come off the tagline
  assert.equal(guestCards([{ name: "X", persona_style: "カブキ◎" }])[0].personaStyle, "カブキ◎");
  assert.equal(guestCards([{ name: "X", persona_style: "カゼ●" }])[0].personaStyle, "カゼ●");
  assert.equal(guestCards([{ name: "X", tagline: "“夜を往く”" }])[0].tagline, "夜を往く");
  // only http(s) and data:image portraits
  assert.equal(guestCards([{ name: "X", image_url: "javascript:alert(1)" }])[0].imageUrl, "");
  assert.deepEqual(guestCards(undefined), []);
  assert.deepEqual(guestCards([]), []);
});
