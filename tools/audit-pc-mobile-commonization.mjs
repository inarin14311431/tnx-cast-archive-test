import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const JS_ROOT = path.join(ROOT, 'js');
const OUT_DIR = path.join(ROOT, 'audit');
const OUT_FILE = path.join(OUT_DIR, 'pc-mobile-commonization-report.md');
const MIN_SIM = 0.42;
const WINDOW = 6;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (ent.isFile() && p.endsWith('.js')) out.push(p);
  }
  return out;
}

function rel(p) { return path.relative(ROOT, p).replaceAll('\\', '/'); }
function classify(p) {
  const s = rel(p).toLowerCase();
  if (!s.includes('sheet')) return null;
  return s.includes('mobile') ? 'mobile' : 'pc';
}

function stripComments(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1 ');
}

function tokens(s) {
  return stripComments(s)
    .replace(/(['"`])(?:\\.|(?!\1)[\s\S])*?\1/g, ' STR ')
    .match(/[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|===|!==|=>|==|!=|<=|>=|&&|\|\||[{}()[\].,:;+\-*\/%!?<>]/g) || [];
}

function shingles(arr, n = 4) {
  const set = new Set();
  for (let i = 0; i <= arr.length - n; i++) set.add(arr.slice(i, i + n).join(' '));
  return set;
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

function lineAt(code, idx) { return code.slice(0, idx).split('\n').length; }

function findClosingBrace(code, openIndex) {
  let depth = 0;
  let quote = null;
  let esc = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = openIndex; i < code.length; i++) {
    const c = code[i], n = code[i + 1];
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i++; } continue; }
    if (quote) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; i++; continue; }
    if (c === '/' && n === '*') { blockComment = true; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function extractFunctions(file, code) {
  const patterns = [
    /(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g,
    /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/g,
    /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?[A-Za-z_$][\w$]*\s*=>\s*\{/g,
  ];
  const seen = new Set();
  const out = [];
  for (const re of patterns) {
    for (const m of code.matchAll(re)) {
      const open = code.indexOf('{', m.index + m[0].length - 1);
      const close = findClosingBrace(code, open);
      if (close < 0) continue;
      const key = `${m.index}:${close}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const body = code.slice(m.index, close + 1);
      const ts = tokens(body);
      if (ts.length < 18) continue;
      out.push({
        file: rel(file), name: m[1], start: lineAt(code, m.index), end: lineAt(code, close),
        tokenCount: ts.length, sh: shingles(ts), body
      });
    }
  }
  return out;
}

function normalizeLine(s) {
  return stripComments(s).trim().replace(/\s+/g, ' ').replace(/(['"`]).*?\1/g, 'STR');
}

function identicalBlocks(file, code) {
  const lines = code.split('\n').map(normalizeLine);
  const out = [];
  for (let i = 0; i <= lines.length - WINDOW; i++) {
    const slice = lines.slice(i, i + WINDOW);
    if (slice.filter(Boolean).length < WINDOW - 1) continue;
    const text = slice.join('\n');
    if (text.length < 120) continue;
    out.push({ file: rel(file), start: i + 1, hash: crypto.createHash('sha1').update(text).digest('hex'), text });
  }
  return out;
}

const responsibilityPatterns = {
  'Supabase/保存・取得': /supabase|\.from\(|\.select\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(/i,
  'dirty/未保存判定': /dirty|unsaved|beforeunload|変更.*保存|未保存/i,
  'バリデーション': /valid|validate|required|error|invalid|check/i,
  '初期値・新規作成': /default|initial|new\s+cast|newcast|一般技能|general.?skill|initialize|init/i,
  '正規化・変換': /normalize|trim\(|parseInt|parseFloat|Number\(|null|undefined|empty/i,
  'アウトフィット': /outfit|weapon|armor|vehicle|cyber|tool/i,
  '画像': /image|avatar|thumbnail|crop|background/i,
  'コンボ/技能': /combo|skill|style|society|connection/i,
};

function responsibilities(code) {
  return Object.entries(responsibilityPatterns).filter(([, re]) => re.test(code)).map(([k]) => k);
}

const files = walk(JS_ROOT).filter(f => classify(f));
const pcs = files.filter(f => classify(f) === 'pc');
const mobs = files.filter(f => classify(f) === 'mobile');
const source = new Map(files.map(f => [f, fs.readFileSync(f, 'utf8')]));
const pcFns = pcs.flatMap(f => extractFunctions(f, source.get(f)));
const mobFns = mobs.flatMap(f => extractFunctions(f, source.get(f)));

const similarities = [];
for (const a of pcFns) {
  for (const b of mobFns) {
    const score = jaccard(a.sh, b.sh);
    const nameBonus = a.name.toLowerCase() === b.name.toLowerCase() ? 0.08 : 0;
    const adjusted = Math.min(1, score + nameBonus);
    if (adjusted >= MIN_SIM) similarities.push({ a, b, score: adjusted });
  }
}
similarities.sort((x, y) => y.score - x.score);

const pcBlocks = pcs.flatMap(f => identicalBlocks(f, source.get(f)));
const mobBlocks = mobs.flatMap(f => identicalBlocks(f, source.get(f)));
const mobHash = new Map();
for (const b of mobBlocks) {
  if (!mobHash.has(b.hash)) mobHash.set(b.hash, []);
  mobHash.get(b.hash).push(b);
}
const dupBlocks = [];
for (const a of pcBlocks) {
  const matches = mobHash.get(a.hash) || [];
  for (const b of matches) dupBlocks.push({ a, b });
}

function gitHistory() {
  try {
    const raw = execSync('git log -n 200 --pretty=format:__COMMIT__%H --name-only', { encoding: 'utf8' });
    const commits = raw.split('__COMMIT__').filter(Boolean).map(chunk => {
      const lines = chunk.trim().split('\n');
      return { sha: lines.shift(), files: lines.filter(Boolean) };
    });
    let pcOnly = 0, mobileOnly = 0, both = 0;
    const examples = [];
    for (const c of commits) {
      const pf = c.files.filter(f => f.startsWith('js/') && f.includes('sheet') && !f.toLowerCase().includes('mobile'));
      const mf = c.files.filter(f => f.startsWith('js/') && f.includes('sheet') && f.toLowerCase().includes('mobile'));
      if (pf.length && mf.length) both++;
      else if (pf.length) { pcOnly++; if (examples.length < 10) examples.push({ type: 'PCのみ', ...c, picked: pf }); }
      else if (mf.length) { mobileOnly++; if (examples.length < 10) examples.push({ type: 'モバイルのみ', ...c, picked: mf }); }
    }
    return { pcOnly, mobileOnly, both, examples };
  } catch {
    return { pcOnly: 0, mobileOnly: 0, both: 0, examples: [] };
  }
}

const hist = gitHistory();
fs.mkdirSync(OUT_DIR, { recursive: true });
const md = [];
md.push('# PC／モバイル共通化候補ロジック一覧');
md.push('');
md.push(`生成日時: ${new Date().toISOString()}`);
md.push('');
md.push('## 調査条件');
md.push('');
md.push('- 対象: `js/` 配下でパスに `sheet` を含む JavaScript');
md.push('- モバイル判定: パスに `mobile` を含むもの');
md.push('- PC判定: `sheet` を含み `mobile` を含まないもの');
md.push('- 関数類似度: 4-token shingle の Jaccard 類似度（同名関数は +0.08 補正）');
md.push(`- 候補閾値: ${(MIN_SIM * 100).toFixed(0)}%`);
md.push(`- 完全一致ブロック: 正規化後 ${WINDOW} 行窓`);
md.push('');
md.push('## 対象ファイル');
md.push('');
md.push('### PC');
for (const f of pcs) md.push(`- \`${rel(f)}\` — ${responsibilities(source.get(f)).join(' / ') || '分類なし'}`);
md.push('');
md.push('### モバイル');
for (const f of mobs) md.push(`- \`${rel(f)}\` — ${responsibilities(source.get(f)).join(' / ') || '分類なし'}`);
md.push('');
md.push('## 関数単位の共通化候補');
md.push('');
if (!similarities.length) md.push('閾値を超える候補なし。');
for (const x of similarities.slice(0, 60)) {
  md.push(`### ${(x.score * 100).toFixed(1)}% — \`${x.a.name}\` ↔ \`${x.b.name}\``);
  md.push('');
  md.push(`- PC: \`${x.a.file}:${x.a.start}-${x.a.end}\` (${x.a.tokenCount} tokens)`);
  md.push(`- Mobile: \`${x.b.file}:${x.b.start}-${x.b.end}\` (${x.b.tokenCount} tokens)`);
  md.push(`- PC責務: ${responsibilities(x.a.body).join(' / ') || '分類なし'}`);
  md.push(`- Mobile責務: ${responsibilities(x.b.body).join(' / ') || '分類なし'}`);
  md.push('');
}
md.push('## 完全一致コードブロック候補');
md.push('');
if (!dupBlocks.length) md.push('完全一致ブロックなし。');
for (const x of dupBlocks.slice(0, 80)) {
  md.push(`- PC \`${x.a.file}:${x.a.start}-${x.a.start + WINDOW - 1}\` ↔ Mobile \`${x.b.file}:${x.b.start}-${x.b.start + WINDOW - 1}\``);
}
md.push('');
md.push('## 直近200コミットのPC／モバイル分離修正');
md.push('');
md.push(`- PCのみ変更: **${hist.pcOnly}**`);
md.push(`- モバイルのみ変更: **${hist.mobileOnly}**`);
md.push(`- PC／モバイル同時変更: **${hist.both}**`);
md.push('');
for (const e of hist.examples) md.push(`- ${e.type}: \`${e.sha.slice(0, 10)}\` — ${e.picked.map(f => `\`${f}\``).join(', ')}`);
md.push('');
md.push('## 判定上の注意');
md.push('');
md.push('- このレポートは機械抽出。DOM操作・表示制御まで共通化すべきとは判断しない。');
md.push('- 高類似でもUI依存が強い関数は、payload生成・正規化・検証など純粋ロジックだけ切り出す。');
md.push('- 低類似でも同じ業務ルールを別実装している場合があるため、保存payload・初期値・一般技能・数値/null正規化は人手確認する。');
md.push('- 次工程では上位候補のみ行範囲指定で取得し、共通core候補／UIに残す処理／見送りに分類する。');
md.push('');

fs.writeFileSync(OUT_FILE, md.join('\n') + '\n');
console.log(`wrote ${path.relative(ROOT, OUT_FILE)}`);
console.log(`pc files=${pcs.length}, mobile files=${mobs.length}, similarities=${similarities.length}, identicalBlocks=${dupBlocks.length}`);
