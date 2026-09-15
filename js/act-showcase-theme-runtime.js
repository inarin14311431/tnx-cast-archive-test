(() => {
  const definitions = Object.freeze({
    nova: Object.freeze({ id: "nova", label: "トーキョーＮ◎ＶＡ", colorScheme: "dark" }),
    intron: Object.freeze({ id: "intron", label: "イントロン", colorScheme: "light" }),
    vlad: Object.freeze({ id: "vlad", label: "ヴラド・コロニー", colorScheme: "dark" }),
    lutetia: Object.freeze({ id: "lutetia", label: "ヴィル・ヌーヴ・ルテチア", colorScheme: "dark" })
  });
  const defaultId = "nova";
  const params = new URLSearchParams(location.search);
  const requested = String(params.get("theme") || "").trim().toLowerCase();
  const explicitQuery = Object.prototype.hasOwnProperty.call(definitions, requested);

  function normalize(value) {
    const id = String(value || "").trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(definitions, id) ? id : defaultId;
  }

  function apply(value, source = "runtime") {
    const id = normalize(value);
    const theme = definitions[id];
    document.documentElement.dataset.showcaseTheme = id;
    document.documentElement.style.colorScheme = theme.colorScheme;
    document.dispatchEvent(new CustomEvent("tnx:showcase-theme-change", {
      detail: { theme: id, source }
    }));
    return id;
  }

  function applySaved(value) {
    if (explicitQuery) return apply(requested, "query");
    return apply(value, "showcase-data");
  }

  globalThis.TNX_SHOWCASE_THEME = Object.freeze({
    defaultId,
    themes: definitions,
    normalize,
    apply,
    applySaved,
    hasExplicitQuery: explicitQuery,
    current() {
      return normalize(document.documentElement.dataset.showcaseTheme);
    }
  });

  apply(explicitQuery ? requested : defaultId, explicitQuery ? "query" : "default");
})();
