import { escapeHtml, escapeAttribute } from "./dom-escape.js?v=46402d5f";
import { getImageObjectPosition } from "./image-focus.js?v=d32e5230";
import { getStyles, getStyleNames, formatHandle } from "./showcase-output-html.js?v=cae9118b";
import { normalizeCastNumber, formatCastNumber, MAX_CAST_NUMBER } from "./showcase-cast-number.js?v=944a948e";

// The markup of the generator's cast rows and candidate cards (docs/SHOWCASE_GENERATOR_REDESIGN.md, PR3). Pure string builders over
// the selection model of showcase-generator-v3.js ({ source, manual, character, castNo, quote, tagline, description, open }):
// the controller there owns the state and the events. The attributes other modules read stay as they were: data-selected-index,
// data-character-id, data-visibility, data-manual, data-action and data-field (see the contract in the redesign doc, section 4).

export const PLACEHOLDER_IMAGE = "./assets/placeholders/scan-failed.webp";

export function castImage(character) {
  return character?.image_thumbnail_url || character?.image_url || PLACEHOLDER_IMAGE;
}

// A new array with the item at `from` moved so that it ends at `to` (both indexes of the current array).
export function reorder(list, from, to) {
  const items = [...list];
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from >= items.length) return items;
  const target = Math.max(0, Math.min(items.length - 1, to));
  if (target === from) return items;
  const [moved] = items.splice(from, 1);
  items.splice(target, 0, moved);
  return items;
}

export function handoutState(item) {
  return String(item?.description ?? "").trim() ? "done" : "empty";
}

export function handoutBadgeText(state) {
  return state === "done" ? "ハンドアウト 入力済み" : "ハンドアウト 未入力";
}

export function rowPanelId(index) {
  return `cast-panel-${index}`;
}

export function createLibraryCardHtml({ character, source, selected, disabled }) {
  const styles = getStyles(character).map(item => `${item.name}${item.mark}`).join(" / ");
  const handle = formatHandle(character.handle);
  return `
    <button class="cast-pick-card${source === "private" ? " private-history-card" : ""}${selected ? " is-selected" : ""}" type="button"
      data-${source}-character-id="${escapeAttribute(character.id)}" aria-pressed="${Boolean(selected)}"${disabled ? " disabled" : ""}>
      <img src="${escapeAttribute(castImage(character))}" alt="" loading="lazy" style="object-position:${escapeAttribute(getImageObjectPosition(character.image_url))}">
      <span class="cast-pick-card__body">
        <span class="cast-pick-card__handle"${handle ? "" : ' aria-hidden="true"'}>${escapeHtml(handle)}</span>
        <h3>${escapeHtml(character.character_name || "名称未登録")}</h3>
        <span class="cast-pick-card__styles">${escapeHtml(styles)}</span>
        <span class="cast-pick-card__player">PL：${escapeHtml(character.player_name || "—")}</span>
      </span>
      <span class="cast-pick-card__order">${selected ? "追加済み" : "追加"}</span>
    </button>`;
}

function castNumberField(item, index) {
  return `<label class="selected-cast__cast-no">CAST No<input type="number" inputmode="numeric" min="1" max="${MAX_CAST_NUMBER}" step="1" data-field="cast-no" value="${escapeAttribute(normalizeCastNumber(item.castNo))}" placeholder="自動（${index + 1}）" title="空欄の場合は出演順の番号になります"></label>`;
}

function roleOptions(character, selectedValue) {
  const roles = ["共通", ...new Set(getStyleNames(character))];
  const selected = String(selectedValue ?? "").trim();
  if (selected && !roles.includes(selected)) roles.push(selected);
  return `<option value="">参加枠を選択</option>${roles.map(role => `<option value="${escapeAttribute(role)}"${selected === role ? " selected" : ""}>${escapeHtml(role)}</option>`).join("")}`;
}

function manualIdentityFields(character) {
  const field = (key, label, value, extra = "") => `<label>${label}<input type="text" data-field="${key}" value="${escapeAttribute(value)}"${extra}></label>`;
  return `
    <div class="cast-row__identity-fields selected-cast__manual-fields">
      ${field("manual-handle", "ハンドル", character.handle, ' placeholder="任意"')}
      ${field("manual-name", "キャスト名", character.character_name, ' placeholder="キャスト名" required')}
      ${field("manual-styles", "スタイル", character.manual_styles, ' placeholder="例：カタナ◎ / カブト● / フェイト"')}
      ${field("manual-player", "PL名", character.player_name, ' placeholder="任意"')}
      <details class="cast-row__more">
        <summary>詳細(所属・年齢・性別・市民ランク)</summary>
        <div class="cast-row__identity-fields">
          ${field("manual-affiliation", "所属", character.affiliation)}
          ${field("manual-age", "年齢", character.age)}
          ${field("manual-gender", "性別", character.gender)}
          ${field("manual-rank", "市民ランク", character.citizen_rank)}
        </div>
      </details>
    </div>`;
}

