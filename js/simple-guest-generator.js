import { supabase } from "./supabase-client.js";

const publicId = new URLSearchParams(location.search).get("id")?.trim() || "";
const output = document.querySelector("#guest-generator-output");
const errorBox = document.querySelector("#guest-generator-error");
const title = document.querySelector("#guest-generator-title");
const back = document.querySelector("#guest-generator-back");

const importantGeneralNames = new Set(["白兵", "射撃", "回避", "知覚", "電脳", "交渉", "自我", "運動", "隠密", "圧力"]);

initialize();

async function initialize() {
  if (!publicId) return fail("キャストIDが指定されていません。");
  back.href = `./cast.html?id=${encodeURIComponent(publicId)}`;

  try {
    const bundle = await fetchBundle(publicId);
    const guest = createGuestData(bundle);
    renderGuest(guest);
  } catch (error) {
    console.error(error);
    fail(error instanceof Error ? error.message : "キャストデータを取得できませんでした。");
  }
}

async function fetchBundle(id) {
  const { data: character, error: characterError } = await supabase
    .from("characters")
    .select("*")
    .eq("public_id", id)
    .maybeSingle();
  if (characterError) throw characterError;
  if (!character) throw new Error("キャストデータが見つかりません。");

  const [{ data: skills, error: skillError }, { data: outfits, error: outfitError }] = await Promise.all([
    supabase.from("character_skills").select("*").eq("character_id", character.id).order("sort_order"),
    supabase.from("character_outfits").select("*").eq("character_id", character.id).order("sort_order")
  ]);
  if (skillError) throw skillError;
  if (outfitError) throw outfitError;

  return { character, skills: skills || [], outfits: outfits || [] };
}

function createGuestData({ character, skills, outfits }) {
  const styles = [1, 2, 3]
    .map(index => ({
      name: clean(character[`style_${index}`]),
      mark: clean(character[`style_${index}_mark`]),
      divine: clean(character[`divine_${index}`])
    }))
    .filter(item => item.name);

  const abilities = [
    ability("理性", character.reason_value, character.reason_control),
    ability("感情", character.passion_value, character.passion_control),
    ability("生命", character.life_value, character.life_control),
    ability("外界", character.mundane_value, character.mundane_control),
    { name: "CS", value: numberOrZero(character.cs), control: null }
  ];

  const generalSkills = skills
    .filter(skill => skill.category !== "style")
    .filter(skill => numberOrZero(skill.level) >= 2 || importantGeneralNames.has(clean(skill.name)))
    .sort((a, b) => numberOrZero(b.level) - numberOrZero(a.level) || numberOrZero(a.sort_order) - numberOrZero(b.sort_order))
    .slice(0, 10)
    .map(skillSummary);

  const styleSkills = skills
    .filter(skill => skill.category === "style")
    .sort((a, b) => numberOrZero(b.level) - numberOrZero(a.level) || numberOrZero(a.sort_order) - numberOrZero(b.sort_order))
    .slice(0, 10)
    .map(skillSummary);

  const weapons = outfits
    .filter(outfit => clean(outfit.category) === "weapon")
    .map(outfit => ({
      name: clean(outfit.name),
      attack: clean(outfit.attack),
      range: clean(outfit.range),
      note: clean(outfit.description)
    }))
    .filter(item => item.name);

  const armors = outfits.filter(outfit => clean(outfit.category) === "armor");
  const armorTotal = armors.reduce((total, outfit) => {
    const details = normalizeDetails(outfit.ofc_details);
    total.s += numericDefense(details.defense_s);
    total.p += numericDefense(details.defense_p);
    total.i += numericDefense(details.defense_i);
    return total;
  }, { s: 0, p: 0, i: 0 });

  return {
    id: clean(character.public_id),
    name: [clean(character.handle), clean(character.character_name)].filter(Boolean).join(" "),
    styles,
    abilities,
    generalSkills,
    styleSkills,
    weapons,
    armorNames: armors.map(item => clean(item.name)).filter(Boolean),
    armorTotal,
    summary: clean(character.summary)
  };
}

