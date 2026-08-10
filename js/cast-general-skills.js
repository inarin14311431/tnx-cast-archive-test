/* Public General-skill finalizer.
 * Runs after the legacy cast-ui suit pass, then owns the final General-skill DOM.
 */
(() => {
  const DEFAULT_ORDER = [
    "医療", "射撃", "知覚", "電脳", "製作：", "心理", "自我", "交渉",
    "芸術：", "運動", "回避", "白兵", "操縦：", "信用", "圧力", "隠密"
  ];
  const REQUIRED_FAMILIES = ["製作：", "芸術：", "操縦："];
  const SUITS = ["♠", "♣", "♥", "♦"];

  const normalizeName = value => String(value || "").trim().replace(/[;；]/g, "：");
  const familyName = value => {
    const name = normalizeName(value);
    return REQUIRED_FAMILIES.find(prefix => name.startsWith(prefix)) || name;
  };

  function createSuitMarkup(mark, active) {
    return `<span class="style-suit-mark${active ? " is-active" : ""}" aria-label="${mark} ${active ? "取得済み" : "未取得"}">${mark}</span>`;
  }

  function createZeroLevelRow(name) {
    const row = document.createElement("tr");
    row.dataset.fixedGeneralSkill = name;
    row.innerHTML = `<td>${name}</td><td>0</td>${SUITS.map(mark => `<td class="style-suit-cell">${createSuitMarkup(mark, false)}</td>`).join("")}`;
    return row;
  }

  function createGeneralSection(container) {
    const section = document.createElement("section");
    section.className = "skill-section skill-section--general is-general";
    section.innerHTML = `
      <h3>一般技能 <small>GENERAL SKILLS</small></h3>
      <div class="data-table-wrapper">
        <table class="data-table skill-data-table skill-data-table--general">
          <colgroup>
            <col class="skill-col-name"><col class="skill-col-level">
            <col class="skill-col-suit"><col class="skill-col-suit">
            <col class="skill-col-suit"><col class="skill-col-suit">
          </colgroup>
          <thead><tr><th>名称</th><th>LV</th><th>理性</th><th>感情</th><th>生命</th><th>外界</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>`;
    container.querySelector(".empty-data")?.remove();
    container.prepend(section);
    return section;
  }

  function ensureRequiredFamilies(tbody) {
    const present = new Set([...tbody.rows].map(row => familyName(row.cells?.[0]?.textContent)).filter(Boolean));
    for (const prefix of REQUIRED_FAMILIES) {
      if (!present.has(prefix)) tbody.append(createZeroLevelRow(prefix));
    }
  }

  function normalizeRow(row) {
    while (row.cells.length > 6) row.deleteCell(row.cells.length - 1);
    SUITS.forEach((mark, index) => {
      const cell = row.cells[index + 2];
      if (!cell) return;
      const existing = cell.querySelector(".style-suit-mark, .cast-suit-box");
      const active = existing
        ? existing.classList.contains("is-active") || /●/.test(existing.textContent)
        : /●/.test(cell.textContent);
      cell.className = "style-suit-cell";
      cell.innerHTML = createSuitMarkup(mark, active);
    });
  }

  function normalizeTable(section) {
    section.classList.add("is-general");
    const table = section.querySelector(":scope > .data-table-wrapper > table");
    if (!table) return null;

    const colgroup = table.querySelector(":scope > colgroup");
    while (colgroup && colgroup.children.length > 6) colgroup.lastElementChild.remove();

    const header = table.tHead?.rows?.[0];
    if (header) {
      while (header.cells.length > 6) header.deleteCell(header.cells.length - 1);
      ["名称", "LV", "理性", "感情", "生命", "外界"].forEach((label, index) => {
        if (header.cells[index]) header.cells[index].textContent = label;
      });
    }

    const tbody = table.tBodies?.[0];
    if (!tbody) return null;
    [...tbody.rows].forEach(normalizeRow);
    return tbody;
  }

  function sortRows(tbody) {
    const orderIndex = new Map(DEFAULT_ORDER.map((name, index) => [name, index]));
    const rows = [...tbody.rows]
      .map((row, index) => ({ row, index, family: familyName(row.cells?.[0]?.textContent) }))
      .sort((a, b) => {
        const ai = orderIndex.has(a.family) ? orderIndex.get(a.family) : Number.MAX_SAFE_INTEGER;
        const bi = orderIndex.has(b.family) ? orderIndex.get(b.family) : Number.MAX_SAFE_INTEGER;
        return ai - bi || a.index - b.index;
      });
    rows.forEach(({ row }, index) => {
      if (tbody.rows[index] !== row) tbody.insertBefore(row, tbody.rows[index] || null);
    });
  }

  function splitGeneralColumns(section) {
    if (section.querySelector(".cast-general-columns")) return;
    const wrapper = section.querySelector(":scope > .data-table-wrapper");
    const table = wrapper?.querySelector(":scope > table");
    const tbody = table?.tBodies?.[0];
    if (!wrapper || !table || !tbody) return;

    const rows = [...tbody.rows];
    const splitIndex = rows.findIndex(row => familyName(row.cells?.[0]?.textContent) === "交渉");
    const splitAt = splitIndex >= 0 ? splitIndex + 1 : Math.ceil(rows.length / 2);
    if (splitAt <= 0 || splitAt >= rows.length) return;

    const columns = document.createElement("div");
    columns.className = "cast-general-columns";
    const left = document.createElement("div");
    left.className = "cast-general-column cast-general-column--left";
    const right = document.createElement("div");
    right.className = "cast-general-column cast-general-column--right";

    wrapper.classList.add("cast-general-table-wrapper");
    left.append(wrapper);

    const rightWrapper = wrapper.cloneNode(false);
    rightWrapper.classList.add("cast-general-table-wrapper");
    const rightTable = table.cloneNode(false);
    rightTable.classList.add("skill-data-table--general-secondary");
    const colgroup = table.querySelector(":scope > colgroup")?.cloneNode(true);
    const thead = table.tHead?.cloneNode(true);
    const rightBody = document.createElement("tbody");
    if (colgroup) rightTable.append(colgroup);
    if (thead) rightTable.append(thead);
    rightTable.append(rightBody);
    rows.slice(splitAt).forEach(row => rightBody.append(row));
    rightWrapper.append(rightTable);
    right.append(rightWrapper);

    columns.append(left, right);
    section.querySelector(":scope > h3")?.insertAdjacentElement("afterend", columns);
  }

  function finalizeGeneralSkills() {
    const container = document.querySelector("#skills-container");
    if (!container || container.dataset.generalFinalized === "1") return false;

    let section = container.querySelector(".skill-section--general");
    if (!section) {
      if (!container.classList.contains("cast-skill-layout")) return false;
      section = createGeneralSection(container);
    }

    const baseRows = [...section.querySelectorAll(":scope > .data-table-wrapper > table > tbody > tr")];
    if (baseRows.length) {
      const legacySuitPassComplete = baseRows.every(row =>
        [2, 3, 4, 5].every(index => row.cells?.[index]?.querySelector(".cast-suit-box"))
      );
      if (!legacySuitPassComplete) return false;
    } else if (!container.classList.contains("cast-skill-layout")) {
      return false;
    }

    let tbody = normalizeTable(section);
    if (!tbody) return false;
    ensureRequiredFamilies(tbody);
    [...tbody.rows].forEach(normalizeRow);
    sortRows(tbody);
    splitGeneralColumns(section);
    container.dataset.generalFinalized = "1";
    return true;
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    if (finalizeGeneralSkills() || ++attempts >= 80) window.clearInterval(timer);
  }, 50);
  finalizeGeneralSkills();
})();
