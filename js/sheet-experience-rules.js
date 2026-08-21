// Initial skill package:
// - 13 fixed General skills each have their first level for free (130 XP total).
// - Social has a flexible 4-level free pool (20 XP).
// - Connection has a separate flexible 3-level free pool (15 XP).
// The three pools are not interchangeable. Character construction then grants 170 XP.
export const INITIAL_GENERAL_SKILL_COUNT = 13;
export const INITIAL_GENERAL_SKILL_COST = 130;
export const INITIAL_SOCIAL_SKILL_LEVELS = 4;
export const INITIAL_SOCIAL_SKILL_COST = 20;
export const INITIAL_CONNECTION_SKILL_LEVELS = 3;
export const INITIAL_CONNECTION_SKILL_COST = 15;
export const INITIAL_SKILL_COST = INITIAL_GENERAL_SKILL_COST + INITIAL_SOCIAL_SKILL_COST + INITIAL_CONNECTION_SKILL_COST;
export const CREATION_ALLOWANCE = 170;

export function numericValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function steppedExperienceCost(base, current, threshold) {
  const normalizedBase = numericValue(base);
  const normalizedCurrent = Math.max(normalizedBase, numericValue(current));
  let total = 0;
  for (let value = normalizedBase + 1; value <= normalizedCurrent; value++) {
    total += value <= numericValue(threshold) ? 20 : 40;
  }
  return total;
}

export function resolveCanonicalCurrent({ baseline = 0, current, growth = 0 } = {}) {
  const normalizedBaseline = numericValue(baseline);
  if (current !== undefined && current !== null && String(current).trim() !== "") {
    return numericValue(current);
  }
  return normalizedBaseline + Math.max(0, numericValue(growth));
}

export function paidSkillLevel(level, freeLevel = 0) {
  const normalizedLevel = Math.max(0, numericValue(level));
  const normalizedFree = Math.min(normalizedLevel, Math.max(0, numericValue(freeLevel)));
  return normalizedLevel - normalizedFree;
}

export function paidFixedInitialGeneralLevel(level, freeLevel = 0) {
  return Math.max(0, paidSkillLevel(level, freeLevel) - 1);
}

export function paidFlexibleInitialSkillCost({ social = 0, connection = 0 } = {}) {
  const paidSocial = Math.max(0, numericValue(social) - INITIAL_SOCIAL_SKILL_COST);
  const paidConnection = Math.max(0, numericValue(connection) - INITIAL_CONNECTION_SKILL_COST);
  return {
    social: paidSocial,
    connection: paidConnection,
    total: paidSocial + paidConnection
  };
}
