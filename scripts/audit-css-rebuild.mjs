import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
async function filesUnder(directory, extension) {
  const result = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (!extension || full.endsWith(extension)) result.push(full);
    }
  }
  await walk(directory);
  return result.sort();
}

const relative = file => path.relative(root, file).replaceAll(path.sep, "/");
const themeBlock = (source, theme) => source.match(new RegExp(`:root\\[data-theme="${theme}"\\]\\s*\\{([\\s\\S]*?)\\}`))?.[1] || "";
const themeHexToken = (block, token) => block.match(new RegExp(`--${token}\\s*:\\s*(#[0-9a-fA-F]{6})\\s*;`))?.[1];
const relativeLuminance = hex => {
  const channels = hex.slice(1).match(/.{2}/g).map(value => parseInt(value, 16) / 255);
  const linear = channels.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
};
const contrastRatio = (foreground, background) => {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
};
const violations = [];
const cssFiles = await filesUnder(path.join(root, "css-next"), ".css");

function maskCssCommentsAndStrings(source) {
  let result = "";
  let state = "code";
  let quote = "";
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (state === "comment") {
      if (char === "*" && next === "/") {
        result += "  ";
        index += 1;
        state = "code";
      } else result += char === "\n" ? "\n" : " ";
      continue;
    }
    if (state === "string") {
      if (char === "\\") {
        result += char + (next || "");
        index += 1;
      } else if (char === quote) {
        result += char;
        state = "code";
      } else result += "{};".includes(char) ? " " : char;
      continue;
    }
    if (char === "/" && next === "*") {
      result += "  ";
      index += 1;
      state = "comment";
    } else if (char === '"' || char === "'") {
      result += char;
      quote = char;
      state = "string";
    } else result += char;
  }
  return result;
}

function collectContextualSelectors(source) {
  const clean = maskCssCommentsAndStrings(source);
  const stack = [];
  const selectors = [];
  let segmentStart = 0;
  const normalize = value => value.replace(/\s+/g, " ").trim();

  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    if (char === "{") {
      const prelude = normalize(clean.slice(segmentStart, index));
      if (prelude.startsWith("@")) {
        stack.push({ type: "at-rule", label: prelude });
      } else {
        const context = stack
          .filter(item => item.type === "at-rule")
          .map(item => item.label)
          .join(" > ");
        if (prelude) selectors.push({ selector: prelude, context });
        stack.push({ type: "rule", label: prelude });
      }
      segmentStart = index + 1;
    } else if (char === ";") {
      if (!stack.length || stack.at(-1)?.type === "rule") segmentStart = index + 1;
    } else if (char === "}") {
      stack.pop();
      segmentStart = index + 1;
    }
  }
  return selectors;
}
await import(pathToFileURL(path.join(root, "js", "theme-registry.js")));
const themeRegistry = globalThis.TNX_THEME_REGISTRY;
const expectedThemeOptions = themeRegistry.themes.map(theme => [theme.id, theme.label]);
const expectedThemes = themeRegistry.themes
  .map(theme => theme.id)
  .filter(theme => !new Set(["spectrum-neon", "statistics-bureau"]).has(theme));
const activeThemePages = [
  "404.html", "account.html", "acts.html", "backup.html", "cast.html", "combos.html",
  "index.html", "login.html", "manual-data-import.html", "mobile-transfer.html",
  "password-reset.html", "register.html", "sheet-mobile-new.html", "sheet-mobile.html",
  "sheet.html", "showcase-generator.html", "statistics.html", "transfer.html",
  "troop.html", "troops.html"
];
const cssReachabilityPages = [...activeThemePages, "act-showcase.html"];

for (const file of cssFiles) {
  const source = await readFile(file, "utf8");
  if (/!important\b/i.test(source)) violations.push(`${relative(file)}: !important`);
  const selectorOwners = new Map();
  for (const { selector, context } of collectContextualSelectors(source)) {
    const key = `${context}\u0000${selector}`;
    if (selectorOwners.has(key)) {
      const suffix = context ? ` in ${context}` : " at top level";
      violations.push(`${relative(file)}: duplicate selector ${selector}${suffix}`);
    } else selectorOwners.set(key, true);
  }
}

