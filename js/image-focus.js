const FOCUS_HASH_KEY = "tnx-focus-y";
const DEFAULT_FOCUS_Y = 0;

function clampFocus(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_FOCUS_Y;
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function splitImageUrl(value) {
  const source = String(value ?? "").trim();
  const hashIndex = source.indexOf("#");
  if (hashIndex < 0) return { base: source, hash: "" };
  return {
    base: source.slice(0, hashIndex),
    hash: source.slice(hashIndex + 1)
  };
}

export function getImageFocusY(imageUrl) {
  const { hash } = splitImageUrl(imageUrl);
  if (!hash) return DEFAULT_FOCUS_Y;
  const raw = new URLSearchParams(hash).get(FOCUS_HASH_KEY);
  return raw === null ? DEFAULT_FOCUS_Y : clampFocus(raw);
}

export function setImageFocusY(imageUrl, focusY) {
  const { base, hash } = splitImageUrl(imageUrl);
  if (!base) return "";

  const params = new URLSearchParams(hash);
  const normalized = clampFocus(focusY);
  if (normalized === DEFAULT_FOCUS_Y) params.delete(FOCUS_HASH_KEY);
  else params.set(FOCUS_HASH_KEY, String(normalized));

  const nextHash = params.toString();
  return nextHash ? `${base}#${nextHash}` : base;
}

export function getImageObjectPosition(imageUrl) {
  return `50% ${getImageFocusY(imageUrl)}%`;
}
