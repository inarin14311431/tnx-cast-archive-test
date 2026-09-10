const current = new URL(location.href);
const hadBackgroundSample = current.searchParams.has("bgSample");
const legacyMode = String(current.searchParams.get("showcaseMode") || "").toLowerCase();

// The cinematic route is defined by act-showcase.html. A temporary legacy flag is
// exposed only while older presentation modules initialize; browser APIs are never patched.
if (!hadBackgroundSample) current.searchParams.set("bgSample", "neotokyo");
if (legacyMode === "cinematic") current.searchParams.delete("showcaseMode");
history.replaceState(history.state, "", `${current.pathname}${current.search}${current.hash}`);

await import("./act-showcase-cinematic-enhancer.js?v=3");
await import("./act-showcase-summary-advance-guard.js?v=1");
await import("./act-showcase-finale-enhancer.js?v=1");
await import("./act-showcase-cinematic-polish.js?v=20260910a");
await import("./act-showcase-board-layout.js?v=20260908b");
await import("./act-showcase-story-flow.js?v=20260908b");
await import("./act-showcase-writing-patterns.js?v=20260908b");
await import("./act-showcase-visual-caption-code.js?v=3");
await import("./act-showcase-tagline-quotes.js?v=2");
await import("./act-showcase-cinematic-layout-v2.js?v=6");
await import("./act-showcase-page.js?v=20260910a");
await import("./act-showcase-supporting-cast.js?v=4");

if (!hadBackgroundSample) {
  const canonical = new URL(location.href);
  canonical.searchParams.delete("bgSample");
  history.replaceState(history.state, "", `${canonical.pathname}${canonical.search}${canonical.hash}`);
}
