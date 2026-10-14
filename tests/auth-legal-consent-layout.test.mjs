import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const authCss = await readFile(new URL("../css-next/pages/auth.css", import.meta.url), "utf8");
const authEntry = await readFile(new URL("../css-next/pages/auth-entry.css", import.meta.url), "utf8");
const legalCss = await readFile(new URL("../css-next/components/legal-notices.css", import.meta.url), "utf8");
const indexCss = await readFile(new URL("../css-next/index.css", import.meta.url), "utf8");

// legal-notices.css lives in the `app` layer, auth.css in the later `auth-page` layer. A later layer
// wins regardless of specificity, so `.auth-form label { display: grid }` in auth.css overrode the
// consent row's `display: flex` and pushed the checkbox above the text, centred.
test("consent row layout is restored inside the auth-page layer", () => {
  assert.match(indexCss, /legal-notices\.css[^;]*;/);
  assert.match(authEntry, /@layer app, auth-page;/);
  assert.match(authEntry, /auth\.css\?v=4"\) layer\(auth-page\)/);
  const rule = authCss.match(/\.auth-form label\.legal-consent\s*\{([^}]*)\}/);
  assert.ok(rule, "auth.css must set the consent row layout itself");
  assert.match(rule[1], /display:\s*flex/);
  assert.match(rule[1], /align-items:\s*flex-start/);
});

// `.auth-form button` (min-height 54px, margin-top 8px) is also in auth-page, so it beat the link-button
// reset in legal-notices.css and made the consent line tall with the text pushed down.
test("consent link buttons are reset inside the auth-page layer", () => {
  const rule = authCss.match(/\.auth-form \.legal-consent__links > button\s*\{([^}]*)\}/);
  assert.ok(rule, "auth.css must reset the consent link buttons itself");
  assert.match(rule[1], /min-height:\s*auto/);
  assert.match(rule[1], /margin:\s*0/);
});

test("consent row rule comes after the generic grid label rule and the checkbox keeps its own sizing", () => {
  assert.ok(authCss.indexOf(".auth-form label.legal-consent") > authCss.indexOf(".auth-form label { display: grid"));
  assert.match(legalCss, /\.legal-consent input\s*\{[^}]*width:\s*auto/s);
});

test("login and password-reset load the bumped auth entry", async () => {
  for (const page of ["login.html", "password-reset.html"]) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    assert.match(html, /auth-entry\.css\?v=3/);
  }
});
