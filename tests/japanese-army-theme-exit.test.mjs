import test from "node:test";
import assert from "node:assert/strict";

function makeRegistry() {
  const themes = [
    { id: "nova", label: "NOVA", colorScheme: "dark" },
    { id: "japanese-army", label: "日本", colorScheme: "dark" }
  ];
  const byId = new Map(themes.map(theme => [theme.id, theme]));
  return {
    themes,
    defaultId: "nova",
    has: id => byId.has(id),
    get: id => byId.get(id)
  };
}

function makeElement(tag) {
  let html = "";
  return {
    tagName: tag,
    className: "",
    dataset: {},
    style: {},
    appendedChildren: [],
    get innerHTML() { return html; },
    set innerHTML(value) { html = value; },
    append(...nodes) { this.appendedChildren.push(...nodes); },
    addEventListener() {},
    querySelector() { return null; },
    closest() { return null; }
  };
}

async function loadThemeScript({ page }) {
  const body = makeElement("body");
  body.dataset.page = page;
  const documentElement = makeElement("html");

  globalThis.TNX_THEME_REGISTRY = makeRegistry();
  globalThis.localStorage = { getItem: () => null, setItem() {} };
  globalThis.document = {
    body,
    documentElement,
    readyState: "complete",
    addEventListener() {},
    querySelector: selector => (selector === "[data-japanese-army-overlay]" ? null : null),
    querySelectorAll: () => [],
    createElement: elementTag => makeElement(elementTag),
    dispatchEvent() {}
  };

  await import(`../js/css-next-theme.js?test=${Date.now()}-${Math.random()}`);

  const overlay = body.appendedChildren.find(node => node.className === "japanese-army-overlay");
  return { body, overlay };
}

test("japanese-army overlay always includes a home link back to index.html on non-index pages", async () => {
  const { overlay } = await loadThemeScript({ page: "account.html" });
  assert.ok(overlay, "overlay should be appended to body");
  assert.match(overlay.innerHTML, /<a class="japanese-army-home-link" href="\.\/index\.html">ホームへ戻る \/ RETURN HOME<\/a>/);
  assert.doesNotMatch(overlay.innerHTML, /data-theme-select/, "non-index pages must not regain the theme picker");
});

test("japanese-army overlay keeps the theme picker on the index page, alongside the home link", async () => {
  const { overlay } = await loadThemeScript({ page: "index.html" });
  assert.ok(overlay);
  assert.match(overlay.innerHTML, /<select data-theme-select aria-label="表示テーマ"><\/select>/);
  assert.match(overlay.innerHTML, /<a class="japanese-army-home-link" href="\.\/index\.html">ホームへ戻る \/ RETURN HOME<\/a>/);
});

test("japanese-army overlay leaves the existing warning content untouched", async () => {
  const { overlay } = await loadThemeScript({ page: "cast.html" });
  assert.match(overlay.innerHTML, /日本国電脳鎖国結界/);
  assert.match(overlay.innerHTML, /不法接続/);
  assert.match(overlay.innerHTML, /NATIONAL BORDER FIREWALL \/\/ ACCESS VIOLATION RECORDED/);
});
