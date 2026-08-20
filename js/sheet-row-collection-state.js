export function removeRowByKey(rows, key) {
  return (rows || []).filter(item => item?._key !== key);
}

export function moveRowWithinCategory(rows, key, direction) {
  const source = [...(rows || [])];
  const index = source.findIndex(item => item?._key === key);
  if (index < 0) return { rows: source, moved: false };

  const category = source[index]?.category;
  const step = direction === "up" ? -1 : 1;
  let other = index + step;
  while (other >= 0 && other < source.length && source[other]?.category !== category) other += step;
  if (other < 0 || other >= source.length) return { rows: source, moved: false };

  [source[index], source[other]] = [source[other], source[index]];
  return { rows: source, moved: true };
}

export function normalizeOutfitCategory(category, allowedCategories, fallback = "other") {
  return allowedCategories?.has?.(category) ? category : fallback;
}
