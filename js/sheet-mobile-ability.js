import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";

const ABILITIES = [
  ["reason", "理性", "REASON"],
  ["passion", "感情", "PASSION"],
  ["life", "生命", "LIFE"],
  ["mundane", "外界", "MUNDANE"]
];

const $ = selector => document.querySelector(selector);
const num = value => Number(value || 0);

let user = null;
let character = null;
let activeAbility = null;
let abilityDirty = false;
let replayingSave = false;
let savingAbility = false;

init();

async function init() {
  user = await requireAuth();
  if (!user) return;
  const publicId = new URLSearchParams(location.search).get("id");
  if (!publicId) return;

  bind();
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("public_id", publicId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error(error);
    return;
  }
  character = data;
  renderSummary();
}

function bind() {
  $("#mobile-ability-summary")?.addEventListener("click", event => {
    const ability = event.target.closest("[data-mobile-ability]");
    if (ability) {
      openAbilityDialog(ability.dataset.mobileAbility);
      return;
    }
    if (event.target.closest("[data-mobile-cs]")) openCsDialog();
  });

  $("#mobile-ability-dialog-cancel")?.addEventListener("click", () => $("#mobile-ability-dialog")?.close());
  $("#mobile-ability-dialog-apply")?.addEventListener("click", event => {
    event.preventDefault();
    applyAbilityDialog();
  });
  $("#mobile-ability-dialog")?.addEventListener("cancel", event => {
    event.preventDefault();
    $("#mobile-ability-dialog")?.close();
  });
  ["ability-base", "ability-mod", "control-base", "control-mod"].forEach(name => {
    $(`[data-mobile-ability-input="${name}"]`)?.addEventListener("input", refreshAbilityPreview);
  });

  $("#mobile-cs-dialog-cancel")?.addEventListener("click", () => $("#mobile-cs-dialog")?.close());
  $("#mobile-cs-dialog-apply")?.addEventListener("click", event => {
    event.preventDefault();
    applyCsDialog();
  });
  $("#mobile-cs-dialog")?.addEventListener("cancel", event => {
    event.preventDefault();
    $("#mobile-cs-dialog")?.close();
  });
  ["base", "mod"].forEach(name => {
    $(`[data-mobile-cs-input="${name}"]`)?.addEventListener("input", refreshCsPreview);
  });

  $("#mobile-save")?.addEventListener("click", interceptSave, true);
  window.addEventListener("beforeunload", event => {
    if (!abilityDirty) return;
    event.preventDefault();
    event.returnValue = "";
  });
}

function renderSummary() {
  const root = $("#mobile-ability-summary");
  if (!root || !character) return;
  root.innerHTML = `
    <div class="mobile-ability-columns">
      ${ABILITIES.map(([key, jp, en]) => {
        const value = num(character[`${key}_value`] ?? character[`${key}_base`]);
        const control = num(character[`${key}_control`] ?? character[`${key}_control_base`]);
        return `<button type="button" class="mobile-ability-cell" data-mobile-ability="${key}">
          <span class="mobile-ability-cell__label">${jp}<small>${en}</small></span>
          <strong>${value}</strong>
          <span class="mobile-ability-cell__control">制御 <b>${control}</b></span>
        </button>`;
      }).join("")}
    </div>
    <button type="button" class="mobile-cs-cell" data-mobile-cs="1">
      <span>CS <small>CONTROL SPEED</small></span>
      <strong>${num(character.cs ?? character.cs_base)}</strong>
      <em>タップして編集</em>
    </button>`;
}

function openAbilityDialog(key) {
  if (!character || !ABILITIES.some(([ability]) => ability === key)) return;
  activeAbility = key;
  const definition = ABILITIES.find(([ability]) => ability === key);
  $("#mobile-ability-dialog-title").textContent = `${definition[1]} / ${definition[2]}`;
  setAbilityInput("ability-base", character[`${key}_base`] ?? character[`${key}_value`] ?? 0);
  setAbilityInput("ability-mod", num(character[`${key}_gear`]) + num(character[`${key}_manual`]));
  setAbilityInput("control-base", character[`${key}_control_base`] ?? character[`${key}_control`] ?? 0);
  setAbilityInput("control-mod", num(character[`${key}_control_gear`]) + num(character[`${key}_control_manual`]));
  refreshAbilityPreview();
  $("#mobile-ability-dialog")?.showModal();
}

function setAbilityInput(name, value) {
  const input = $(`[data-mobile-ability-input="${name}"]`);
  if (input) input.value = String(num(value));
}

function abilityInput(name) {
  return num($(`[data-mobile-ability-input="${name}"]`)?.value);
}

function impliedBaseline(baseField, growthField) {
  const oldBase = num(character?.[baseField]);
  const oldGrowth = Math.max(0, num(character?.[growthField]));
  return Math.max(0, oldBase - oldGrowth);
}

