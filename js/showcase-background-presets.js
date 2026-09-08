export const SHOWCASE_BACKGROUND_BUCKET = "act-showcase-backgrounds";
export const SHOWCASE_BACKGROUND_PUBLIC_BASE = "https://koprmbkoftuuffslhsvt.supabase.co/storage/v1/object/public/act-showcase-backgrounds";

const SHOWCASE_BACKGROUND_ASSET_BASE = new URL("../assets/showcase/backgrounds/", import.meta.url);
const assetUrl = filename => new URL(filename, SHOWCASE_BACKGROUND_ASSET_BASE).href;

export const SHOWCASE_BACKGROUND_PRESETS = Object.freeze([
  Object.freeze({
    key: "nova-central-ring",
    name: "トーキョーN◎VA",
    description: "イワヤトビルを中心に同心円状へ広がるトーキョーN◎VAの中央市街",
    url: assetUrl("nova-central-ring.svg")
  }),
  Object.freeze({
    key: "neotokyo-bay",
    name: "木更津湖港湾",
    description: "高層建築と港湾施設の灯りが水面に映る木更津湖沿岸エリア",
    url: assetUrl("neotokyo-bay.svg")
  }),
  Object.freeze({
    key: "sunrise-megacity",
    name: "夜明けのメガシティ",
    description: "朝焼けに染まる高所からトーキョーN◎VAを一望する都市遠景",
    url: assetUrl("sunrise-megacity.svg")
  }),
  Object.freeze({
    key: "neon-market",
    name: "イエローエリア",
    description: "ネオンと露店、雑多な都市設備が密集するイエローエリアの街路",
    url: assetUrl("neon-market.svg")
  }),
  Object.freeze({
    key: "industrial-port",
    name: "工業港湾地区",
    description: "巨大クレーンとコンテナ船が並ぶ工業港湾エリア",
    url: assetUrl("industrial-port.svg")
  }),
  Object.freeze({
    key: "executive-lounge",
    name: "ホワイトエリア",
    description: "企業上層階のラウンジから摩天楼を望むホワイトエリアの風景",
    url: assetUrl("executive-lounge.svg")
  }),
  Object.freeze({
    key: "incident-blockade",
    name: "封鎖区域",
    description: "規制ラインと蒸気が漂う事件直後の封鎖都市街路",
    url: assetUrl("incident-blockade.svg")
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