export function createCastRowHtml({ item, index, total }) {
  const character = item.character;
  const manual = Boolean(item.manual);
  const isPrivate = item.source === "private";
  const open = Boolean(item.open);
  const panelId = rowPanelId(index);
  const state = handoutState(item);
  const handle = manual ? formatHandle(character.handle) : formatHandle(character.handle);
  const name = manual ? (character.character_name || "未入力キャスト") : (character.character_name || "名称未登録");
  const styles = manual
    ? String(character.manual_styles || "")
    : getStyles(character).map(style => `${style.name}${style.mark}`).join(" / ");
  const identityAttributes = manual
    ? 'data-manual="true"'
    : `data-character-id="${escapeAttribute(character.id)}" data-visibility="${isPrivate ? "private" : "public"}"`;
  const roleField = manual
    ? `<label class="manual-field--role">参加枠（スタイル）<input type="text" data-field="quote" value="${escapeAttribute(item.quote)}" placeholder="例：トーキー、共通" required></label>`
    : `<label>参加枠（スタイル）<select data-field="quote" required>${roleOptions(character, item.quote)}</select></label>`;
  return `
    <article class="selected-cast cast-row${isPrivate ? " selected-cast--private" : ""}${manual ? " selected-cast--manual" : ""}${open ? " is-open" : ""}" data-selected-index="${index}" ${identityAttributes}>
      <div class="cast-row__main">
        <span class="cast-row__grip" role="button" tabindex="0" draggable="true" data-action="grip" aria-label="${index + 1}番目のキャストを並べ替える(ドラッグ、または上下の矢印キー)" title="ドラッグで並べ替え">⠿</span>
        <p class="selected-cast__slot cast-row__slot"><span data-cast-slot-label>CAST ${formatCastNumber(item.castNo, index)}</span>${isPrivate ? " // PRIVATE" : ""}${manual ? " // MANUAL" : ""}</p>
        <img class="cast-row__thumb" src="${escapeAttribute(manual ? PLACEHOLDER_IMAGE : castImage(character))}" alt="" style="object-position:${escapeAttribute(getImageObjectPosition(character.image_url))}">
        <div class="cast-row__identity selected-cast__identity">
          <p class="cast-row__handle"${handle ? "" : " hidden"}>${escapeHtml(handle)}</p>
          <h3 class="${manual ? "selected-cast__manual-preview-name " : ""}cast-row__name">${escapeHtml(name)}</h3>
          <p class="cast-row__styles">${escapeHtml(styles)}</p>
          <p class="cast-row__player">PL：${escapeHtml(character.player_name || "—")}</p>
          ${isPrivate ? '<p class="selected-cast__privacy">HTMLの書き出しのみ(公開不可)</p>' : ""}
        </div>
        <span class="cast-row__badge" data-handout-badge data-state="${state}">${handoutBadgeText(state)}</span>
        <div class="cast-row__actions selected-cast__actions">
          <button type="button" class="cast-row__toggle" data-action="toggle" aria-expanded="${open}" aria-controls="${panelId}">ハンドアウト <small>HANDOUT</small></button>
          <button type="button" data-action="up" aria-label="上へ"${index === 0 ? " disabled" : ""}>↑</button>
          <button type="button" data-action="down" aria-label="下へ"${index === total - 1 ? " disabled" : ""}>↓</button>
          <button type="button" class="remove" data-action="remove" aria-label="削除">×</button>
        </div>
      </div>
      <div id="${panelId}" class="cast-row__panel"${open ? "" : " hidden"}>
        ${manual ? manualIdentityFields(character) : ""}
        <div class="selected-cast__fields">
          ${castNumberField(item, index)}
          ${roleField}
          <label class="selected-cast__tagline-field">一言／キャッチコピー<input type="text" data-field="tagline" maxlength="240" value="${escapeAttribute(item.tagline)}" placeholder="例：真実は、いつだって硝煙の向こうにある"></label>
          <label class="selected-cast__handout-field">ハンドアウト<textarea data-field="description" rows="7" placeholder="コネ：結城あや　推奨スート：スペード&#10;キミは……&#10;&#10;【ＰＳ：達成すべき目的】">${escapeHtml(item.description)}</textarea></label>
        </div>
      </div>
    </article>`;
}
