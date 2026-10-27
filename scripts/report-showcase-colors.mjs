/* Report (not a gate): the hardcoded colors of the ACT SHOWCASE stylesheets per scene frame, split into the
 * core/scenes layers and the theme layers, with how many are black/white. Usage: node scripts/report-showcase-colors.mjs [--values]
 * Counting follows audit:colors, except that rgba(var(--x), a) (a color that already goes through a theme variable) is not
 * counted. The frame of a rule is read from its scope (:where([data-scene=...])) or, for a rule that is not scoped yet, from
 * where its element is created (scripts/showcase-frame-index-lib.mjs), so the numbers for unscoped layers are an estimate.
 * The ratchet that keeps the count from growing is audit:showcase-colors. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildIndex, frameOfToken, frameOfId } from "./showcase-frame-index-lib.mjs";
const root = new URL("../", import.meta.url).pathname;
const index = buildIndex(root);
const HEX = /(?<![\w&])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})(?![\w-])/gi;
const FN = /(?<![\w-])(?:rgb|hsl)a?\(\s*(?!var\()[^)]*\)/gi;
const FILES = [["core", "css-next/pages/act-showcase-core.css"], ["scenes", "css-next/pages/act-showcase-scenes.css"],
  ["theme", "css-next/pages/act-showcase-theme-scenes.css"], ["theme", "css-next/pages/act-showcase-theme-surface-system.css"],
  ["theme", "css-next/pages/act-showcase-theme-legibility.css"], ["theme", "css-next/pages/act-showcase-theme-phase-contract.css"]];
const isBW = c => /^#(?:0{3,8}|f{3,8}|000f|ffff)$/i.test(c) || /^rgba?\(\s*(?:0\s*,\s*0\s*,\s*0|255\s*,\s*255\s*,\s*255)\s*[,)]/i.test(c) || /^(black|white)$/i.test(c);
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, " ");
function rules(text) {
  text = strip(text); const out = []; let i = 0; let inKf = false;
  function go(kf) {
    while (i < text.length) {
      let j = i, par = 0, q = null;
      for (; j < text.length; j++) { const c = text[j]; if (q) { if (c === q) q = null; continue; } if (c === '"' || c === "'") { q = c; continue; } if (c === "(" || c === "[") par++; else if (c === ")" || c === "]") par--; else if (!par && (c === "{" || c === "}" || c === ";")) break; }
      if (j >= text.length) return; const c = text[j];
      if (c === "}") { i = j + 1; return; } if (c === ";") { i = j + 1; continue; }
      const pre = text.slice(i, j).trim();
      if (/^@(media|supports)/.test(pre)) { i = j + 1; go(kf); continue; }
      let d = 1, k = j + 1, qq = null; for (; k < text.length && d; k++) { const ch = text[k]; if (qq) { if (ch === qq) qq = null; continue; } if (ch === '"' || ch === "'") qq = ch; else if (ch === "{") d++; else if (ch === "}") d--; }
      const body = text.slice(j + 1, k - 1);
      if (/^@keyframes/.test(pre)) out.push({ pre: "@keyframes", body, kf: true }); else if (!pre.startsWith("@")) out.push({ pre, body });
      i = k;
    }
  }
  go(false); return out;
}
function colorsIn(body) {
  let b = body.replace(/--[\w-]+\s*:[^;{}]*/g, " ");              // custom property definitions
  b = b.replace(/var\(\s*--[\w-]+\s*,\s*([^()]*(?:\([^()]*\)[^()]*)*)\)/g, "var(--x)"); // var() fallbacks
  return [...(b.match(HEX) ?? []), ...(b.match(FN) ?? []), ...(b.match(/(?<![\w-])(?:black|white)(?![\w-])/gi) ?? [])];
}
const frameOfSelector = pre => {
  const m = pre.match(/\[data-scene="([^"]+)"\]\[data-scene-pattern="a"\]/); if (m) return m[1];
  const ids = [...pre.matchAll(/#([\w-]+)/g)].map(x => x[1]); for (const id of ids) { const r = frameOfId(root, id); if (r.frame) return r.frame; }
  const toks = [...pre.split(",")[0].matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map(x => x[1]).reverse();
  for (const t of toks) { const r = frameOfToken(index, t); if (r.frame && r.frame !== "outside") return r.frame; if (r.frame === "outside") return "(overlay)"; }
  return "(page/unclassified)";
};
const table = {}; const themeSpecific = {};
for (const [layer, file] of FILES) for (const r of rules(readFileSync(join(root, file), "utf8"))) {
  const cs = colorsIn(r.body); if (!cs.length) continue;
  const fr = r.kf ? "(@keyframes)" : frameOfSelector(r.pre);
  const row = (table[fr] ??= { core_scenes: 0, theme: 0, bw: 0, rules: 0 });
  row.rules++; row[layer === "theme" ? "theme" : "core_scenes"] += cs.length; row.bw += cs.filter(isBW).length;
  if (layer === "theme" && /data-showcase-theme="/.test(r.pre)) themeSpecific[fr] = (themeSpecific[fr] ?? 0) + cs.length;
}
const order = ["loading", "title", "trailer", "handout-assign", "ready", "finale", "(overlay)", "(page/unclassified)", "(@keyframes)"];
const tot = { c: 0, t: 0, b: 0, r: 0 };
console.log("frame".padEnd(22), "core+scenes", "theme", "black/white", "rules-with-color", "theme-specific");
for (const f of order.filter(x => table[x]).concat(Object.keys(table).filter(x => !order.includes(x)))) {
  const r = table[f]; tot.c += r.core_scenes; tot.t += r.theme; tot.b += r.bw; tot.r += r.rules;
  console.log(f.padEnd(22), String(r.core_scenes).padStart(10), String(r.theme).padStart(6), String(r.bw).padStart(10), String(r.rules).padStart(14), String(themeSpecific[f] ?? 0).padStart(14));
}
console.log("TOTAL".padEnd(22), String(tot.c).padStart(10), String(tot.t).padStart(6), String(tot.b).padStart(10), String(tot.r).padStart(14));

if (process.argv.includes("--values")) {
  const hist = {}; const perFrame = {};
  const norm = c => c.toLowerCase().replace(/\s+/g, "").replace(/rgba\((\d+),(\d+),(\d+),[^)]*\)/, "rgba($1,$2,$3,a)");
  for (const [layer, file] of FILES.filter(f => f[0] !== "theme")) for (const r of rules(readFileSync(join(root, file), "utf8"))) {
    const fr = r.kf ? "(@keyframes)" : frameOfSelector(r.pre);
    for (const c of colorsIn(r.body)) { const k = norm(c); hist[k] = (hist[k] ?? 0) + 1; perFrame[fr] ??= {}; perFrame[fr][k] = (perFrame[fr][k] ?? 0) + 1; }
  }
  const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]);
  console.log("\nmost used values (core+scenes):"); console.log(top(hist).slice(0, 22).map(([k, v]) => `${k} ${v}`).join("\n"));
  for (const f of order.filter(x => perFrame[x])) console.log(`\n${f}:`, top(perFrame[f]).map(([k, v]) => `${k}x${v}`).join("  "));
}
