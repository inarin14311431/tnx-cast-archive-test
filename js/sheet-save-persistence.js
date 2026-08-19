import { supabase } from "./supabase-client.js";

const SAVE_RPC = "save_character_bundle";

export async function persistSheetBundle({
  characterId = null,
  character,
  skills,
  outfits
} = {}) {
  const { data, error } = await supabase.rpc(SAVE_RPC, {
    p_character_id: characterId,
    p_character: character,
    p_skills: skills,
    p_outfits: outfits
  });

  if (error) throw error;
  if (!data?.id || !data?.public_id) throw new Error("保存結果を確認できませんでした。");
  return data;
}
