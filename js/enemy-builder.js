const STORAGE_KEY = "tnx-enemy-builder-v1";

const classGuide = {
  troop: { attack: -2, reaction: -2, damage: -3, armor: -2, cs: -2, ar: 1 },
  guest: { attack: 0, reaction: 0, damage: 0, armor: 0, cs: 0, ar: 1 },
  boss: { attack: 2, reaction: 2, damage: 4, armor: 3, cs: 2, ar: 2 }
};

const bandGuide = {
  low: { attack: 13, reaction: 12, damage: 7, armor: 3, cs: 6 },
  standard: { attack: 17, reaction: 15, damage: 10, armor: 5, cs: 8 },
  high: { attack: 20, reaction: 18, damage: 14, armor: 8, cs: 10 },
  extreme: { attack: 24, reaction: 21, damage: 18, armor: 11, cs: 12 }
};

const roleGuide = {
  striker: { attack: 1, reaction: 0, damage: 3, armor: 0, cs: 1, primary: "〈白兵〉＋スタイル技能", range: "至近", target: "単体" },
  shooter: { attack: 1, reaction: 0, damage: 2, armor: -1, cs: 0, primary: "〈射撃〉＋スタイル技能", range: "近～遠", target: "単体" },
  defender: { attack: -1, reaction: 2, damage: -1, armor: 3, cs: -1, primary: "〈白兵〉／リアクション技能", range: "至近", target: "単体" },
  controller: { attack: 0, reaction: 0, damage: -2, armor: 0, cs: 1, primary: "妨害用技能＋スタイル技能", range: "近", target: "単体～範囲" },
  support: { attack: -2, reaction: 0, damage: -3, armor: 0, cs: 0, primary: "支援用技能＋スタイル技能", range: "近", target: "単体～範囲" },
  neuro: { attack: 1, reaction: -1, damage: 1, armor: -2, cs: 2, primary: "〈電脳〉＋スタイル技能", range: "シーン", target: "単体" },
  custom: { attack: 0, reaction: 0, damage: 0, armor: 0, cs: 0, primary: "", range: "", target: "" }
};

const ids = [
  "enemy-name", "enemy-handle", "enemy-class", "enemy-role", "party-size", "target-band",
  "attack-value", "reaction-value", "damage-value", "armor-s", "armor-p", "armor-i",
  "cs-value", "ar-value", "primary-check", "range-value", "target-value", "divine-works",
  "divine-plan", "tactics", "notes"
];

const fields = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
const actions = document.getElementById("enemy-actions");
const template = document.getElementById("enemy-action-template");
const preview = document.getElementById("enemy-preview");
const diagnostics = document.getElementById("enemy-diagnostics");
const status = document.getElementById("enemy-status");

for (const element of Object.values(fields)) {
  element?.addEventListener("input", refresh);
  element?.addEventListener("change", refresh);
}

document.getElementById("apply-preset")?.addEventListener("click", applyGuide);
document.getElementById("clear-enemy")?.addEventListener("click", clearEnemy);
document.getElementById("add-action")?.addEventListener("click", () => addAction());
document.getElementById("copy-enemy")?.addEventListener("click", copyText);
document.getElementById("save-enemy")?.addEventListener("click", saveLocal);
document.getElementById("load-enemy")?.addEventListener("click", loadLocal);

actions?.addEventListener("input", refresh);
actions?.addEventListener("click", event => {
  const button = event.target.closest("[data-action='remove']");
  if (!button) return;
  button.closest(".enemy-action-row")?.remove();
  refresh();
});

addAction({ name: "通常攻撃", check: "", effect: "", detail: "" });
refresh();