function refreshAbilityPreview() {
  if (!character || !activeAbility) return;
  const base = Math.max(0, abilityInput("ability-base"));
  const mod = abilityInput("ability-mod");
  const controlBase = Math.max(0, abilityInput("control-base"));
  const controlMod = abilityInput("control-mod");
  const baseLine = impliedBaseline(`${activeAbility}_base`, `${activeAbility}_growth`);
  const controlBaseLine = impliedBaseline(`${activeAbility}_control_base`, `${activeAbility}_control_growth`);
  const final = $("#mobile-ability-final");
  const controlFinal = $("#mobile-control-final");
  const growth = $("#mobile-ability-growth");
  const controlGrowth = $("#mobile-control-growth");
  if (final) final.textContent = String(base + mod);
  if (controlFinal) controlFinal.textContent = String(controlBase + controlMod);
  if (growth) growth.textContent = String(Math.max(0, base - baseLine));
  if (controlGrowth) controlGrowth.textContent = String(Math.max(0, controlBase - controlBaseLine));
}

function applyAbilityDialog() {
  if (!character || !activeAbility) return;
  const key = activeAbility;
  const base = Math.max(0, abilityInput("ability-base"));
  const mod = abilityInput("ability-mod");
  const controlBase = Math.max(0, abilityInput("control-base"));
  const controlMod = abilityInput("control-mod");
  const baseLine = impliedBaseline(`${key}_base`, `${key}_growth`);
  const controlBaseLine = impliedBaseline(`${key}_control_base`, `${key}_control_growth`);

  character[`${key}_base`] = base;
  character[`${key}_growth`] = Math.max(0, base - baseLine);
  character[`${key}_gear`] = mod;
  character[`${key}_manual`] = 0;
  character[`${key}_value`] = base + mod;
  character[`${key}_control_base`] = controlBase;
  character[`${key}_control_growth`] = Math.max(0, controlBase - controlBaseLine);
  character[`${key}_control_gear`] = controlMod;
  character[`${key}_control_manual`] = 0;
  character[`${key}_control`] = controlBase + controlMod;

  markAbilityDirty();
  renderSummary();
  $("#mobile-ability-dialog")?.close();
}

function openCsDialog() {
  if (!character) return;
  const base = $("[data-mobile-cs-input=\"base\"]");
  const mod = $("[data-mobile-cs-input=\"mod\"]");
  if (base) base.value = String(num(character.cs_base ?? character.cs));
  if (mod) mod.value = String(num(character.cs_gear) + num(character.cs_manual));
  refreshCsPreview();
  $("#mobile-cs-dialog")?.showModal();
}

function refreshCsPreview() {
  const base = num($("[data-mobile-cs-input=\"base\"]")?.value);
  const mod = num($("[data-mobile-cs-input=\"mod\"]")?.value);
  if ($("#mobile-cs-final")) $("#mobile-cs-final").textContent = String(base + mod);
}

function applyCsDialog() {
  if (!character) return;
  const base = num($("[data-mobile-cs-input=\"base\"]")?.value);
  const mod = num($("[data-mobile-cs-input=\"mod\"]")?.value);
  character.cs_base = base;
  character.cs_gear = mod;
  character.cs_manual = 0;
  character.cs = base + mod;
  markAbilityDirty();
  renderSummary();
  $("#mobile-cs-dialog")?.close();
}

function markAbilityDirty() {
  abilityDirty = true;
  const button = $("#mobile-save");
  if (button) {
    button.dataset.state = "dirty";
    button.textContent = "変更を保存";
  }
  const status = $("#mobile-save-status");
  if (status) {
    status.dataset.state = "dirty";
    status.textContent = "未保存の変更があります";
  }
}

async function interceptSave(event) {
  if (replayingSave || !abilityDirty || savingAbility || !character) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  savingAbility = true;
  setSavingState();
  try {
    const payload = collectAbilityPayload();
    const { error } = await supabase
      .from("characters")
      .update(payload)
      .eq("id", character.id)
      .eq("owner_id", user.id);
    if (error) throw error;
    abilityDirty = false;
    setSavedState();
    replayingSave = true;
    $("#mobile-save")?.click();
  } catch (error) {
    console.error(error);
    const status = $("#mobile-save-status");
    if (status) {
      status.dataset.state = "error";
      status.textContent = `能力値の保存に失敗しました：${error?.message || "不明なエラー"}`;
    }
    const button = $("#mobile-save");
    if (button) {
      button.dataset.state = "dirty";
      button.textContent = "変更を保存";
    }
  } finally {
    replayingSave = false;
    savingAbility = false;
  }
}

function collectAbilityPayload() {
  const payload = {};
  for (const [key] of ABILITIES) {
    ["base", "growth", "gear", "manual", "value", "control_base", "control_growth", "control_gear", "control_manual", "control"].forEach(suffix => {
      payload[`${key}_${suffix}`] = num(character[`${key}_${suffix}`]);
    });
  }
  payload.cs_base = num(character.cs_base);
  payload.cs_gear = num(character.cs_gear);
  payload.cs_manual = num(character.cs_manual);
  payload.cs = num(character.cs);
  return payload;
}

function setSavingState() {
  const button = $("#mobile-save");
  if (button) {
    button.dataset.state = "saving";
    button.disabled = true;
    button.textContent = "保存中…";
  }
  const status = $("#mobile-save-status");
  if (status) {
    status.dataset.state = "loading";
    status.textContent = "保存中…";
  }
}

function setSavedState() {
  const button = $("#mobile-save");
  if (button) {
    button.dataset.state = "saved";
    button.disabled = false;
    button.textContent = "保存済み";
  }
  const status = $("#mobile-save-status");
  if (status) {
    status.dataset.state = "saved";
    status.textContent = "保存済み";
  }
}
