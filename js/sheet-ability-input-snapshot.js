export function collectAbilityInputSnapshot({
  root = document,
  abilities = []
} = {}) {
  const number = selector => Number(root.querySelector(selector)?.value || 0);

  return {
    values: Object.fromEntries(
      abilities.map(([key]) => {
        const controlKey = `${key}-control`;
        return [key, {
          current: number(`#${key}-base`),
          modifier: number(`#${key}-mod`),
          controlCurrent: number(`#${controlKey}-base`),
          controlModifier: number(`#${controlKey}-mod`)
        }];
      })
    ),
    cs: {
      current: number("#cs-base"),
      modifier: number("#cs-mod")
    }
  };
}
