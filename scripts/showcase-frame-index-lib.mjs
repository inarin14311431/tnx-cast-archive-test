// Where is a class created? -> which scene frame's section does it end up in?
// Evidence, strongest first:
//   table  : the enclosing function is listed in FUNCTION_FRAME (the screen builders of act-showcase-neotokyo.js)
//   anchor : the enclosing function (or, when it has none, the file) names the elements of exactly one frame
//            (screen--title, screen--summary, ... / #poster-...)
//   html   : the class is written in act-showcase*.html (inside #act-showcase-root -> finale)
// Name words (the old way) are NOT evidence; the caller falls back to them only as a "weak" guess.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// the screen builders of js/act-showcase-neotokyo.js (checked against markScene() calls and docs/ACT_SHOWCASE_SCENES.md §3)
export const FUNCTION_FRAME = {
  "act-showcase-neotokyo.js::showOpening": "loading",
  "act-showcase-neotokyo.js::replaceStage": "loading",   // builds the screen--opening section (loading frame)
  "act-showcase-neotokyo.js::showActTitle": "title",
  "act-showcase-neotokyo.js::createRulerCredit": "title",
  "act-showcase-neotokyo.js::showTrailer": "trailer",
  "act-showcase-neotokyo.js::showHandoutAndAssign": "handout-assign",
  "act-showcase-neotokyo.js::createHandoutHeading": "handout-assign",
  "act-showcase-neotokyo.js::createAssignedCast": "handout-assign",
  "act-showcase-neotokyo.js::createRoleSlot": "handout-assign",
  "act-showcase-neotokyo.js::createStyleRow": "handout-assign",
  "act-showcase-neotokyo.js::createStyleMark": "handout-assign",
  "act-showcase-neotokyo.js::showSummary": "ready",
  "act-showcase-neotokyo.js::createSummaryRuler": "ready",
  "act-showcase-neotokyo.js::createSummaryCast": "ready"
};
// the page itself / the overlay's shared parts: no frame owns them
export const OUTSIDE_FUNCTIONS = new Set(["createSequenceShell", "createSequenceState", "swapScreen", "setProgress", "waitForAdvance", "prepareNeoTokyoLoading", "runNeoTokyoIntro"]);