function applyGuide() {
  const band = bandGuide[fields["target-band"].value] ?? bandGuide.standard;
  const cls = classGuide[fields["enemy-class"].value] ?? classGuide.guest;
  const role = roleGuide[fields["enemy-role"].value] ?? roleGuide.custom;

  const attack = band.attack + cls.attack + role.attack;
  const reaction = band.reaction + cls.reaction + role.reaction;
  const damage = band.damage + cls.damage + role.damage;
  const armor = Math.max(0, band.armor + cls.armor + role.armor);
  const cs = Math.max(1, band.cs + cls.cs + role.cs);

  fields["attack-value"].value = attack;
  fields["reaction-value"].value = reaction;
  fields["damage-value"].value = Math.max(0, damage);
  fields["armor-s"].value = armor;
  fields["armor-p"].value = armor;
  fields["armor-i"].value = Math.max(0, armor - 1);
  fields["cs-value"].value = cs;
  fields["ar-value"].value = cls.ar;

  if (role.primary) fields["primary-check"].value = role.primary;
  if (role.range) fields["range-value"].value = role.range;
  if (role.target) fields["target-value"].value = role.target;

  const first = actions?.querySelector(".enemy-action-row");
  if (first) {
    first.querySelector("[data-field='check']").value = `${fields["primary-check"].value || "主判定"} ${attack}`;
    first.querySelector("[data-field='effect']").value = `攻撃力 ${Math.max(0, damage)}`;
    first.querySelector("[data-field='detail']").value = `${fields["range-value"].value || "射程任意"}／${fields["target-value"].value || "対象任意"}`;
  }

  setStatus("運用目安を反映しました。数値はPC構成と使用技能に合わせて調整してください。");
  refresh();
}

function addAction(data = {}) {
  if (!template || !actions) return;
  const fragment = template.content.cloneNode(true);
  const row = fragment.querySelector(".enemy-action-row");
  for (const [key, value] of Object.entries(data)) {
    const input = row.querySelector(`[data-field='${key}']`);
    if (input) input.value = value ?? "";
  }
  actions.append(fragment);
  refresh();
}

function collect() {
  return {
    version: 1,
    name: fields["enemy-name"].value.trim(),
    handle: fields["enemy-handle"].value.trim(),
    enemyClass: fields["enemy-class"].value,
    role: fields["enemy-role"].value,
    partySize: number(fields["party-size"].value, 4),
    targetBand: fields["target-band"].value,
    attack: number(fields["attack-value"].value),
    reaction: number(fields["reaction-value"].value),
    damage: number(fields["damage-value"].value),
    armor: {
      s: number(fields["armor-s"].value),
      p: number(fields["armor-p"].value),
      i: number(fields["armor-i"].value)
    },
    cs: number(fields["cs-value"].value),
    ar: number(fields["ar-value"].value, 1),
    primaryCheck: fields["primary-check"].value.trim(),
    range: fields["range-value"].value.trim(),
    target: fields["target-value"].value.trim(),
    divineWorks: fields["divine-works"].value.trim(),
    divinePlan: fields["divine-plan"].value.trim(),
    tactics: fields.tactics.value.trim(),
    notes: fields.notes.value.trim(),
    actions: [...actions.querySelectorAll(".enemy-action-row")].map(row => ({
      name: row.querySelector("[data-field='name']")?.value.trim() ?? "",
      check: row.querySelector("[data-field='check']")?.value.trim() ?? "",
      effect: row.querySelector("[data-field='effect']")?.value.trim() ?? "",
      detail: row.querySelector("[data-field='detail']")?.value.trim() ?? ""
    })).filter(item => Object.values(item).some(Boolean))
  };
}

function refresh() {
  const data = collect();
  renderPreview(data);
  renderDiagnostics(data);
}

