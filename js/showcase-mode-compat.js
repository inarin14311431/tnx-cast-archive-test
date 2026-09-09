(() => {
  const prototype = URLSearchParams.prototype;
  const marker = Symbol.for("tnx.showcaseModeCompat");
  if (prototype[marker]) return;

  const nativeGet = prototype.get;
  Object.defineProperty(prototype, marker, { value: true });
  prototype.get = function getShowcaseCompatibleParam(name) {
    const value = nativeGet.call(this, name);
    if (name !== "bgSample" || value) return value;

    const mode = String(nativeGet.call(this, "showcaseMode") || "").trim().toLowerCase();
    // Existing cinematic modules historically key off this private sample value.
    // Keep that compatibility internal while newly published URLs use showcaseMode=cinematic.
    return mode === "cinematic" ? "neotokyo" : value;
  };
})();