const themeTokenSource = await readFile(path.join(root, "css-next", "themes", "presets.css"), "utf8");
for (const theme of expectedThemes) {
  if (!themeTokenSource.includes(`:root[data-theme="${theme}"]`)) {
    violations.push(`css-next/themes/presets.css: missing ${theme} token set`);
  }
}
for (const token of [
  "color-bg", "color-surface", "color-surface-alt", "color-text", "color-muted",
  "color-accent", "color-accent-strong", "color-danger"
]) {
  const count = [...themeTokenSource.matchAll(new RegExp(`--${token}\\s*:`, "g"))].length;
  if (count !== expectedThemes.length) {
    violations.push(`css-next/themes/presets.css: --${token} count ${count}, expected ${expectedThemes.length}`);
  }
}
const invalidThemeSelectorLine = themeTokenSource
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => line.includes("{") && !line.startsWith("--"))
  .find(line => !/^:root(?:\[data-theme="[a-z-]+"\])?(?:\s*,)?\s*\{$/.test(line));
if (invalidThemeSelectorLine) {
  violations.push(`css-next/themes/presets.css: component selector found: ${invalidThemeSelectorLine}`);
}

const lightThemeTextChecks = [
  ["color-text", "color-surface", 4.5],
  ["color-muted", "color-surface", 4.5],
  ["color-placeholder", "color-field", 4.5],
  ["color-accent", "color-surface", 4.5],
  ["color-danger", "color-surface", 4.5],
  ["color-success", "color-surface", 4.5],
  ["color-warning", "color-surface", 4.5],
  ["color-feature", "color-surface", 4.5],
  ["color-border-muted", "color-surface", 3]
];
const lightThemeSectionTokens = [
  "color-section-profile", "color-section-styles", "color-section-ability",
  "color-section-skills", "color-section-style-skills", "color-section-outfits"
];
const lightThemeAccentTokens = [
  "color-style-persona", "color-style-key", "color-style-dual",
  "color-export-cocofolia", "color-export-udonarium", "color-export-tsv",
  "color-export-bookmarklet", "color-export-building", "color-export-success", "color-export-error"
];
for (const theme of ["intron", "orbital"]) {
  const block = themeBlock(themeTokenSource, theme);
  if (!/color-scheme:\s*light\s*;/.test(block)) {
    violations.push(`css-next/themes/presets.css: ${theme} is missing color-scheme: light`);
  }
  for (const [foregroundToken, backgroundToken, minimum] of lightThemeTextChecks) {
    const foreground = themeHexToken(block, foregroundToken);
    const background = themeHexToken(block, backgroundToken);
    if (!foreground || !background) {
      violations.push(`css-next/themes/presets.css: ${theme} light-theme contrast token missing ${foregroundToken}/${backgroundToken}`);
      continue;
    }
    const ratio = contrastRatio(foreground, background);
    if (ratio < minimum) {
      violations.push(`css-next/themes/presets.css: ${theme} ${foregroundToken}/${backgroundToken} contrast ${ratio.toFixed(2)} < ${minimum}`);
    }
  }
  const surface = themeHexToken(block, "color-surface");
  for (const token of lightThemeSectionTokens) {
    const color = themeHexToken(block, token);
    if (!color || contrastRatio(color, surface) < 4.5) {
      violations.push(`css-next/themes/presets.css: ${theme} section token ${token} is below 4.5:1 on surface`);
    }
  }
  for (const token of lightThemeAccentTokens) {
    const color = themeHexToken(block, token);
    if (!color || contrastRatio(color, surface) < 3) {
      violations.push(`css-next/themes/presets.css: ${theme} accent token ${token} is below 3:1 on surface`);
    }
  }
}

const spectrumThemeSource = await readFile(path.join(root, "css-next", "themes", "spectrum-neon.css"), "utf8");
const spectrumThemeBlock = themeBlock(spectrumThemeSource, "spectrum-neon");
const spectrumSurface = themeHexToken(spectrumThemeBlock, "color-surface");
for (const token of ["neon-red", "neon-orange", "neon-yellow", "neon-green", "neon-cyan", "neon-blue", "neon-violet"]) {
  const color = themeHexToken(spectrumThemeBlock, token);
  if (!color || !spectrumSurface || contrastRatio(color, spectrumSurface) < 4.5) {
    violations.push(`css-next/themes/spectrum-neon.css: ${token} is below 4.5:1 on the gaming surface`);
  }
}
for (const marker of [
  "--neon-spectrum:",
  "--theme-body-bg:",
  '[data-theme-surface="panel"]',
  '[data-theme-surface="card"]',
  '[data-theme-badge="1"]',
  ".sheet-section-nav a, .mobile-sheet-nav a",
  "#neon-sign-control-layer",
  "prefers-reduced-motion: reduce"
]) {
  if (!spectrumThemeSource.includes(marker)) {
    violations.push(`css-next/themes/spectrum-neon.css: missing coverage marker ${marker}`);
  }
}
const cssEntrySource = await readFile(path.join(root, "css-next", "index.css"), "utf8");
if (cssEntrySource.includes("themes/spectrum-neon.css")) {
  violations.push("css-next/index.css: spectrum neon effects must not load before page-specific CSS");
}
if (/@import\s+url\(["']\.\/(?:editor|pages)\//.test(cssEntrySource)) {
  violations.push("css-next/index.css: editor or page CSS must be owned by a page entry");
}
for (const featureStylesheet of [
  "help.css", "save-diagnostics.css", "style-marks.css", "sheet-snapshots.css",
  "sheet-url-import.css", "cast-troops.css", "armor-totals.css",
  "sheet-import-help.css", "skill-display-enhancements.css"
]) {
  if (cssEntrySource.includes(featureStylesheet)) {
    violations.push(`css-next/index.css: feature stylesheet ${featureStylesheet} belongs in a page entry`);
  }
}
const entryScopeRequirements = new Map([
  ["archive-entry.css", ["../components/style-marks.css", "./archive.css"]],
  ["account-entry.css", ["../components/style-marks.css", "./account.css"]],
  ["cast-entry.css", ["../components/cast-troops.css", "./cast.css", "../components/armor-totals.css"]],
  ["sheet-entry.css", ["../components/help.css", "../editor/editor.css", "../components/sheet-import-help.css"]],
  ["sheet-mobile-entry.css", ["./sheet-mobile.css", "./sheet-mobile-ux.css"]],
  ["troop-entry.css", ["./troops.css", "./troop-screen.css"]],
  ["troops-entry.css", ["./troops.css", "./troops-registry-polish.css"]]
]);
for (const [entryName, requiredImports] of entryScopeRequirements) {
  const source = await readFile(path.join(root, "css-next", "pages", entryName), "utf8");
  for (const requiredImport of requiredImports) {
    if (!source.includes(requiredImport)) {
      violations.push(`css-next/pages/${entryName}: required scoped import missing ${requiredImport}`);
    }
  }
}
for (const page of activeThemePages) {
  const source = await readFile(path.join(root, page), "utf8");
  const head = source.match(/<head>[\s\S]*?<\/head>/i)?.[0] || "";
  const stylesheets = [...head.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)]
    .map(match => match[1]);
  const themeBundles = stylesheets.filter(href => href.includes("css-next/themes/index.css"));
  if (themeBundles.length !== 1 || stylesheets.at(-1) !== "./css-next/themes/index.css?v=1") {
    violations.push(`${page}: theme bundle must be the single final stylesheet`);
  }
  if (stylesheets.length !== 2 || !stylesheets[0]?.startsWith("./css-next/")) {
    violations.push(`${page}: use one application/page CSS entry before the final theme bundle`);
  }
}

const cssSources = new Map(await Promise.all(cssFiles.map(async file => [file, await readFile(file, "utf8")])));
const reachableCss = new Set();
const cssQueue = [];
for (const page of cssReachabilityPages) {
  const source = await readFile(path.join(root, page), "utf8");
  for (const match of source.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const href = match[1].split("?")[0];
    if (!href.startsWith("./css-next/")) continue;
    cssQueue.push(path.resolve(root, href));
  }
}
while (cssQueue.length) {
  const file = cssQueue.pop();
  if (reachableCss.has(file) || !cssSources.has(file)) continue;
  reachableCss.add(file);
  const source = cssSources.get(file);
  for (const match of source.matchAll(/@import\s+url\(["']([^"']+)["']\)/g)) {
    const href = match[1].split("?")[0];
    if (/^(?:[a-z]+:|\/\/)/i.test(href)) continue;
    cssQueue.push(path.resolve(path.dirname(file), href));
  }
}
for (const file of cssFiles) {
  if (!reachableCss.has(file)) violations.push(`${relative(file)}: orphan stylesheet is unreachable from active pages`);
}

const themeRegistrySource = await readFile(path.join(root, "js", "theme-registry.js"), "utf8");
const nextThemeControllerSource = await readFile(path.join(root, "js", "css-next-theme.js"), "utf8");
for (const [theme, label] of expectedThemeOptions) {
  if (!themeRegistrySource.includes(`id: "${theme}"`) || !themeRegistrySource.includes(`label: "${label}"`)) {
    violations.push(`js/theme-registry.js: missing theme option ${theme} / ${label}`);
  }
}
if (!/populateThemeOptions\(select\)/.test(nextThemeControllerSource)) {
  violations.push("js/css-next-theme.js: missing registry option population");
}
const themeScopeSource = await readFile(path.join(root, "js", "theme-scope.js"), "utf8");
for (const marker of ["themeControl", "themeSurface", "themeBadge", "normalize(document)", "normalize(node)"]) {
  if (!themeScopeSource.includes(marker)) {
    violations.push(`js/theme-scope.js: semantic theme scope missing ${marker}`);
  }
}
for (const marker of [
  "ensureJapaneseArmyOverlay()",
  "data-japanese-army-overlay",
  "日本国電脳鎖国結界",
  "不法接続",
  "NATIONAL BORDER FIREWALL // ACCESS VIOLATION RECORDED"
]) {
  if (!nextThemeControllerSource.includes(marker)) {
    violations.push(`js/css-next-theme.js: Japanese warning overlay missing ${marker}`);
  }
}
const statusSource = await readFile(path.join(root, "css-next", "themes", "japanese-army.css"), "utf8");
if (!/data-theme=["']japanese-army["'][\s\S]*?\.japanese-army-overlay/.test(statusSource)) {
  violations.push("css-next/themes/japanese-army.css: Japanese warning overlay styles missing");
}

const baseSource = await readFile(path.join(root, "css-next", "foundation", "base.css"), "utf8");
const typographySource = await readFile(path.join(root, "css-next", "foundation", "typography.css"), "utf8");
if (!/html\s*\{[^}]*font-size:\s*17px/s.test(baseSource) || !/small\s*\{[^}]*font-size:\s*\.72em/s.test(typographySource)) {
  violations.push("css-next/foundation: verified 17px base typography contract missing");
}
const coreTokenSource = await readFile(path.join(root, "css-next", "tokens", "core.css"), "utf8");
const rowActionSource = await readFile(path.join(root, "css-next", "components", "row-actions.css"), "utf8");
for (const marker of ["--row-action-size: 30px", "--row-action-gap: 2px", "--row-action-column: 106px"]) {
  if (!coreTokenSource.includes(marker)) violations.push(`css-next/tokens/core.css: row-action geometry missing ${marker}`);
}
if (!rowActionSource.includes("width: var(--row-action-size)") ||
    !rowActionSource.includes("height: var(--row-action-size)")) {
  violations.push("css-next/components/row-actions.css: verified 30px ▲/▼/× button contract missing");
}

const appShellSource = await readFile(path.join(root, "css-next", "layout", "app-shell.css"), "utf8");
for (const marker of [".auth-navigation__account", ".auth-navigation__logout", ".auth-header", ".sheet-header", ".app-back-link", ".showcase-header"]) {
  if (!appShellSource.includes(marker)) violations.push(`css-next/layout/app-shell.css: restored chrome missing ${marker}`);
}
if (!/\.app-back-link\s*\{[^}]*gap:\s*4px[^}]*padding:\s*0[^}]*border:\s*0[^}]*background:\s*transparent/s.test(appShellSource) ||
    !/\.app-back-link > span\s*\{[^}]*font-size:\s*1rem/s.test(appShellSource)) {
  violations.push("css-next/layout/app-shell.css: unified plain two-line back-link contract missing");
}