function renderGuest(guest) {
  title.textContent = `${guest.name || "名称未設定"} の簡易ゲストデータ`;
  document.querySelector("#guest-generator-id").textContent = guest.id;
  document.querySelector("#guest-name").textContent = guest.name || "名称未設定";
  document.querySelector("#guest-styles").textContent = guest.styles
    .map(item => `${item.mark}${item.name}${item.divine ? `／${item.divine}` : ""}`)
    .join(" ｜ ") || "スタイル未設定";

  document.querySelector("#guest-abilities").innerHTML = guest.abilities.map(item => `
    <div class="guest-ability-card">
      <span>${escapeHtml(item.name)}</span>
      <strong>${escapeHtml(item.value)}</strong>
      ${item.control === null ? "" : `<small>制御 ${escapeHtml(item.control)}</small>`}
    </div>
  `).join("");

  renderList("#guest-skills", guest.generalSkills, "主要技能なし");
  renderList("#guest-style-skills", guest.styleSkills, "スタイル技能なし");

  const weaponItems = guest.weapons.map(item => ({
    title: item.name,
    meta: [item.attack && `攻撃 ${item.attack}`, item.range && `射程 ${item.range}`].filter(Boolean).join(" / ")
  }));
  renderList("#guest-weapons", weaponItems, "武器なし");

  const armor = document.querySelector("#guest-armor");
  armor.innerHTML = `<strong>防御値合計 S ${guest.armorTotal.s} / P ${guest.armorTotal.p} / I ${guest.armorTotal.i}</strong><span>${escapeHtml(guest.armorNames.join(" / ") || "防具なし")}</span>`;

  const text = buildText(guest);
  document.querySelector("#guest-text").value = text;
  document.querySelector("#guest-copy").addEventListener("click", () => copyText(text));
  output.hidden = false;
}

function renderList(selector, items, emptyText) {
  const root = document.querySelector(selector);
  if (!items.length) {
    root.innerHTML = `<p class="guest-list__empty">${escapeHtml(emptyText)}</p>`;
    return;
  }
  root.innerHTML = items.map(item => `
    <div class="guest-list__item">
      <strong>${escapeHtml(item.title)}</strong>
      ${item.meta ? `<span>${escapeHtml(item.meta)}</span>` : ""}
    </div>
  `).join("");
}

function skillSummary(skill) {
  const suits = [
    ["理", skill.reason], ["感", skill.passion], ["生", skill.life], ["外", skill.mundane]
  ].filter(([, value]) => Boolean(value)).map(([label]) => label).join("");
  return {
    title: `${clean(skill.name)} ${numberOrZero(skill.level)}LV`,
    meta: [suits && `能力 ${suits}`, clean(skill.timing)].filter(Boolean).join(" / ")
  };
}

function buildText(guest) {
  const lines = [];
  lines.push(`【簡易ゲスト】${guest.name}`);
  lines.push(`スタイル：${guest.styles.map(item => `${item.mark}${item.name}`).join(" / ")}`);
  lines.push(`能力：${guest.abilities.map(item => item.control === null ? `${item.name}${item.value}` : `${item.name}${item.value}/${item.control}`).join("　")}`);
  if (guest.generalSkills.length) lines.push(`主要技能：${guest.generalSkills.map(item => `${item.title}${item.meta ? `（${item.meta}）` : ""}`).join(" / ")}`);
  if (guest.styleSkills.length) lines.push(`スタイル技能：${guest.styleSkills.map(item => item.title).join(" / ")}`);
  if (guest.weapons.length) lines.push(`武器：${guest.weapons.map(item => `${item.name}${item.attack ? `［${item.attack}］` : ""}${item.range ? ` ${item.range}` : ""}`).join(" / ")}`);
  lines.push(`防御：S ${guest.armorTotal.s} / P ${guest.armorTotal.p} / I ${guest.armorTotal.i}${guest.armorNames.length ? `（${guest.armorNames.join(" / ")}）` : ""}`);
  if (guest.summary) lines.push(`概要：${guest.summary}`);
  lines.push("※CAST ARCHIVEの既存データを圧縮表示した試作です。数値の再計算・バランス調整はしていません。");
  return lines.join("\n");
}

async function copyText(text) {
  const button = document.querySelector("#guest-copy");
  try {
    await navigator.clipboard.writeText(text);
    button.querySelector("span").textContent = "コピーしました";
    window.setTimeout(() => { button.querySelector("span").textContent = "簡易ゲストデータをコピー"; }, 1800);
  } catch {
    document.querySelector("#guest-text").focus();
    document.querySelector("#guest-text").select();
  }
}

function fail(message) {
  title.textContent = "簡易ゲストデータを作成できませんでした";
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function ability(name, value, control) {
  return { name, value: numberOrZero(value), control: numberOrZero(control) };
}

function normalizeDetails(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try { return JSON.parse(value); } catch { return {}; }
  }
  return {};
}

function numericDefense(value) {
  const match = String(value ?? "").match(/-?\d+/);
  return match ? Number(match[0]) : 0;
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function clean(value) {
  return String(value ?? "").trim();
}

function escapeHtml(value) {
  return clean(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}
