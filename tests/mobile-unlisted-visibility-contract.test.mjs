import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const account = await readFile(new URL("../js/account.js", import.meta.url), "utf8");
const accountHtml = await readFile(new URL("../account.html", import.meta.url), "utf8");
const mobileProfile = await readFile(new URL("../js/sheet-mobile-profile.js", import.meta.url), "utf8");
const mobileNewJs = await readFile(new URL("../js/sheet-mobile-new.js", import.meta.url), "utf8");
const mobileNewHtml = await readFile(new URL("../sheet-mobile-new.html", import.meta.url), "utf8");

test("visibilityLabel maps unlisted casts to the 限定公開 label", () => {
  assert.match(account, /unlisted: "限定公開 \/ UNLISTED",/);
});

test("account owned-cast visibility filter offers 限定公開", () => {
  assert.match(accountHtml, /<option value="unlisted">限定公開<\/option>/);
});

test("mobile global visibility select offers unlisted and the load-time sync keeps public/unlisted/private as-is", () => {
  assert.match(mobileProfile, /<option value="unlisted">限定公開 \/ UNLISTED<\/option>/);
  assert.match(
    mobileProfile,
    /global\.value=\["public","unlisted"\]\.includes\(original\.value\)\?original\.value:"private"/
  );
});

test("mobile save payload keeps whatever value the global visibility select carries (including unlisted)", () => {
  assert.match(
    mobileProfile,
    /\$\("#mobile-global-visibility"\)\?\.addEventListener\("change",event=>\{const original=source\("visibility"\);if\(!original\|\|original\.value===event\.target\.value\)return;original\.value=event\.target\.value;notifyProfileChanged\(\);\}\);/
  );
});

test("mobile new-character visibility offers unlisted and is not collapsed to private", () => {
  assert.match(mobileNewHtml, /<option value="unlisted">限定公開 \/ UNLISTED<\/option>/);
  assert.match(mobileNewJs, /\["public", "unlisted"\]\.includes\(rawVisibility\) \? rawVisibility : "private"/);
});
