export function collectCharacterInputSnapshot({
  root = document,
  structuredFields = [],
  experienceTotal = 0
} = {}) {
  const value = selector => root.querySelector(selector)?.value ?? "";
  const text = selector => root.querySelector(selector)?.textContent ?? "";

  return {
    base: {
      character_name: value("#character-name"),
      character_kana: value("#character-kana"),
      handle: value("#handle"),
      player_name: value("#player-name"),
      affiliation: value("#affiliation"),
      citizen_rank: value("#citizen-rank"),
      summary: value("#summary"),
      profile: value("#profile"),
      visibility: value("#visibility"),
      experience_points: Number(experienceTotal ?? text("#exp-total") ?? 0)
    },
    structured: Object.fromEntries(
      structuredFields.map(([name, selector]) => [name, value(selector)])
    )
  };
}
