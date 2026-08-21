import { initialGeneralSkillSuit } from "./general-skill-catalog.js?v=2";

function initialRuleFor(target) {
  const row = target?.closest?.('tr[data-skill-key]');
  if (!row?.closest?.('[data-skill-category="general"]')) return null;
  const name = row.querySelector('[data-f="name"]')?.value?.trim() || "";
  const suit = initialGeneralSkillSuit(name);
  return suit ? { row, suit } : null;
}

function enforceInput(event) {
  const target = event.target;
  if (!target?.matches?.('[data-f]')) return;
  const rule = initialRuleFor(target);
  if (!rule) return;

  if (target.dataset.f === "level" && Number(target.value || 0) < 1) {
    target.value = "1";
  }

  if (target.dataset.f === rule.suit && target.type === "checkbox" && !target.checked) {
    target.checked = true;
  }
}

document.addEventListener("input", enforceInput, true);
document.addEventListener("change", enforceInput, true);
