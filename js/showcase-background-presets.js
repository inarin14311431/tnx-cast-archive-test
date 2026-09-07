export const SHOWCASE_BACKGROUND_BUCKET = "act-showcase-backgrounds";
export const SHOWCASE_BACKGROUND_PUBLIC_BASE = "https://koprmbkoftuuffslhsvt.supabase.co/storage/v1/object/public/act-showcase-backgrounds";

export const SHOWCASE_BACKGROUND_PRESETS = Object.freeze([
  Object.freeze({
    key: "neon-waterfront",
    name: "ネオン・ウォーターフロント",
    description: "雨とネオンが反射する湾岸・高架道路エリア",
    url: `${SHOWCASE_BACKGROUND_PUBLIC_BASE}/neon-waterfront.webp`
  }),
  Object.freeze({
    key: "arcology-lobby",
    name: "アーコロジー・ロビー",
    description: "企業アーコロジー上層の静かな展望ロビー",
    url: `${SHOWCASE_BACKGROUND_PUBLIC_BASE}/arcology-lobby.webp`
  }),
  Object.freeze({
    key: "red-area-alley",
    name: "レッドエリア裏路地",
    description: "配管とネオンに埋もれた歓楽街の裏路地",
    url: `${SHOWCASE_BACKGROUND_PUBLIC_BASE}/red-area-alley.webp`
  }),
  Object.freeze({
    key: "sky-lounge",
    name: "スカイラウンジ",
    description: "摩天楼を望む上層階のラウンジ／バー",
    url: `${SHOWCASE_BACKGROUND_PUBLIC_BASE}/sky-lounge.webp`
  }),
  Object.freeze({
    key: "neuro-dataspace",
    name: "ニューロ・データスペース",
    description: "都市ネットワークへ潜る抽象的な電脳空間",
    url: `${SHOWCASE_BACKGROUND_PUBLIC_BASE}/neuro-dataspace.webp`
  })
]);

export function findShowcaseBackgroundPreset(key) {
  const normalized = String(key || "").trim().toLowerCase();
  return SHOWCASE_BACKGROUND_PRESETS.find(preset => preset.key === normalized) || null;
}

export function findShowcaseBackgroundPresetByUrl(url) {
  const normalized = String(url || "").trim();
  return SHOWCASE_BACKGROUND_PRESETS.find(preset => preset.url === normalized) || null;
}