const castPageSource = await readFile(path.join(root, "css-next", "pages", "cast.css"), "utf8");
for (const marker of [
  ".cast-access-overlay", ".cast-access-terminal", ".cast-style-card-simple",
  ".cast-divine-card", ".cast-divine-card--2", ".cast-skill-layout", ".style-skill-view-table",
  ".cast-style-skill-analysis", ".cast-outfit-table"
]) {
  if (!castPageSource.includes(marker)) violations.push(`css-next/pages/cast.css: restored cast-view component missing ${marker}`);
}
if (!/\.cast-tabs\s*\{[^}]*position:\s*sticky/s.test(castPageSource)) {
  violations.push("css-next/pages/cast.css: sticky cast navigation missing");
}
if (!/body\[data-page="cast\.html"\] \.ability-grid\s*\{[^}]*repeat\(4[^}]*minmax\(96px/s.test(castPageSource)) {
  violations.push("css-next/pages/cast.css: CS is not fixed to the right of the four abilities");
}
const castGeometry = {
  anchor: Number(castPageSource.match(/--cast-suit-anchor:\s*(\d+)px/)?.[1]),
  suit: Number(castPageSource.match(/--cast-suit-column:\s*(\d+)px/)?.[1]),
  compactWidth: Number(castPageSource.match(/--cast-compact-skill-width:\s*(\d+)px/)?.[1]),
  generalSlotWidth: Number(castPageSource.match(/\.cast-general-columns\s*\{[^}]*repeat\(2,\s*(\d+)px\)/s)?.[1]),
  sideSlotWidth: Number(castPageSource.match(/\.cast-skill-layout\s*\{[^}]*minmax\(0,\s*1fr\)\s+(\d+)px/s)?.[1]),
  generalName: Number(castPageSource.match(/col\.skill-col-name\s*\{\s*width:\s*(\d+)px/)?.[1]),
  generalLevel: Number(castPageSource.match(/col\.skill-col-level\s*\{\s*width:\s*(\d+)px/)?.[1]),
  styleName: Number(castPageSource.match(/col\.style-col-name\s*\{\s*width:\s*(\d+)px/)?.[1]),
  styleKind: Number(castPageSource.match(/col\.style-col-kind\s*\{\s*width:\s*(\d+)px/)?.[1]),
  styleLevel: Number(castPageSource.match(/col\.style-col-level\s*\{\s*width:\s*(\d+)px/)?.[1])
};
if (castGeometry.anchor !== 240 ||
    castGeometry.suit !== 48 ||
    castGeometry.compactWidth !== 432 ||
    castGeometry.generalName + castGeometry.generalLevel + (castGeometry.suit * 4) !== castGeometry.compactWidth ||
    castGeometry.generalSlotWidth - castGeometry.compactWidth < 8 ||
    castGeometry.sideSlotWidth - castGeometry.compactWidth < 8 ||
    castGeometry.generalName + castGeometry.generalLevel !== castGeometry.anchor ||
    castGeometry.styleName !== 144 ||
    castGeometry.styleKind !== 48 ||
    castGeometry.styleLevel !== 48 ||
    castGeometry.styleName + castGeometry.styleKind + castGeometry.styleLevel !== castGeometry.anchor) {
  violations.push(`css-next/pages/cast.css: skill suit anchor mismatch ${JSON.stringify(castGeometry)}`);
}
if (!/\.style-skill-view-table \.style-suit-cell\s*\{[^}]*text-align:\s*center/s.test(castPageSource)) {
  violations.push("css-next/pages/cast.css: public Style-skill suit marks are not centered on the General-skill suit columns");
}
if (!/\.cast-general-columns\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*440px\)[^}]*overflow-x:\s*hidden/s.test(castPageSource) ||
    !/\.cast-skill-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+440px/s.test(castPageSource) ||
    !/@media \(max-width:\s*1409px\)[\s\S]*?\.cast-skill-layout\s*\{\s*grid-template-columns:\s*1fr/s.test(castPageSource) ||
    !/--cast-compact-skill-width:\s*432px/s.test(castPageSource) ||
    !/\.cast-general-column \.data-table, \.cast-skill-layout :is\(\.skill-data-table--social, \.skill-data-table--connection\)\s*\{[^}]*width:\s*var\(--cast-compact-skill-width\)[^}]*min-width:\s*var\(--cast-compact-skill-width\)[^}]*max-width:\s*var\(--cast-compact-skill-width\)/s.test(castPageSource) ||
    !/\.cast-skill-layout :is\(\.skill-data-table--general, \.skill-data-table--social, \.skill-data-table--connection\) col\.skill-col-name\s*\{\s*width:\s*192px/s.test(castPageSource) ||
    !/\.cast-skill-layout :is\(\.skill-data-table--general, \.skill-data-table--social, \.skill-data-table--connection\) col\.skill-col-level\s*\{\s*width:\s*48px/s.test(castPageSource) ||
    !/\.cast-skill-layout :is\(\.skill-data-table--general, \.skill-data-table--social, \.skill-data-table--connection\) col\.skill-col-suit\s*\{\s*width:\s*var\(--cast-suit-column\)/s.test(castPageSource)) {
  violations.push("css-next/pages/cast.css: General / Social / Connection fields do not share the 432px scroll-free geometry with border slack");
}
if (!/\.style-skill-view-table\s*\{[^}]*width:\s*1328px[^}]*min-width:\s*1328px[^}]*max-width:\s*1328px/s.test(castPageSource)) {
  violations.push("css-next/pages/cast.css: public Style-skill table can stretch and redistribute the fixed suit columns");
}
if (!/\.cast-tab\s*\{[^}]*color:\s*var\(--color-accent\)[^}]*background:/s.test(castPageSource) ||
    !/\.cast-tab\.is-active small\s*\{\s*color:\s*inherit/s.test(castPageSource)) {
  violations.push("css-next/pages/cast.css: public PROFILE / OUTFITS tab contrast contract missing");
}
if (!/\.style-skill-view-table\s*\{[^}]*min-width:\s*1328px/s.test(castPageSource) ||
    !/\.cast-header, \.cast-content\s*\{[^}]*min\(1400px/s.test(castPageSource)) {
  violations.push("css-next/pages/cast.css: verified 1400px view / 1328px style-skill geometry missing");
}
if (!/#personal-data\.profile-list\s*\{[^}]*repeat\(2[^}]*repeat\(4[^}]*column-gap:\s*28px/s.test(castPageSource) ||
    !/#personal-data\.profile-list\s*>\s*div\s*\{[^}]*120px[^}]*gap:\s*18px/s.test(castPageSource)) {
  violations.push("css-next/pages/cast.css: verified two-column public personal-data layout missing");
}
for (const marker of [
  ".cast-outfit-col--category { width: 92px", ".cast-outfit-col--name { width: 150px",
  ".cast-outfit-col--description { width: 320px", "data-outfit-category=\"weapon\"] { min-width: 1260px",
  "data-outfit-category=\"armor\"] { min-width: 1280px", "data-outfit-category=\"tron\"] { min-width: 1400px",
  "data-outfit-category=\"vehicle\"] { min-width: 1280px"
]) {
  if (!castPageSource.includes(marker)) violations.push(`css-next/pages/cast.css: verified public outfit geometry missing ${marker}`);
}
if (!/\.style-skill-view-table \.style-description-expandable\s*\{[^}]*overflow:\s*hidden/s.test(castPageSource) ||
    !/\.cast-outfit-detail\s*\{[^}]*overflow-x:\s*hidden/s.test(castPageSource)) {
  violations.push("css-next/pages/cast.css: public detail fields can expose a horizontal scrollbar");
}
if (!castPageSource.includes('content: "ARCHIVE ID"') || !castPageSource.includes('content: "＋"')) {
  violations.push("css-next/pages/cast.css: verified cast header/collapsible panel chrome missing");
}

const editorSource = await readFile(path.join(root, "css-next", "editor", "editor.css"), "utf8");
if (!/\.sheet-main\s*\{[^}]*grid-column:\s*2/s.test(editorSource) ||
    !/\.exp-panel\s*\{[^}]*grid-column:\s*1/s.test(editorSource) ||
    !/\.sheet-layout\s*\{[^}]*grid-template-columns:\s*220px\s+minmax\(0,\s*1fr\)[^}]*min\(1600px/s.test(editorSource)) {
  violations.push("css-next/editor/editor.css: verified left experience-sidebar contract missing");
}
const editorSkillSource = await readFile(path.join(root, "css-next", "editor", "skills.css"), "utf8");
if (!editorSkillSource.includes("#general-skills > .general-skill-columns") ||
    !/\.general-skill-column \.skill-table :is\(th, td\):last-child\s*\{\s*width:\s*30px/s.test(editorSkillSource) ||
    !/\.skill-group--ordered \.skill-table :is\(th, td\):last-child\s*\{\s*width:\s*var\(--row-action-column\)/s.test(editorSkillSource)) {
  violations.push("css-next/editor/skills.css: verified general/social skill column geometry missing");
}
if (!editorSkillSource.includes(".skill-group-heading") ||
    !editorSkillSource.includes(".skill-group-actions") ||
    !/\.skill-toolbar--three\s*\{\s*display:\s*none/s.test(editorSkillSource)) {
  violations.push("css-next/editor/skills.css: per-group General / Social / Connection add-button layout missing");
}
const editorStyleSkillSource = await readFile(path.join(root, "css-next", "editor", "style-skills.css"), "utf8");
if (!editorStyleSkillSource.includes(".style-skill-full-table") ||
    !editorStyleSkillSource.includes("--style-action-column: var(--row-action-column)") ||
    !editorStyleSkillSource.includes("--style-suit-column: 34px")) {
  violations.push("css-next/editor/style-skills.css: verified full-width style-skill table contract missing");
}
if (!/#style-skills \.skill-group-heading\s*\{\s*display:\s*none/s.test(editorStyleSkillSource)) {
  violations.push("sheet style skills: duplicate inner title/control suppression missing");
}
const editorOutfitSource = await readFile(path.join(root, "css-next", "editor", "outfits.css"), "utf8");
if (!editorOutfitSource.includes(".outfit-table-group") || !editorOutfitSource.includes(".outfit-table-cell--actions")) {
  violations.push("css-next/editor/outfits.css: generated outfit-table presentation missing");
}
if (!/\.outfit-layout-hidden\s*\{\s*display:\s*none/s.test(editorOutfitSource)) {
  violations.push("css-next/editor/outfits.css: outfit display-rule hidden state missing");
}
if (!/\.style-card \.style-fields > label:first-child select\s*\{[^}]*min-height:\s*56px[^}]*font-size:\s*1\.18rem/s.test(editorSource) ||
    !/\.style-card \.style-choice-row\s*\{[^}]*78px/s.test(editorSource) ||
    !/\.style-card \.style-mark-cycle\s*\{[^}]*min-width:\s*78px/s.test(editorSource)) {
  violations.push("css-next/editor/editor.css: verified style-selection geometry missing");
}
if (!/\.style-card \.style-mark-symbol\s*\{[^}]*width:\s*24px[^}]*height:\s*24px[^}]*font-size:\s*0/s.test(editorSource) ||
    !/\.style-card \.style-mark-symbol::before\s*\{[^}]*width:\s*20px[^}]*height:\s*20px/s.test(editorSource) ||
    !editorSource.includes(".style-card .style-mark-symbol--persona::before") ||
    !editorSource.includes(".style-card .style-mark-symbol--key::before")) {
  violations.push("css-next/editor/editor.css: Persona / Key mark equal-size contract missing");
}
if (!/body\[data-page="sheet\.html"\] \.ability-grid\s*\{[^}]*repeat\(4[^}]*minmax\(150px,\s*\.72fr\)/s.test(editorSource) ||
    !/\.ability-card--cs\s*\{\s*grid-column:\s*auto/s.test(editorSource) ||
    !/\.ability-matrix__header, \.ability-matrix__row\s*\{[^}]*44px\s+minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/s.test(editorSource)) {
  violations.push("css-next/editor/editor.css: four abilities plus right-side CS geometry missing");
}
if (!/\.profile-top-grid\s*\{[^}]*repeat\(3/s.test(editorSource) ||
    !editorSource.includes(".sheet-image-editor .image-drop-zone") ||
    !editorSource.includes("@keyframes sheet-image-scan")) {
  violations.push("css-next/editor/editor.css: verified profile/image-editor presentation missing");
}
if (!/textarea\[data-style-field="description"\]\s*\{[^}]*overflow-x:\s*hidden/s.test(editorStyleSkillSource) ||
    !/\.outfit-table textarea\s*\{[^}]*overflow-x:\s*hidden/s.test(editorOutfitSource)) {
  violations.push("css-next/editor: detail fields can expose a horizontal scrollbar");
}

const indexHtmlSource = await readFile(path.join(root, "index.html"), "utf8");
if (!indexHtmlSource.includes('<h1 class="site-title"><span class="site-title__archive">CAST ARCHIVE</span></h1>') ||
    /site-title__(?:nova|divider)/.test(indexHtmlSource)) {
  violations.push("index.html: visible archive title must be a single-line CAST ARCHIVE");
}
if (!/\.site-header__system\s*\{[^}]*font-size:\s*\.9rem/s.test(appShellSource) ||
    !/\.site-title\s*\{[^}]*white-space:\s*nowrap/s.test(appShellSource)) {
  violations.push("css-next/layout/app-shell.css: enlarged database label or no-wrap archive title missing");
}
const formsSource = await readFile(path.join(root, "css-next", "components", "forms.css"), "utf8");
if (!formsSource.includes("padding-block: 0") || !formsSource.includes("line-height: normal")) {
  violations.push("css-next/components/forms.css: single-line field vertical-centering contract missing");
}
const archiveCssSource = await readFile(path.join(root, "css-next", "pages", "archive.css"), "utf8");
if (!/\.cast-card__image\s*\{[^}]*260px[^}]*min-height:\s*260px[^}]*max-height:\s*260px/s.test(archiveCssSource) ||
    !/\.cast-card__image img\s*\{[^}]*object-fit:\s*cover[^}]*object-position:\s*50%\s+0/s.test(archiveCssSource)) {
  violations.push("css-next/pages/archive.css: fixed-size top-cropped archive images missing");
}
const actShowcaseAssetSource = await readFile(path.join(root, "css-next", "pages", "act-showcase.css"), "utf8");
if (!/\.cast-card__image img\s*\{[^}]*object-fit:\s*cover[^}]*object-position:\s*50%\s+0/s.test(actShowcaseAssetSource)) {
  violations.push("css-next/pages/act-showcase.css: public act cast images are not top-cropped consistently");
}
const accountCssSource = await readFile(path.join(root, "css-next", "pages", "account.css"), "utf8");
if (!accountCssSource.includes("width: min(960px, calc(100% - 32px))") ||
    !/\.account-data > div\s*\{[^}]*grid-template-columns:\s*150px\s+minmax\(0,\s*1fr\)/s.test(accountCssSource) ||
    !accountCssSource.includes(".master-data-admin__stats") ||
    !accountCssSource.includes(".master-search-user-sql__fields") ||
    !accountCssSource.includes('body[data-page="backup.html"] .account-layout { display: grid')) {
  violations.push("css-next/pages/account.css: verified account/master-control presentation missing");
}
const importCssSource = await readFile(path.join(root, "css-next", "editor", "import.css"), "utf8");
if (!importCssSource.includes(".master-search-toolbar") ||
    !importCssSource.includes("#master-search-close-x") ||
    /var\(--(?:line|line-muted|text|text-muted)\)/.test(importCssSource)) {
  violations.push("css-next/editor/import.css: SKD/OFC master-search presentation is incomplete or uses obsolete tokens");
}
const showcaseCssSource = await readFile(path.join(root, "css-next", "pages", "showcase.css"), "utf8");
if (!showcaseCssSource.includes("width: min(1440px, calc(100% - 32px))") ||
    !showcaseCssSource.includes(".showcase-panel:nth-of-type(4)") ||
    !/\.cast-pick-card img\s*\{[^}]*width:\s*72px[^}]*height:\s*78px[^}]*object-fit:\s*cover[^}]*object-position:\s*50%\s+0/s.test(showcaseCssSource) ||
    !/\.selected-cast > img\s*\{[^}]*width:\s*112px[^}]*height:\s*100%[^}]*min-height:\s*230px[^}]*object-fit:\s*cover[^}]*object-position:\s*50%\s+0/s.test(showcaseCssSource)) {
  violations.push("css-next/pages/showcase.css: restored showcase geometry/image crop contract missing");
}

