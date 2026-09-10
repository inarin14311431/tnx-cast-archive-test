(() => {
  const prototype = URLSearchParams.prototype;
  const marker = Symbol.for("tnx.showcaseModeCompat");
  if (prototype[marker]) return;

  const nativeGet = prototype.get;
  const isCinematicPage = () => document.body?.id === "act-showcase-page"
    || /(?:^|\/)act-showcase\.html$/i.test(location.pathname);

  Object.defineProperty(prototype, marker, { value: true });
  prototype.get = function getShowcaseCompatibleParam(name) {
    const value = nativeGet.call(this, name);
    if (name !== "bgSample" || value) return value;

    // act-showcase.html is now the cinematic route by definition. Older modules
    // may still ask for the historical private bgSample flag, so provide it
    // internally without requiring a public query parameter.
    return isCinematicPage() ? "neotokyo" : value;
  };

  // Old published links may still contain showcaseMode=cinematic. Keep them
  // working, but canonicalize the visible URL because the filename now defines
  // the presentation mode.
  if (isCinematicPage()) {
    const current = new URL(location.href);
    if (String(nativeGet.call(current.searchParams, "showcaseMode") || "").toLowerCase() === "cinematic") {
      current.searchParams.delete("showcaseMode");
      history.replaceState(history.state, "", `${current.pathname}${current.search}${current.hash}`);
    }
  }
})();
