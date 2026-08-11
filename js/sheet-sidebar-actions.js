(() => {
  const panel = document.querySelector('.exp-panel');
  if (!panel) return;

  // Export / transfer helpers belong to the public cast viewer.
  const VIEWER_ONLY_ACTION = /ココフォリア|ユドナリウム|転記TSV|転記BM/;
  const LABELS = {
    view: /キャストを閲覧/,
    import: /データ取込/,
    autofill: /SKD・OFC補完|補完/
  };
  let arranging = false;

  const labelOf = element => String(element?.textContent || '').replace(/\s+/g, ' ').trim();

  const topLevelChild = element => {
    let current = element;
    while (current && current.parentElement && current.parentElement !== panel) current = current.parentElement;
    return current?.parentElement === panel ? current : null;
  };

  const findByLabel = pattern => {
    const candidates = panel.querySelectorAll(':scope > button, :scope > a, :scope > label, :scope > div > button, :scope > div > a');
    return [...candidates].find(element => pattern.test(labelOf(element))) || null;
  };

  const removeViewerOnlyActions = () => {
    panel.querySelectorAll(':scope > button, :scope > a, :scope > div > button, :scope > div > a').forEach(element => {
      if (element.matches('#cast-view-button,[data-sheet-help],.sheet-help-trigger')) return;
      if (VIEWER_ONLY_ACTION.test(labelOf(element))) topLevelChild(element)?.remove();
    });
  };

  const reorderActions = () => {
    const visibility = topLevelChild(document.querySelector('#visibility'));
    const save = topLevelChild(document.querySelector('#save-button'));
    const view = topLevelChild(document.querySelector('#cast-view-button') || findByLabel(LABELS.view));
    const importAction = topLevelChild(document.querySelector('#legacy-import-open') || findByLabel(LABELS.import));
    const autofill = topLevelChild(findByLabel(LABELS.autofill));

    // Experience summary and section navigation already occupy the top of the rail.
    // Re-appending only action controls gives the requested stable order below them.
    const ordered = [visibility, save, view, importAction, autofill].filter(Boolean);
    const seen = new Set();
    ordered.forEach(element => {
      if (seen.has(element)) return;
      seen.add(element);
      panel.append(element);
    });
  };

  const GROUP_COLORS = {
    save: '#70efa9',
    action: '#35d7ff'
  };

  const classify = () => {
    if (arranging) return;
    arranging = true;
    try {
      removeViewerOnlyActions();
      reorderActions();
      panel.querySelectorAll(':scope > button, :scope > a.sheet-view-link, :scope > .sheet-import-control > button').forEach(element => {
        const label = labelOf(element);
        let group = '';
        if (element.id === 'save-button' || /保存済み|未保存|保存中|保存失敗/.test(label)) group = 'save';
        else if (/キャストを閲覧|データ取込|SKD・OFC補完/.test(label)) group = 'action';

        if (!group) {
          delete element.dataset.actionGroup;
          element.style.removeProperty('--action-rail');
          element.style.removeProperty('border-left-color');
          return;
        }
        element.dataset.actionGroup = group;
        element.style.setProperty('--action-rail', GROUP_COLORS[group]);
      });
    } finally {
      arranging = false;
    }
  };

  classify();
  requestAnimationFrame(classify);
  window.addEventListener('load', classify, { once: true });

  new MutationObserver(classify).observe(panel, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['hidden', 'class', 'id']
  });
})();

(() => {
  const toInteger = value => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.trunc(number) : 0;
  };

  const renameBaseLabels = () => {
    document.querySelectorAll('#ability-grid .ability-matrix__row > span').forEach(label => {
      if (label.textContent.trim() === '現在値') label.textContent = '基礎値';
    });
  };

  const abilityValue = key => {
    const base = toInteger(document.querySelector(`#${key}-base`)?.value);
    const modifier = toInteger(document.querySelector(`#${key}-mod`)?.value);
    return base + modifier;
  };

  const recalculateCs = () => {
    const storedBase = document.querySelector('#cs-base');
    const displayBase = document.querySelector('#cs-base-display');
    const modifierInput = document.querySelector('#cs-mod');
    const finalOutput = document.querySelector('#cs-final');
    if (!storedBase || !displayBase || !modifierInput || !finalOutput) return;

    const calculatedBase = Math.floor((
      abilityValue('reason') +
      abilityValue('passion') +
      abilityValue('life')
    ) / 2);
    const modifier = toInteger(modifierInput.value);
    const finalValue = Math.max(0, calculatedBase + modifier);

    displayBase.value = calculatedBase;
    finalOutput.textContent = finalValue;

    // sheet.js saves cs as cs_base + cs_mod. Adjust only the hidden storage value
    // so the persisted final CS also respects the minimum value of zero.
    storedBase.value = finalValue - modifier;
  };

  const patchCsCard = () => {
    const card = document.querySelector('#ability-grid .ability-card--cs');
    if (!card || card.dataset.csAutoReady === '1') return Boolean(card);

    const oldModifier = toInteger(document.querySelector('#cs-mod')?.value);
    card.dataset.csAutoReady = '1';
    card.classList.add('ability-matrix', 'ability-matrix--cs');
    card.innerHTML = `
      <h3>CS <small>COMBAT SPEED</small></h3>
      <div class="ability-matrix__header"><span></span><strong>CS</strong></div>
      <div class="ability-matrix__row"><span>基礎値</span><input id="cs-base-display" type="number" value="0" readonly tabindex="-1"></div>
      <div class="ability-matrix__row"><span>補正値</span><input id="cs-mod" type="number" step="1" value="${oldModifier}"></div>
      <div class="ability-matrix__row ability-matrix__result"><span>最終値</span><strong id="cs-final">0</strong></div>
      <input id="cs-base" type="hidden" value="0">
    `;

    const modifierInput = card.querySelector('#cs-mod');
    modifierInput.addEventListener('change', () => {
      modifierInput.value = toInteger(modifierInput.value);
      recalculateCs();
    });
    renameBaseLabels();
    recalculateCs();
    return true;
  };

  const init = () => {
    if (!patchCsCard()) return false;
    renameBaseLabels();

    document.addEventListener('input', event => {
      if (event.target.matches('#reason-base,#reason-mod,#passion-base,#passion-mod,#life-base,#life-mod,#cs-mod')) {
        queueMicrotask(recalculateCs);
      }
    });
    document.addEventListener('change', event => {
      if (event.target.matches('#reason-base,#reason-mod,#passion-base,#passion-mod,#life-base,#life-mod,#cs-mod')) {
        queueMicrotask(recalculateCs);
      }
    });

    const abilityGrid = document.querySelector('#ability-grid');
    if (abilityGrid) {
      new MutationObserver(records => {
        renameBaseLabels();
        if (records.some(record => ['reason-final', 'passion-final', 'life-final'].includes(record.target?.id))) {
          queueMicrotask(recalculateCs);
        }
      }).observe(abilityGrid, {
        childList: true,
        subtree: true
      });
    }
    return true;
  };

  if (!init()) {
    const observer = new MutationObserver(() => {
      if (init()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
