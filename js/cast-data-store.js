import { supabase } from "./supabase-client.js";

/* Shared read-only data access for the public cast view.
 * Presentation modules must use this store instead of issuing their own
 * characters -> child-table lookup chains.
 */
let characterIdPromise = null;
let styleSkillsPromise = null;
let outfitsPromise = null;

function getPublicId() {
  return new URLSearchParams(location.search).get("id")?.trim() || "";
}

export async function getCharacterId() {
  if (characterIdPromise) return characterIdPromise;

  characterIdPromise = (async () => {
    const publicId = getPublicId();
    if (!publicId) return null;

    const { data, error } = await supabase
      .from("characters")
      .select("id")
      .eq("public_id", publicId)
      .maybeSingle();

    if (error) throw error;
    return data?.id ?? null;
  })();

  return characterIdPromise;
}

export async function getStyleSkills() {
  if (styleSkillsPromise) return styleSkillsPromise;

  styleSkillsPromise = (async () => {
    const characterId = await getCharacterId();
    if (!characterId) return [];

    const { data, error } = await supabase
      .from("character_skills")
      .select("*")
      .eq("character_id", characterId)
      .eq("category", "style")
      .order("sort_order");

    if (error) throw error;
    return data || [];
  })();

  return styleSkillsPromise;
}

export async function getOutfits() {
  if (outfitsPromise) return outfitsPromise;

  outfitsPromise = (async () => {
    const characterId = await getCharacterId();
    if (!characterId) return [];

    const { data, error } = await supabase
      .from("character_outfits")
      .select("*")
      .eq("character_id", characterId)
      .order("category")
      .order("sort_order")
      .order("name");

    if (error) throw error;
    return data || [];
  })();

  return outfitsPromise;
}
