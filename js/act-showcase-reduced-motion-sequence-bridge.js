(() => {
  const params = new URLSearchParams(location.search);
  if (String(params.get("bgSample") || "").trim().toLowerCase() !== "neotokyo") return;
  if (typeof window.matchMedia !== "function") return;

  const nativeMatchMedia = window.matchMedia.bind(window);
  const reduceQuery = "(prefers-reduced-motion: reduce)";
  const reduced = nativeMatchMedia(reduceQuery).matches;
  if (!reduced) return;

  document.body?.classList.add("showcase-neotokyo-reduced");

  let bypassConsumed = false;
  window.matchMedia = query => {
    const result = nativeMatchMedia(query);
    const normalized = String(query || "").replace(/\s+/g, "").toLowerCase();
    if (!bypassConsumed && normalized === "(prefers-reduced-motion:reduce)") {
      bypassConsumed = true;
      queueMicrotask(() => {
        window.matchMedia = nativeMatchMedia;
      });
      return new Proxy(result, {
        get(target, property) {
          if (property === "matches") return false;
          const value = Reflect.get(target, property, target);
          return typeof value === "function" ? value.bind(target) : value;
        }
      });
    }
    return result;
  };
})();
