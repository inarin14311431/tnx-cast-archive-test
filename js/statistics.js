import { supabase } from "./supabase-client.js";

const statusNode = document.querySelector("#statistics-status");
const generatedAtNode = document.querySelector("#statistics-generated-at");
const errorNode = document.querySelector("#statistics-error");

initialize();

async function initialize() {
  try {
    setStatus("公開データ集計中");
    const { data, error } = await supabase
      .from("characters")
      .select(`
        public_id, player_name, affiliation, citizen_rank, experience_points,
        style_1, style_1_mark, style_2, style_2_mark, style_3, style_3_mark,
        updated_at
      `)
      .eq("visibility", "public");

    if (error) throw error;

    const characters = data ?? [];
    renderStatistics(buildStatistics(characters));
    const now = new Date();
    generatedAtNode.textContent = `集計日時 ${formatDateTime(now)}`;
    setStatus(`${characters.length}件 集計完了`);
  } catch (error) {
    console.error("Statistics load failed:", error);
    setStatus("集計失敗");
    if (errorNode) {
      errorNode.hidden = false;
      errorNode.textContent = "統計情報を取得できませんでした。時間をおいて再度読み込んでください。";
    }
  }
}

function buildStatistics(characters) {
  const players = new Set();
  const affiliations = new Set();
  const styleCounts = new Map();
  const affiliationCounts = new Map();
  const rankCounts = new Map();
  const marks = { persona: 0, key: 0, dual: 0 };
  const expBins = new Map([
    ["0", 0],
    ["1–30", 0],
    ["31–60", 0],
    ["61–100", 0],
    ["101–200", 0],
    ["201+", 0]
  ]);

  let experienceTotal = 0;
  let recent = 0;
  const recentThreshold = Date.now() - 30 * 24 * 60 * 60 * 1000;

  for (const character of characters) {
    const player = clean(character.player_name);
    if (player) players.add(player);

    const affiliation = clean(character.affiliation);
    if (affiliation) {
      affiliations.add(affiliation);
      increment(affiliationCounts, affiliation);
    }

    increment(rankCounts, clean(character.citizen_rank) || "未登録");

    const exp = numberOrZero(character.experience_points);
    experienceTotal += exp;
    incrementExpBin(expBins, exp);

    const updated = new Date(character.updated_at).getTime();
    if (Number.isFinite(updated) && updated >= recentThreshold) recent += 1;

    for (const index of [1, 2, 3]) {
      const style = clean(character[`style_${index}`]);
      const mark = clean(character[`style_${index}_mark`]);
      if (style) increment(styleCounts, style);
      if (mark.includes("◎") && mark.includes("●")) marks.dual += 1;
      if (mark.includes("◎")) marks.persona += 1;
      if (mark.includes("●")) marks.key += 1;
    }
  }

  return {
    total: characters.length,
    players: players.size,
    affiliations: affiliations.size,
    averageExp: characters.length ? Math.round(experienceTotal / characters.length) : 0,
    recent,
    styleCounts,
    affiliationCounts,
    rankCounts,
    expBins,
    marks
  };
}

function renderStatistics(stats) {
  setText("#stat-total-casts", stats.total);
  setText("#stat-players", stats.players);
  setText("#stat-affiliations", stats.affiliations);
  setText("#stat-average-exp", stats.averageExp);
  setText("#stat-recent", stats.recent);

  renderRanking("#statistics-styles", stats.styleCounts, { limit: 20 });
  renderRanking("#statistics-ranks", stats.rankCounts, { limit: 12 });
  renderRanking("#statistics-exp", stats.expBins, { preserveOrder: true });
  renderRanking("#statistics-affiliation-ranking", stats.affiliationCounts, { limit: 12 });
  renderMarks(stats.marks);
}

function renderRanking(selector, source, options = {}) {
  const root = document.querySelector(selector);
  if (!root) return;

  let entries = Array.from(source.entries());
  if (!options.preserveOrder) {
    entries.sort((a, b) => b[1] - a[1] || localeCompareJa(a[0], b[0]));
  }
  if (options.limit) entries = entries.slice(0, options.limit);

  if (!entries.length) {
    root.innerHTML = '<p class="statistics-empty">集計対象データがありません。</p>';
    return;
  }

  const max = Math.max(1, ...entries.map(([, value]) => value));
  root.replaceChildren(...entries.map(([label, value]) => createRankingRow(label, value, max)));
}

function createRankingRow(label, value, max) {
  const ratio = Math.max(0, Math.min(100, (value / max) * 100));
  const row = document.createElement("div");
  row.className = "statistics-ranking__row";
  row.style.setProperty("--ratio", `${ratio.toFixed(2)}%`);

  const labelNode = document.createElement("span");
  labelNode.className = "statistics-ranking__label";
  labelNode.textContent = label;
  labelNode.title = label;

  const bar = document.createElement("span");
  bar.className = "statistics-ranking__bar";
  const fill = document.createElement("i");
  fill.style.setProperty("--ratio", `${ratio.toFixed(2)}%`);
  bar.append(fill);

  const valueNode = document.createElement("strong");
  valueNode.className = "statistics-ranking__value";
  valueNode.textContent = String(value);

  row.append(labelNode, bar, valueNode);
  return row;
}

function renderMarks(marks) {
  const root = document.querySelector("#statistics-marks");
  if (!root) return;
  const items = [
    ["ペルソナ ◎", marks.persona, "PERSONA"],
    ["キー ●", marks.key, "KEY"],
    ["両方 ◎●", marks.dual, "DUAL MARK"],
  ];
  root.replaceChildren(...items.map(([label, value, english]) => {
    const item = document.createElement("div");
    item.className = "statistics-split__item";
    const labelNode = document.createElement("span");
    labelNode.textContent = label;
    const valueNode = document.createElement("strong");
    valueNode.textContent = String(value);
    const englishNode = document.createElement("small");
    englishNode.textContent = english;
    item.append(labelNode, valueNode, englishNode);
    return item;
  }));
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function incrementExpBin(map, value) {
  if (value <= 0) increment(map, "0");
  else if (value <= 30) increment(map, "1–30");
  else if (value <= 60) increment(map, "31–60");
  else if (value <= 100) increment(map, "61–100");
  else if (value <= 200) increment(map, "101–200");
  else increment(map, "201+");
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = Number(value).toLocaleString("ja-JP");
}

function setStatus(value) {
  if (statusNode) statusNode.textContent = value;
}

function clean(value) {
  return String(value ?? "").trim();
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function localeCompareJa(a, b) {
  return String(a).localeCompare(String(b), "ja", { sensitivity: "base", numeric: true });
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
