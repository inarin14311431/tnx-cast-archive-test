// A small CSS reader for tests: the style rules of a stylesheet (comments blanked, offsets kept), nested at-rules entered,
// @keyframes / @font-face / other bodies skipped. Returns { selector, line, declarations } for each style rule.
export function cssStyleRules(text) {
  const src = text.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, " "));
  const found = [];
  const lineOf = offset => src.slice(0, offset).split("\n").length;
  const walkBody = (from, to) => {
    let index = from;
    while (index < to) {
      const open = src.indexOf("{", index);
      const semi = src.indexOf(";", index);
      if (open === -1 || open >= to) break;
      if (semi !== -1 && semi < open && /^\s*@(import|charset|namespace)\b/.test(src.slice(index, semi + 1))) { index = semi + 1; continue; }
      const prelude = src.slice(index, open);
      let depth = 1;
      let end = open + 1;
      for (; end < to && depth; end += 1) depth += src[end] === "{" ? 1 : src[end] === "}" ? -1 : 0;
      const trimmed = prelude.trim();
      const start = index + (prelude.length - prelude.trimStart().length);
      if (/^@(media|supports|layer|container|document)\b/.test(trimmed)) walkBody(open + 1, end - 1);
      else if (!trimmed.startsWith("@")) found.push({ selector: trimmed, line: lineOf(start), declarations: src.slice(open + 1, end - 1).split(";").filter(item => item.trim()).length });
      index = end;
    }
  };
  walkBody(0, src.length);
  return found;
}

// A selector list split at its top-level commas.
export function splitSelectorList(selector) {
  const out = [];
  let depth = 0;
  let current = "";
  for (const char of selector) {
    if ("([".includes(char)) depth += 1;
    if (")]".includes(char)) depth -= 1;
    if (char === "," && depth === 0) { out.push(current.trim()); current = ""; } else current += char;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}
