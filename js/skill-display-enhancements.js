/* Shared presentation rules for skills in editor, viewer and quick sheet. */
(() => {
  if (window.TNXSkillDisplayEnhancementsLoaded) return;
  window.TNXSkillDisplayEnhancementsLoaded = true;

  const STYLE_SEPARATOR = "[[STYLE_SEPARATOR]]";
  const BASE_SKILLS = new Set(["医療","射撃","知覚","電脳","心理","自我","交渉","運動","回避","白兵","信用","圧力","隠密"]);
  const cleanName = value => String(value || "").trim().replace(/^★\s*/, "");
  const isBase = value => BASE_SKILLS.has(cleanName(value));

  const style = document.createElement("style");
  style.textContent = `
    .tnx-base-skill-name{display:flex;align-items:center;gap:2px;min-width:0}
    .tnx-base-skill-star{flex:0 0 auto;color:var(--color-accent);font-weight:900;line-height:1}
    .tnx-base-skill-name>input{min-width:0;flex:1 1 auto}
    tr.tnx-style-separator-row>td{padding:7px 10px!important;border-top:1px solid var(--color-accent)!important;border-bottom:1px solid color-mix(in srgb,var(--color-accent) 38%,transparent)!important;background:color-mix(in srgb,var(--color-accent) 7%,transparent)!important;color:var(--color-accent);font-weight:800;letter-spacing:.04em}
    .tnx-style-separator-content{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%}
    .tnx-style-separator-content small{font-size:9px;letter-spacing:.12em;opacity:.58}
    .tnx-style-separator-actions{margin-left:auto;display:flex;gap:3px}
    .quick-sheet tr.tnx-style-separator-row>td{padding:4px 7px!important;font-size:10px}
  `;
  document.head.append(style);

  function editorStars() {
    document.querySelectorAll('#general-skills tr[data-skill-key]').forEach(row => {
      const kind = row.querySelector('[data-f="skill_kind"]')?.value;
      const input = row.querySelector('[data-f="name"]');
      if (!input || kind !== "general" || !isBase(input.value)) return;
      const cell = input.closest('td');
      if (!cell || cell.querySelector('.tnx-base-skill-star')) return;
      const wrap = document.createElement('span');
      wrap.className = 'tnx-base-skill-name';
      const star = document.createElement('span');
      star.className = 'tnx-base-skill-star';
      star.textContent = '★';
      input.before(wrap); wrap.append(star, input);
    });
  }

  function editorSeparators() {
    document.querySelectorAll('#style-skills tr[data-skill-key]').forEach(row => {
      if (row.classList.contains('tnx-style-separator-row')) return;
      const description = row.querySelector('[data-f="description"]')?.value || '';
      if (!description.includes(STYLE_SEPARATOR)) return;
      const name = cleanName(row.querySelector('[data-f="name"]')?.value) || 'スタイル技能';
      const actions = row.querySelector('.skill-row-actions')?.cloneNode(true);
      const colspan = Math.max(1, row.children.length);
      row.classList.add('tnx-style-separator-row');
      row.innerHTML = `<td colspan="${colspan}"><div class="tnx-style-separator-content"><span>${name.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</span><small>STYLE SECTION</small><span class="tnx-style-separator-actions"></span></div></td>`;
      if (actions) row.querySelector('.tnx-style-separator-actions').append(...actions.children);
    });
  }

  function viewerStars() {
    document.querySelectorAll('.skill-section--general tbody tr').forEach(row => {
      const cell = row.cells[0];
      if (!cell || !isBase(cell.textContent) || cell.querySelector('.tnx-base-skill-star')) return;
      cell.insertAdjacentHTML('afterbegin','<span class="tnx-base-skill-star" aria-hidden="true">★</span>');
    });
  }

  function quickStars() {
    document.querySelectorAll('.quick-sheet__general-skills tbody tr').forEach(row => {
      const cell = row.cells[0];
      if (!cell || !isBase(cell.textContent) || cell.querySelector('.tnx-base-skill-star')) return;
      cell.insertAdjacentHTML('afterbegin','<span class="tnx-base-skill-star" aria-hidden="true">★</span>');
    });
  }

  function quickSeparators() {
    document.querySelectorAll('.quick-sheet__style-skills tbody tr').forEach(row => {
      if (row.classList.contains('tnx-style-separator-row')) return;
      if (!row.textContent.includes(STYLE_SEPARATOR)) return;
      const label = cleanName(row.cells[0]?.textContent) || 'スタイル技能';
      const colspan = Math.max(1, row.children.length);
      row.classList.add('tnx-style-separator-row');
      row.innerHTML = `<td colspan="${colspan}"><div class="tnx-style-separator-content"><span>${label.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</span><small>STYLE SECTION</small></div></td>`;
    });
  }

  function apply() { editorStars(); editorSeparators(); viewerStars(); quickStars(); quickSeparators(); }
  let queued = false;
  const queue = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; apply(); }); };
  new MutationObserver(queue).observe(document.body, { childList:true, subtree:true });
  document.addEventListener('change', queue, true);
  apply();
})();
