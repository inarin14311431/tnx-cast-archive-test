import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {createOutputCss, normalizeShowcaseTheme} from "../js/showcase-output-css.js";
// SHA256 baselines captured from the pre-extraction generator, not the new module.
const baselines = [
  {
    "theme": "nova",
    "background": "",
    "sha256": "2305f306659c7a3ea9c132aebd38f52f68fd439cdcdae4379da9eb9e8c827714"
  },
  {
    "theme": "nova",
    "background": "background-image:url('fixture.webp');",
    "sha256": "98f260e3a7675a8118c24cb540ae6454bedc32534bf8059b32ad8aeb6e3eafc7"
  },
  {
    "theme": "intron",
    "background": "",
    "sha256": "254736e3de2bc516f0b724ff9b36311a4acdf8026641df0ec090ffed67299946"
  },
  {
    "theme": "intron",
    "background": "background-image:url('fixture.webp');",
    "sha256": "2aa0b6657e5add7ba1bfaaa16a1044d78794b473f41420ab8e14911cefd55cca"
  },
  {
    "theme": "vlad",
    "background": "",
    "sha256": "53f186d14f4959ea4a5f6a869cfd9a2e51391ef87539d99ed13bad53c48289bb"
  },
  {
    "theme": "vlad",
    "background": "background-image:url('fixture.webp');",
    "sha256": "543c7c5d40d842bc5f3593c41da5ba52522b6775dbc434a290044047f7033a3f"
  },
  {
    "theme": "lutetia",
    "background": "",
    "sha256": "6cc92d3c48a7af654dfe12041136d3fe637ab78a6c38d29bcbd0d4f9422192bf"
  },
  {
    "theme": "lutetia",
    "background": "background-image:url('fixture.webp');",
    "sha256": "c4fdb14a5efa3315f4f6c4d1978fd8bbf60051f5e3dcc961cd99c8a4aa49542a"
  }
];
for(const {theme,background,sha256} of baselines){
 test("unchanged generated CSS: "+theme+" / "+(background?"image":"none"),()=>{
  assert.equal(createHash("sha256").update(createOutputCss(background,theme)).digest("hex"),sha256);
 });
}
test("theme normalization keeps existing fallback",()=>{
 assert.equal(normalizeShowcaseTheme(" VLAD "),"vlad");
 for(const value of [null,undefined,"","unknown"])assert.equal(normalizeShowcaseTheme(value),"nova");
});