function renderPreview(data) {
  if (!preview) return;
  const title = [data.handle ? `“${escapeHtml(data.handle)}”` : "", escapeHtml(data.name || "名称未設定")].filter(Boolean).join(" ");
  const actionHtml = data.actions.length
    ? data.actions.map(action => `
        <li>
          <strong>${escapeHtml(action.name || "行動")}</strong>
          <span>${escapeHtml(action.check)}</span>
          <span>${escapeHtml(action.effect)}</span>
          ${action.detail ? `<small>${escapeHtml(action.detail)}</small>` : ""}
        </li>`).join("")
    : "<li><small>主要行動未設定</small></li>";

  preview.innerHTML = `
    <header>
      <p>${labelForClass(data.enemyClass)} / ${labelForRole(data.role)}</p>
      <h3>${title}</h3>
    </header>
    <div class="enemy-preview__stats">
      <span>攻撃 <b>${data.attack}</b></span>
      <span>防御 <b>${data.reaction}</b></span>
      <span>攻撃力 <b>${data.damage}</b></span>
      <span>防御値 <b>S${data.armor.s} / P${data.armor.p} / I${data.armor.i}</b></span>
      <span>CS <b>${data.cs}</b></span>
      <span>AR <b>${data.ar}</b></span>
    </div>
    <dl>
      <div><dt>主判定</dt><dd>${escapeHtml(data.primaryCheck || "未設定")}</dd></div>
      <div><dt>射程／対象</dt><dd>${escapeHtml([data.range, data.target].filter(Boolean).join(" / ") || "未設定")}</dd></div>
      <div><dt>神業</dt><dd>${escapeHtml(data.divineWorks || "未設定")}</dd></div>
    </dl>
    <section>
      <h4>主要行動</h4>
      <ul>${actionHtml}</ul>
    </section>
    ${data.divinePlan ? `<section><h4>神業運用</h4><p>${multiline(data.divinePlan)}</p></section>` : ""}
    ${data.tactics ? `<section><h4>行動指針</h4><p>${multiline(data.tactics)}</p></section>` : ""}
    ${data.notes ? `<section><h4>メモ</h4><p>${multiline(data.notes)}</p></section>` : ""}
  `;
}

function renderDiagnostics(data) {
  if (!diagnostics) return;
  const warnings = [];
  const target = bandGuide[data.targetBand] ?? bandGuide.standard;

  if (data.attack >= target.attack + 4) warnings.push(["warning", "攻撃達成値が想定帯よりかなり高めです。防御側がほぼリアクションできない構成になっていないか確認してください。"]) ;
  if (data.attack <= target.attack - 4) warnings.push(["info", "攻撃達成値が想定帯より低めです。脅威として機能させるなら補助技能や支援役を確認してください。"]) ;
  if (data.reaction >= data.attack + 3) warnings.push(["warning", "防御達成値が攻撃達成値を上回っています。戦闘が長期化しやすい構成です。"]) ;
  if (data.damage >= target.damage + 6) warnings.push(["danger", "攻撃力が想定帯から大きく上振れしています。範囲攻撃や複数回攻撃と組み合わさる場合は特に注意してください。"]) ;
  if (Math.max(data.armor.s, data.armor.p, data.armor.i) >= target.armor + 6) warnings.push(["warning", "防御値が高めです。PC側の主要ダメージ種別で有効打が出るか確認してください。"]) ;
  if (data.ar >= 3) warnings.push(["danger", "ARが3以上です。1カット内の行動回数が多くなるため、ボス運用でも処理量と集中攻撃に注意してください。"]) ;
  if (data.enemyClass === "boss" && !data.divineWorks) warnings.push(["info", "ボスとして運用するなら、神業とその使用目的を先に決めておくとクライマックスの判断が安定します。"]) ;
  if (!data.actions.length) warnings.push(["info", "主要行動がありません。ルーラーが戦闘中に迷わないよう、通常行動を最低1つ登録するのがおすすめです。"]) ;

  if (!warnings.length) {
    diagnostics.innerHTML = '<p class="enemy-diagnostic enemy-diagnostic--ok">現在の入力値に大きな偏りは検出されていません。これは公式バランス判定ではないため、PC構成と実際の技能効果を優先してください。</p>';
    return;
  }

  diagnostics.innerHTML = warnings
    .map(([type, text]) => `<p class="enemy-diagnostic enemy-diagnostic--${type}">${escapeHtml(text)}</p>`)
    .join("");
}

async function copyText() {
  const text = toText(collect());
  try {
    await navigator.clipboard.writeText(text);
    setStatus("戦闘用テキストをコピーしました。");
  } catch {
    setStatus("コピーに失敗しました。ブラウザのクリップボード権限を確認してください。", true);
  }
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collect()));
  setStatus("このブラウザにエネミーデータを保存しました。");
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("保存データがありません。");
    const data = JSON.parse(raw);
    restore(data);
    setStatus("保存データを読み込みました。");
  } catch (error) {
    setStatus(error.message || "保存データを読み込めませんでした。", true);
  }
}