for (const page of activeThemePages) {
  const file = path.join(root, page);
  const source = await readFile(file, "utf8");
  const cssSystemLink = [...source.matchAll(/<link\b[^>]*>/gi)]
    .map(match => match[0])
    .find(tag => /data-css-system=["']next["']/i.test(tag));
  const cssSystemHref = cssSystemLink?.match(/\bhref=["']([^"']+)["']/i)?.[1] || "";
  if (!/^\.\/css-next\/pages\/[a-z0-9-]+-entry\.css\?v=\d+$/.test(cssSystemHref)) {
    violations.push(`${relative(file)}: production CSS entry missing`);
  } else {
    const entryPath = cssSystemHref.split("?")[0].replace(/^\.\//, "");
    const entrySource = await readFile(path.join(root, entryPath), "utf8");
    if (!/index\.css\?v=64/.test(entrySource)) {
      violations.push(`${relative(file)}: page CSS entry does not import current css-next/index.css`);
    }
  }
  if (/js\/css-next-(?:routing|guard)\.js/.test(source)) violations.push(`${relative(file)}: preview-only helper remains`);
  if (/<base\b/i.test(source)) violations.push(`${relative(file)}: preview base element remains`);
  if (/data-css-preview-source=/i.test(source)) violations.push(`${relative(file)}: preview marker remains`);
  for (const match of source.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = tag.match(/\brel=["']([^"']+)/i)?.[1] || "";
    const href = tag.match(/\bhref=["']([^"']+)/i)?.[1] || "";
    if (rel.split(/\s+/).includes("stylesheet") && !href.includes("css-next/")) {
      violations.push(`${relative(file)}: legacy stylesheet ${href || "(missing href)"}`);
    }
  }
  if (/js\/theme\.js(?:\?|["'])/i.test(source)) violations.push(`${relative(file)}: legacy theme.js`);
  if (/\/next\//i.test(source)) violations.push(`${relative(file)}: /next/ production dependency remains`);
  if (/<style\b/i.test(source)) violations.push(`${relative(file)}: inline style element remains`);
  if (/\sstyle=["']/i.test(source)) violations.push(`${relative(file)}: inline style remains`);
}

const sheetPageSource = await readFile(path.join(root, "sheet.html"), "utf8");
if (!sheetPageSource.includes('id="add-style-skill"')) {
  violations.push("sheet.html: primary Style Skill add control missing");
}
for (const script of [
  "handle-format.js", "outfit-ofc-fields.js", "outfit-display-rules-v5.js",
  "sheet-import-style-skill-compat.js", "sheet-import-outfit-compat.js", "sheet-master-autofill.js"
]) {
  if (!sheetPageSource.includes(`/js/${script}`)) violations.push(`sheet.html: explicit functional helper missing ${script}`);
}
const viewLinkTag = sheetPageSource.match(/<a\b[^>]*id=["']cast-view-button["'][^>]*>/i)?.[0] || "";
if (!viewLinkTag || /target=["']_blank["']/i.test(viewLinkTag)) {
  violations.push("sheet.html: VIEW CAST must navigate in the current window");
}
const castPageHtmlSource = await readFile(path.join(root, "cast.html"), "utf8");
if (!castPageHtmlSource.includes("/js/handle-format.js")) violations.push("cast.html: explicit handle-format helper missing");
if (/N◎VA MUNICIPAL DATABASE/.test(castPageHtmlSource)) {
  violations.push("cast.html: removed top-right municipal database label returned");
}
if (!/<a\b[^>]*class=["'][^"']*cast-header__back[^"']*app-back-link[^"']*["'][^>]*href=["']\.\/index\.html["'][^>]*>[\s\S]*?RETURN TO ARCHIVE/i.test(castPageHtmlSource)) {
  violations.push("cast.html: public RETURN TO ARCHIVE back-link contract missing");
}
const compactGeneralSource = await readFile(path.join(root, "js", "cast-compact-skills.js"), "utf8");
if (!compactGeneralSource.includes("splitGeneralColumns(section)") || !compactGeneralSource.includes("cast-general-column--left")) {
  violations.push("js/cast-compact-skills.js: public General-skill two-column split missing");
}
const castUiSource = await readFile(path.join(root, "js", "cast-ui.js"), "utf8");
if (/querySelectorAll\(["']colgroup["']\)|group\.children\[6\]\.remove\(\)/.test(castUiSource)) {
  violations.push("js/cast-ui.js: compact-skill colgroup ownership returned to shared UI");
}
const markCycleSource = await readFile(path.join(root, "js", "style-mark-cycle.js"), "utf8");
if (!markCycleSource.includes("style-mark-symbol--persona") || !markCycleSource.includes("style-mark-symbol--key")) {
  violations.push("js/style-mark-cycle.js: Persona / Key mark span rendering missing");
}
const uiV25Source = await readFile(path.join(root, "js", "ui-v25.js"), "utf8");
if (/addAction\(actions,"スタイル技能を追加"/.test(uiV25Source)) {
  violations.push("js/ui-v25.js: duplicate inline Style Skill add control returned");
}
const styleSeparatorSource = await readFile(path.join(root, "js", "style-skill-separators.js"), "utf8");
if (!styleSeparatorSource.includes('document.querySelector("#add-style-skill")?.closest(".toolbar")') ||
    !styleSeparatorSource.includes("toolbar.append(button)") ||
    styleSeparatorSource.includes("toolbar.style.gridTemplateColumns")) {
  violations.push("js/style-skill-separators.js: Style Skill toolbar ownership/layout contract missing");
}
for (const page of ["account.html", "acts.html", "backup.html", "cast.html", "combos.html", "login.html", "sheet.html", "showcase-generator.html"]) {
  const source = await readFile(path.join(root, page), "utf8");
  if (!/class=["'][^"']*app-back-link/.test(source)) violations.push(`${page}: unified header back-link class missing`);
}

const rootEntries = new Set(await readdir(root));
if (rootEntries.has("css")) violations.push("legacy css/ directory remains");
if (rootEntries.has("next")) violations.push("isolated next/ preview remains");
for (const obsoleteScript of ["theme.js", "css-next-routing.js", "css-next-guard.js", "showcase-style-alignment.js"]) {
  if ((await readdir(path.join(root, "js"))).includes(obsoleteScript)) {
    violations.push(`js/${obsoleteScript}: obsolete compatibility script remains`);
  }
}
for (const file of cssFiles) {
  const source = await readFile(file, "utf8");
  if (/data-css-preview-source/i.test(source)) {
    violations.push(`${relative(file)}: preview-only selector remains`);
  }
}

const supabaseClientSource = await readFile(path.join(root, "js", "supabase-client.js"), "utf8");
if (!/\.\/vendor\/supabase-js\.js/.test(supabaseClientSource)) {
  violations.push("js/supabase-client.js: local Supabase dependency missing");
}
if (/https?:\/\//.test(supabaseClientSource.split("const SUPABASE_URL")[0])) {
  violations.push("js/supabase-client.js: external module dependency remains");
}
const supabaseVendorSource = await readFile(path.join(root, "js", "vendor", "supabase-js.js"), "utf8");
if (!supabaseVendorSource.includes("createClient")) {
  violations.push("js/vendor/supabase-js.js: invalid local Supabase bundle");
}

const archiveSource = await readFile(path.join(root, "js", "archive.js"), "utf8");
if (!/Promise\.allSettled\(\[authInitialization, characterInitialization\]\)/.test(archiveSource)) {
  violations.push("js/archive.js: public data loading is blocked by authentication initialization");
}
if (/onAuthStateChange\(async/.test(archiveSource)) {
  violations.push("js/archive.js: async auth callback can contend with the Supabase auth lock");
}

const authStateSource = await readFile(path.join(root, "js", "auth-state.js"), "utf8");
if (!/withTimeout\([\s\S]*?supabase\.auth\.getSession\(\)[\s\S]*?5000/.test(authStateSource)) {
  violations.push("js/auth-state.js: authentication timeout guard missing");
}
if (!authStateSource.includes("pendingSessionRequest") || !authStateSource.includes("if (pendingSessionRequest) return pendingSessionRequest")) {
  violations.push("js/auth-state.js: concurrent protected-page session reads are not coalesced");
}
const configSource = await readFile(path.join(root, "js", "config.js"), "utf8");
if (!configSource.includes('new URL("./", window.location.href).pathname') ||
    !configSource.includes("currentDirectory.endsWith(PRODUCTION_BASE_PATH)")) {
  violations.push("js/config.js: deployment-aware application base-path resolution missing");
}
const legacyImportSource = await readFile(path.join(root, "js", "sheet-import.js"), "utf8");
if (!legacyImportSource.includes("querySelectorAll('#general-skills .skill-group')") ||
    !legacyImportSource.includes("findGeneralRow(name)") ||
    legacyImportSource.includes("querySelectorAll('#general-skills>.skill-group')")) {
  violations.push("js/sheet-import.js: nested two-column General-skill import repair missing");
}
const legacyOutfitCompatSource = await readFile(path.join(root, "js", "sheet-import-outfit-compat.js"), "utf8");
if (!legacyOutfitCompatSource.includes("progress(52+32*") ||
    !legacyOutfitCompatSource.includes("progress(84+14*") ||
    !legacyOutfitCompatSource.includes("close.disabled=on") ||
    !legacyOutfitCompatSource.includes('event.preventDefault()')) {
  violations.push("js/sheet-import-outfit-compat.js: weighted final progress or import-close lock missing");
}

const dynamicPatterns = new Map([
  ["style-element", /createElement\(\s*["']style["']\s*\)/],
  ["link-element", /createElement\(\s*["']link["']\s*\)/],
  ["stylesheet-rel", /\.rel\s*=\s*["']stylesheet["']/],
  ["insert-rule", /insertRule\s*\(/]
]);
const findings = [];
for (const file of await filesUnder(path.join(root, "js"), ".js")) {
  const source = await readFile(file, "utf8");
  if (/\.\/css\/(?:sheet-help-link|cocofolia-export|udonarium-export|transfer-tsv-export)\.css/.test(source) && !/data-css-system=[\\"']next/.test(source)) {
    violations.push(`${relative(file)}: migrated legacy stylesheet lacks css-next bypass`);
  }
  source.split(/\r?\n/).forEach((line, index) => {
    for (const [kind, pattern] of dynamicPatterns) {
      if (pattern.test(line)) findings.push({ signature: `${relative(file)}:${kind}`, line: index + 1 });
    }
  });
}

for (const finding of findings) {
  violations.push(`${finding.signature}: runtime CSS generation remains (line ${finding.line})`);
}

if (violations.length) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`CSS rebuild audit passed: ${cssFiles.length} CSS files, ${activeThemePages.length} production pages, 0 runtime CSS generators.`);
}
