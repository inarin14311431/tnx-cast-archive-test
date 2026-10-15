import { supabase } from "./supabase-client.js";

const SHEET_CHARACTER_LOADED_EVENT = "tnx:sheet-character-loaded";

export async function loadSheetBundle({ publicId, ownerId } = {}) {
  const normalizedPublicId = String(publicId || "").trim();
  const normalizedOwnerId = String(ownerId || "").trim();
  if (!normalizedPublicId || !normalizedOwnerId) throw new Error("キャストを読み込めませんでした。");

  // character_skills / character_outfits は characters(id) へのFKを持つため、1回のPostgREST埋め込みselectで取得する。
  const { data, error } = await supabase
    .from("characters")
    .select("*, character_skills(*), character_outfits(*)")
    .eq("public_id", normalizedPublicId)
    .eq("owner_id", normalizedOwnerId)
    .order("sort_order", { referencedTable: "character_skills" })
    .order("sort_order", { referencedTable: "character_outfits" })
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("キャストを読み込めませんでした。");

  const { character_skills: skills, character_outfits: outfits, ...character } = data;

  globalThis.window?.dispatchEvent?.(new CustomEvent(SHEET_CHARACTER_LOADED_EVENT, {
    detail: { character }
  }));

  return Object.freeze({
    character,
    skills: skills ?? [],
    outfits: outfits ?? []
  });
}
