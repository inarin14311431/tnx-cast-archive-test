(() => {
  function initializeAbilityValuesToggle() {
    const root = document.body;
    if (!root || root.dataset.abilityValuesToggleInitialized === "1") return;
    root.dataset.abilityValuesToggleInitialized = "1";

    document.addEventListener("click", event => {
      const button = event.target.closest("[data-ability-values-toggle]");
      if (!button) return;
      event.preventDefault();
      const visible = !root.classList.contains("is-ability-values-visible");
      root.classList.toggle("is-ability-values-visible", visible);
      document.querySelectorAll("[data-ability-values-toggle]").forEach(toggle => {
        toggle.setAttribute("aria-pressed", String(visible));
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initializeAbilityValuesToggle, { once: true });
  else initializeAbilityValuesToggle();
})();
