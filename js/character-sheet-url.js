const CHARACTER_SHEETS_ORIGIN = "https://character-sheets.appspot.com";
const TNX_EDIT_PATH = "/tnx/edit.html";
const KEY_PATTERN = /^[A-Za-z0-9_-]+$/;

export function normalizeCharacterSheetUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";

  try {
    const url = new URL(value);
    if (url.origin !== CHARACTER_SHEETS_ORIGIN) return null;
    if (url.pathname !== TNX_EDIT_PATH) return null;
    const key = String(url.searchParams.get("key") || "").trim();
    if (!KEY_PATTERN.test(key)) return null;
    url.protocol = "https:";
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

export function isValidCharacterSheetUrl(raw) {
  return normalizeCharacterSheetUrl(raw) !== null;
}