function restore(data) {
  fields["enemy-name"].value = data.name ?? "";
  fields["enemy-handle"].value = data.handle ?? "";
  fields["enemy-class"].value = data.enemyClass ?? "guest";
  fields["enemy-role"].value = data.role ?? "custom";
  fields["party-size"].value = data.partySize ?? 4;
  fields["target-band"].value = data.targetBand ?? "standard";
  fields["attack-value"].value = data.attack ?? 0;
  fields["reaction-value"].value = data.reaction ?? 0;
  fields["damage-value"].value = data.damage ?? 0;
  fields["armor-s"].value = data.armor?.s ?? 0;
  fields["armor-p"].value = data.armor?.p ?? 0;
  fields["armor-i"].value = data.armor?.i ?? 0;
  fields["cs-value"].value = data.cs ?? 0;
  fields["ar-value"].value = data.ar ?? 1;
  fields["primary-check"].value = data.primaryCheck ?? "";
  fields["range-value"].value = data.range ?? "";
  fields["target-value"].value = data.target ?? "";
  fields["divine-works"].value = data.divineWorks ?? "";
  fields["divine-plan"].value = data.divinePlan ?? "";
  fields.tactics.value = data.tactics ?? "";
  fields.notes.value = data.notes ?? "";

  actions.innerHTML = "";
  for (const action of data.actions ?? []) addAction(action);
  if (!data.actions?.length) addAction({ name: "通常攻撃" });
  refresh();
}

function clearEnemy() {
  localStorage.removeItem(STORAGE_KEY);
  for (const id of ["enemy-name", "enemy-handle", "primary-check", "range-value", "target-value", "divine-works", "divine-plan", "tactics", "notes"]) {
    fields[id].value = "";
  }
  fields["enemy-class"].value = "guest";
  fields["enemy-role"].value = "striker";
  fields["party-size"].value = 4;
  fields["target-band"].value = "standard";
  actions.innerHTML = "";
  addAction({ name: "通常攻撃" });
  applyGuide();
  setStatus("入力内容を初期化しました。");
}

function toText(data) {
  const lines = [];
  lines.push(`${data.handle ? `“${data.handle}” ` : ""}${data.name || "名称未設定"}`);
  lines.push(`${labelForClass(data.enemyClass)} / ${labelForRole(data.role)}`);
  lines.push(`攻撃 ${data.attack} / 防御 ${data.reaction} / 攻撃力 ${data.damage} / 防御値 S${data.armor.s} P${data.armor.p} I${data.armor.i} / CS ${data.cs} / AR ${data.ar}`);
  if (data.primaryCheck) lines.push(`主判定：${data.primaryCheck}`);
  if (data.range || data.target) lines.push(`射程・対象：${[data.range, data.target].filter(Boolean).join(" / ")}`);
  if (data.divineWorks) lines.push(`神業：${data.divineWorks}`);
  if (data.actions.length) {
    lines.push("【主要行動】");
    for (const action of data.actions) lines.push(`・${action.name || "行動"}：${[action.check, action.effect, action.detail].filter(Boolean).join(" / ")}`);
  }
  if (data.divinePlan) lines.push(`【神業運用】\n${data.divinePlan}`);
  if (data.tactics) lines.push(`【行動指針】\n${data.tactics}`);
  if (data.notes) lines.push(`【メモ】\n${data.notes}`);
  return lines.join("\n");
}

function labelForClass(value) {
  return ({ troop: "トループ／雑魚", guest: "ゲスト／標準", boss: "ボス／クライマックス" })[value] ?? "自由";
}

function labelForRole(value) {
  return ({ striker: "アタッカー", shooter: "射撃", defender: "防御・護衛", controller: "妨害・制御", support: "支援", neuro: "ニューロ", custom: "自由設定" })[value] ?? "自由設定";
}

function number(value, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function multiline(value) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setStatus(message, isError = false) {
  if (!status) return;
  status.textContent = message;
  status.className = `enemy-status${isError ? " is-error" : ""}`;
}
