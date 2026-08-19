export function chooseGeneralSkillColumn({ left = 0, right = 0 } = {}) {
  const leftCount = Math.max(0, Number(left || 0));
  const rightCount = Math.max(0, Number(right || 0));
  return leftCount <= rightCount ? "left" : "right";
}
