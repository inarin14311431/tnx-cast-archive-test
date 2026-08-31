let resizeObserver = null;

function syncRowHeight(textarea) {
  const row = textarea.closest('tr[data-skill-key]:not(.style-skill-separator-row)');
  if (!row) return;
  const textareaHeight = Math.ceil(textarea.getBoundingClientRect().height);
  row.style.minHeight = `${Math.max(50, textareaHeight + 10)}px`;
}

export function initStyleSkillDescriptionRowResize(root = document) {
  resizeObserver?.disconnect();
  resizeObserver = null;

  const textareas = [...root.querySelectorAll('#style-skills textarea[data-style-field="description"]')];
  if (!textareas.length || typeof ResizeObserver !== 'function') {
    textareas.forEach(syncRowHeight);
    return;
  }

  resizeObserver = new ResizeObserver(entries => {
    entries.forEach(entry => syncRowHeight(entry.target));
  });

  textareas.forEach(textarea => {
    syncRowHeight(textarea);
    resizeObserver.observe(textarea);
  });
}