const ANCHORS = [
  ["title", /screen--title(?![\w-]*logo)|neotokyo-sequence__act-title|ruler-credit|act-subtitle/],
  ["trailer", /screen--trailer|readout--split|trailer-readout/],
  ["handout-assign", /screen--linked|cast--linked|role-slot|__assign-panel|style-card|__styles(?![\w-])|handout-live/],
  ["ready", /screen--summary|screen--finale|summary-cast|summary-ruler|summary-head|neotokyo-finale__(?!access)/],
  ["finale", /#poster-|poster-v2-|poster-supporting|#opening-|#act-showcase-root|ambient-stage/],
  ["loading", /screen--opening|bootlog/]
];

// a helper that is only called from an `if (...screen--X...)` line builds into that screen (e.g. enhanceScreen -> enhanceTrailer)
const SCREEN_FRAME = { opening: "loading", title: "title", trailer: "trailer", linked: "handout-assign", summary: "ready", finale: "ready" };

const FN_START = [
  /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
  /^\s*(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>/
];
const CREATES = /\bnode\(|createElement|className\s*=|classList\.(?:add|toggle)|class=|textNode\(|\.className/;

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) walk(p, out); else if (n.endsWith(".js")) out.push(p); }
  return out;
}

export function buildIndex(root) {
  const files = walk(join(root, "js")).map(p => ({ path: p, rel: p.slice(join(root, "js").length + 1), lines: readFileSync(p, "utf8").split("\n") }));
  const zones = new Map(); // file -> [{name, from, to, text}]
  for (const f of files) {
    const z = []; let cur = { name: "(file)", from: 0 };
    f.lines.forEach((l, i) => { for (const re of FN_START) { const m = l.match(re); if (m) { cur.to = i; z.push(cur); cur = { name: m[1], from: i }; break; } } });
    cur.to = f.lines.length; z.push(cur);
    for (const zz of z) zz.text = f.lines.slice(zz.from, zz.to).join("\n");
    zones.set(f.rel, z);
  }
  const html = readdirSync(root).filter(n => /^act-showcase.*\.html$/.test(n)).map(n => ({ n, text: readFileSync(join(root, n), "utf8") }));
  const cache = new Map();
  // frames of a helper from how it is reached: a line that names a screen class and the helper (`if (screen--trailer) enhance(...)`,
  // `querySelectorAll(".screen--linked").forEach(decorate)`), or, one level up, the zones that call it
  const callerFrames = (f, z, seen = new Set()) => {
    if (z.name === "(file)" || seen.has(z.name)) return [];
    seen.add(z.name);
    const named = new RegExp(`\\b${z.name}\\b`);
    const direct = new Set();
    for (const l of f.lines) { const s = l.match(/screen--(opening|title|trailer|linked|summary|finale)\b/); if (s && named.test(l)) direct.add(SCREEN_FRAME[s[1]]); }
    if (direct.size) return [...direct];
    const up = new Set();
    for (const w of zones.get(f.rel)) {
      if (w.name === z.name || w.name === "(file)" || !new RegExp(`\\b${z.name}\\(`).test(w.text)) continue;
      for (const fr of callerFrames(f, w, seen)) up.add(fr);
    }
    return [...up];
  };
  const frameOfZone = (rel, z, f) => {
    const key = `${rel}::${z.name}`;
    if (FUNCTION_FRAME[key]) return { frames: [FUNCTION_FRAME[key]], kind: "table" };
    if (rel === "act-showcase-neotokyo.js" && OUTSIDE_FUNCTIONS.has(z.name)) return { frames: ["outside"], kind: "table" };
    const callers = callerFrames(f, z);
    if (callers.length === 1) return { frames: callers, kind: "caller" };
    const hit = ANCHORS.filter(([, re]) => re.test(z.text)).map(([f]) => f);
    if (hit.length === 1) return { frames: hit, kind: "anchor" };
    // a decorator that reaches into one frame by its screen class but names a helper class of another: keep both, weak
    return hit.length ? { frames: hit, kind: "multi" } : { frames: [], kind: "none" };
  };
  return {
    evidence(token) {
      if (cache.has(token)) return cache.get(token);
      const re = new RegExp(`(?<![\\w-])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`);
      const sites = [];
      for (const f of files) for (const z of zones.get(f.rel)) {
        for (let i = z.from; i < z.to; i++) {
          if (!re.test(f.lines[i])) continue;
          const { frames, kind } = frameOfZone(f.rel, z, f);
          sites.push({ where: `${f.rel}:${i + 1}`, fn: z.name, creates: CREATES.test(f.lines[i]), frames, kind });
        }
      }
      const inHtml = html.filter(h => re.test(h.text)).map(h => h.n);
      const r = { sites, inHtml };
      cache.set(token, r);
      return r;
    }
  };
}

// Frame of one #id: written in act-showcase.html after the opening tag of #act-showcase-root -> finale (the page)
export function frameOfId(root, id) {
  const text = readFileSync(join(root, "act-showcase.html"), "utf8");
  const at = text.indexOf('id="act-showcase-root"');
  if (id === "act-showcase-root") return { frame: "finale", tier: "html-id", why: "act-showcase.html" };
  if (at >= 0 && text.indexOf(`id="${id}"`, at) > at) return { frame: "finale", tier: "html-id", why: `act-showcase.html #${id}` };
  return { frame: null, tier: null, why: "id not in act-showcase.html root" };
}

// Frame of one class token: { frame, tier: "table"|"anchor"|"html"|null, why }
export function frameOfToken(index, token) {
  const ev = index.evidence(token);
  const creating = ev.sites.filter(s => s.creates);
  const pool = creating.length ? creating : ev.sites;
  for (const kind of ["table", "caller", "anchor"]) {
    const fs = [...new Set(pool.filter(s => s.kind === kind).flatMap(s => s.frames))];
    if (fs.length === 1) return { frame: fs[0], tier: kind, why: pool.find(s => s.kind === kind && s.frames[0] === fs[0]).where };
    if (fs.length > 1) return { frame: null, tier: "multi", frames: fs, why: `${kind}: ${fs.join("/")}` };
  }
  if (ev.inHtml.length) return { frame: "finale", tier: "html", why: ev.inHtml[0] };
  return { frame: null, tier: null, why: ev.sites.length ? "only unclear sites" : "no creation site" };
}
