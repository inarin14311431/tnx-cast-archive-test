export function normalizeSkillLevel(value) {
  return Math.max(0, Number(value || 0));
}

export function normalizeSkillFreeLevel(freeLevel, level) {
  const normalizedLevel = normalizeSkillLevel(level);
  return Math.min(Math.max(0, Number(freeLevel || 0)), normalizedLevel);
}

export function shouldSelectAllSuits(level) {
  return normalizeSkillLevel(level) >= 4;
}

export function resolveSkillLevelAfterSuitChange({
  currentLevel = 0,
  selectedSuitCount = 0,
  checked = false
} = {}) {
  const count = Math.max(0, Number(selectedSuitCount || 0));
  if (!checked) return count;
  return Math.max(normalizeSkillLevel(currentLevel), count);
}
