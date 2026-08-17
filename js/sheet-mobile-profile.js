const GROUPS = {
  identity: {
    title: "基本情報",
    wide: false,
    fields: [
      ["character_name", "キャスト名", "text"], ["character_kana", "名前ルビ", "text"],
      ["handle", "ハンドル", "text"], ["handle_kana", "ハンドルルビ", "text"]
    ]
  },
  management: {
    title: "管理情報",
    wide: false,
    fields: [
      ["player_name", "プレイヤー名", "text"], ["affiliation", "所属", "text"],
      ["citizen_rank", "市民ランク", "text"], ["visibility", "公開状態", "visibility"]
    ]
  },
  personal: {
    title: "パーソナルデータ",
    wide: false,
    fields: [
      ["age", "年齢", "text"], ["gender", "性別", "text"], ["height", "身長", "text"], ["weight", "体重", "text"],
      ["eyes", "瞳", "text"], ["hair", "髪", "text"], ["skin", "肌", "text"]
    ]
  },
  lifepath: {
    title: "ライフパス",
    wide: false,
    fields: [
      ["life_path_origin", "出自", "text"], ["life_path_experience", "経験", "text"], ["life_path_encounter", "邂逅", "text"]
    ]
  },
  summary: { title: "概要", wide: true, fields: [["summary", "概要", "textarea-short"]] },
  profile: { title: "プロフィール", wide: true, fields: [["profile", "プロフィール", "textarea-long"]] }
};

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
let activeGroup = null;

function source(field) {
  return document.querySelector(`[data-mobile-character-field="${field}"]`);
}

function summaryText(groupKey) {
  const group = GROUPS[groupKey];
  if (!group) return "未設定";
  if (groupKey === "identity") {
    const name = source("character_name")?.value || "名称未設定";
    const handle = source("handle")?.value || "NO HANDLE";
    return `${name} / ${handle}`;
  }
  if (groupKey === "management") {
    const player = source("player_name")?.value || "—";
    const affiliation = source("affiliation")?.value || "—";
    return `${player} / ${affiliation}`;
  }
  if (groupKey === "personal") {
    const age = source("age")?.value || "—";
    const gender = source("gender")?.value || "—";
    const height = source("height")?.value || "—";
    return `${age} / ${gender} / ${height}`;
  }
  if (groupKey === "lifepath") {
    return group.fields.map(([field]) => source(field)?.value || "—").join(" / ");
  }
  const value = source(group.fields[0][0])?.value?.trim() || "未入力";
  return value.replace(/\s+/g, " ").slice(0, 56) + (value.length > 56 ? "…" : "");
}

function injectSummaryUi() {
  const form = $("#mobile-profile-form");
  if (!form || $("#mobile-profile-summary-grid")) return;
  form.classList.add("mobile-profile-source");
  const grid = document.createElement("div");
  grid.id = "mobile-profile-summary-grid";
  grid.className = "mobile-profile-summary-grid";
  grid.innerHTML = Object.entries(GROUPS).map(([key, group]) => `
    <button type="button" class="mobile-profile-summary-card${group.wide ? " mobile-profile-summary-card--wide" : ""}" data-mobile-profile-group="${key}">
      <strong>${group.title}</strong>
      <span data-mobile-profile-summary>${summaryText(key)}</span>
    </button>`).join("");
  form.before(grid);
}

function injectDialog() {
  if ($("#mobile-profile-dialog")) return;
  const dialog = document.createElement("dialog");
  dialog.id = "mobile-profile-dialog";
  dialog.className = "mobile-editor-dialog";
  dialog.innerHTML = `
    <form method="dialog">
      <header class="mobile-editor-dialog__header">
        <button id="mobile-profile-dialog-close" type="button">閉じる</button>
        <strong id="mobile-profile-dialog-title">基本情報編集</strong>
        <button id="mobile-profile-dialog-apply" type="submit">反映</button>
      </header>
      <div class="mobile-editor-dialog__body">
        <div id="mobile-profile-dialog-fields" class="mobile-form-grid mobile-form-grid--two"></div>
      </div>
    </form>`;
  document.body.append(dialog);
}

function injectTopAction() {
  const actions = $(".mobile-sheet-actions");
  if (!actions || actions.querySelector("[data-mobile-fixed-top]")) return;
  const top = document.createElement("a");
  top.href = "#mobile-sheet-top";
  top.dataset.mobileFixedTop = "1";
  top.textContent = "↑ TOP";
  top.setAttribute("aria-label", "ページ上部へ戻る");
  actions.prepend(top);
  actions.classList.add("mobile-sheet-actions--three");
}

function renderSummaries() {
  document.querySelectorAll("[data-mobile-profile-group]").forEach(button => {
    const key = button.dataset.mobileProfileGroup;
    const summary = button.querySelector("[data-mobile-profile-summary]");
    if (summary) summary.textContent = summaryText(key);
  });
}

function buildControl(field, label, type) {
  const current = source(field)?.value || "";
  if (type === "visibility") {
    return `<label>${label}<select data-mobile-profile-modal-field="${field}"><option value="public" ${current === "public" ? "selected" : ""}>公開 / PUBLIC</option><option value="private" ${current !== "public" ? "selected" : ""}>非公開 / PRIVATE</option></select></label>`;
  }
  if (type.startsWith("textarea")) {
    const rows = type === "textarea-long" ? 12 : 5;
    return `<label class="mobile-span-2">${label}<textarea rows="${rows}" data-mobile-profile-modal-field="${field}">${esc(current)}</textarea></label>`;
  }
  return `<label>${label}<input data-mobile-profile-modal-field="${field}" value="${esc(current)}"></label>`;
}

function openGroup(key) {
  const group = GROUPS[key];
  const dialog = $("#mobile-profile-dialog");
  const body = $("#mobile-profile-dialog-fields");
  if (!group || !dialog || !body) return;
  activeGroup = key;
  $("#mobile-profile-dialog-title").textContent = group.title;
  body.innerHTML = group.fields.map(args => buildControl(...args)).join("");
  dialog.showModal();
}

function applyGroup() {
  if (!activeGroup) return;
  let changed = false;
  document.querySelectorAll("[data-mobile-profile-modal-field]").forEach(control => {
    const original = source(control.dataset.mobileProfileModalField);
    if (!original || original.value === control.value) return;
    original.value = control.value;
    changed = true;
  });
  if (changed) {
    const form = $("#mobile-profile-form");
    form?.dispatchEvent(new Event("input", { bubbles: true }));
    form?.dispatchEvent(new Event("change", { bubbles: true }));
  }
  renderSummaries();
  $("#mobile-profile-dialog")?.close();
}

function bind() {
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-mobile-profile-group]");
    if (button) openGroup(button.dataset.mobileProfileGroup);
  });
  $("#mobile-profile-dialog-close")?.addEventListener("click", () => $("#mobile-profile-dialog")?.close());
  $("#mobile-profile-dialog-apply")?.addEventListener("click", event => {
    event.preventDefault();
    applyGroup();
  });
  $("#mobile-profile-dialog")?.addEventListener("cancel", event => {
    event.preventDefault();
    $("#mobile-profile-dialog")?.close();
  });

  const status = $("#mobile-save-status");
  if (status) {
    new MutationObserver(renderSummaries).observe(status, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-state"] });
  }
}

function init() {
  injectSummaryUi();
  injectDialog();
  injectTopAction();
  bind();
  setTimeout(renderSummaries, 0);
}

init();
