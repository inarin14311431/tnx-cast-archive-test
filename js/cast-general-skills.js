/* Public compact-skill finalizer.
 * Owns the final General / Social / Connection skill DOM for the public cast view.
 */
(() => {
  const DEFAULT_ORDER = [
    "医療", "射撃", "知覚", "電脳", "製作：", "心理", "自我", "交渉",
    "芸術：", "運動", "回避", "白兵", "操縦：", "信用", "圧力", "隠密"
  ];
  const REQUIRED_FAMILIES = ["製作：", "芸術：", "操縦："];
  const SUITS = ["♠", "♣", "♥", "♦"];
  const HEADERS = ["名称", "LV", "理性", "感情", "生命", "外界"];

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

  function normalizeCompactTable(section, category) {
    const table = section.querySelector(":scope > .data-table-wrapper > table");
    if (!table) return null;

    table.classList.add(`skill-data-table--${category}`);

    const colgroup = table.querySelector(":scope > colgroup");
    while (colgroup && colgroup.children.length > 6) colgroup.lastElementChild.remove();

    const header = table.tHead?.rows?.[0];
    if (header) {
      while (header.cells.length > 6) header.deleteCell(header.cells.length - 1);
      HEADERS.forEach((label, index) => {
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

  function finalizeGeneral(section) {
    if (!section || section.dataset.compactFinalized === "1") return false;
    section.classList.add("is-general");

    const tbody = normalizeCompactTable(section, "general");
    if (!tbody) return false;

    ensureRequiredFamilies(tbody);
    [...tbody.rows].forEach(normalizeRow);
    sortRows(tbody);
    splitGeneralColumns(section);
    section.dataset.compactFinalized = "1";
    return true;
  }

  function finalizeSideSection(section, category, stateClass) {
    if (!section || section.dataset.compactFinalized === "1") return false;
    section.classList.add(stateClass);
    const tbody = normalizeCompactTable(section, category);
    if (!tbody) return false;
    section.dataset.compactFinalized = "1";
    return true;
  }

  function finalizeCompactSkills() {
    const container = document.querySelector("#skills-container");
    if (!container) return false;

    const general = container.querySelector(".skill-section--general");
    const social = container.querySelector(".skill-section--social");
    const connection = container.querySelector(".skill-section--connection");

    // Do not treat the pre-render state as complete. cast.js fills these sections asynchronously.
    if (!general && !social && !connection) return false;

    if (general && general.dataset.compactFinalized !== "1") finalizeGeneral(general);
    if (social && social.dataset.compactFinalized !== "1") finalizeSideSection(social, "social", "is-social");
    if (connection && connection.dataset.compactFinalized !== "1") finalizeSideSection(connection, "connection", "is-connection");

    const currentGeneral = container.querySelector(".skill-section--general");
    const currentSocial = container.querySelector(".skill-section--social");
    const currentConnection = container.querySelector(".skill-section--connection");

    return [currentGeneral, currentSocial, currentConnection]
      .filter(Boolean)
      .every(section => section.dataset.compactFinalized === "1");
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    if (finalizeCompactSkills() || ++attempts >= 160) window.clearInterval(timer);
  }, 50);

  // Run once immediately, then the timer handles the asynchronous cast.js render.
  finalizeCompactSkills();
})();
