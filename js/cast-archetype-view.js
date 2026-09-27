/* Public-view presentation for the style skill panel.
 * Presentation only: data rendering belongs to cast-style-skills.js.
 * Hero styles and divine works are rendered as final markup by cast.js (cast-hero-view.js).
 */
(function () {
  const content = document.querySelector("#cast-content");
  const enhanceBase = () => { enhanceStyleSkillPanel(); };
  if (!content || !content.hidden) {
    enhanceBase();
  } else {
    window.addEventListener("tnx:cast-rendered", enhanceBase, { once: true });
  }
  document.addEventListener("tnx:style-skills-rendered", enhanceStyleSkillPanel);

  function enhanceStyleSkillPanel() {
    const panel = document.querySelector("#style-skill-panel");
    const table = panel?.querySelector(".style-skill-view-table");
    if (!panel || !table) return;
    panel.classList.add("cast-style-skill-analysis");
    const heading = panel.querySelector(".data-panel__header h2");
    if (heading) heading.innerHTML = 'スタイル技能 <small>STYLE SKILLS</small>';
  }
})();
