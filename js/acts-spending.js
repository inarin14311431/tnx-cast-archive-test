import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";

const elements = {
  playerFilter: document.querySelector("#history-player-filter"),
  castFilter: document.querySelector("#history-cast-filter"),
  reset: document.querySelector("#history-reset"),
  actList: document.querySelector("#act-history-list"),
  earnedTotal: document.querySelector("#history-exp-total"),
  spentTotal: document.querySelector("#history-spent-total"),
  balanceTotal: document.querySelector("#history-balance-total"),
  form: document.querySelector("#experience-spending-form"),
  character: document.querySelector("#spending-character"),
  amount: document.querySelector("#spending-amount"),
  date: document.querySelector("#spending-date"),
  description: document.querySelector("#spending-description"),
  status: document.querySelector("#spending-status"),
  list: document.querySelector("#experience-spending-list")
};

let currentUser = null;
let ownedCharacters = [];
let spendingRows = [];
let renderScheduled = false;

initialize();

async function initialize() {
  currentUser = await requireAuth();
  if (!currentUser || !elements.form || !elements.list) return;

  elements.date.value = formatLocalDate(new Date());
  elements.form.addEventListener("submit", addSpendingRecord);
  elements.list.addEventListener("click", handleSpendingListClick);
  elements.playerFilter?.addEventListener("change", scheduleRender);
  elements.castFilter?.addEventListener("change", scheduleRender);
  elements.reset?.addEventListener("click", scheduleRender);

  if (elements.earnedTotal) {
    new MutationObserver(updateExperienceSummary)
      .observe(elements.earnedTotal, { childList: true, characterData: true, subtree: true });
  }
  if (elements.actList) {
    new MutationObserver(scheduleRender)
      .observe(elements.actList, { childList: true, subtree: true });
  }

  await loadData();
}

async function loadData() {
  setStatus("経験点消費履歴を読み込み中…");

  const { data: characters, error: characterError } = await supabase
    .from("characters")
    .select("id, public_id, player_name, character_name, handle")
    .eq("owner_id", currentUser.id)
    .order("player_name", { ascending: true })
    .order("character_name", { ascending: true });

  if (characterError) {
    console.error(characterError);
    setStatus("キャスト情報を取得できませんでした。", "error");
    return;
  }

  ownedCharacters = characters ?? [];
  populateCharacterOptions();

  if (!ownedCharacters.length) {
    spendingRows = [];
    renderSpendingHistory();
    setStatus("登録キャストがありません。");
    return;
  }

  const { data, error } = await supabase
    .from("character_experience_spending")
    .select("id, character_id, amount, description, spent_on, created_at")
    .in("character_id", ownedCharacters.map(character => character.id))
    .order("spent_on", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    console.error(error);
    setStatus("経験点消費履歴を取得できませんでした。", "error");
    elements.list.innerHTML = `<p class="experience-spending-empty">経験点消費履歴を取得できませんでした。</p>`;
    updateExperienceSummary();
    return;
  }

  spendingRows = data ?? [];
  renderSpendingHistory();
  setStatus(`${spendingRows.length}件の経験点消費記録を読み込みました。`, "success");
}

function scheduleRender() {
  if (renderScheduled) return;
  renderScheduled = true;
  window.setTimeout(() => {
    renderScheduled = false;
    populateCharacterOptions();
    renderSpendingHistory();
  }, 0);
}

function getFilteredCharacters() {
  const player = elements.playerFilter?.value ?? "";
  const publicId = elements.castFilter?.value ?? "";
  return ownedCharacters.filter(character =>
    (!player || displayPlayer(character) === player) &&
    (!publicId || character.public_id === publicId)
  );
}

function getFilteredSpendingRows() {
  const allowedIds = new Set(getFilteredCharacters().map(character => String(character.id)));
  return spendingRows.filter(row => allowedIds.has(String(row.character_id)));
}

function populateCharacterOptions() {
  if (!elements.character) return;
  const previous = String(elements.character.value || "");
  const filtered = getFilteredCharacters();
  const candidates = filtered.length ? filtered : ownedCharacters;

  elements.character.innerHTML = candidates.length
    ? candidates.map(character => `<option value="${escapeAttribute(character.id)}">${escapeHtml(formatFullName(character))}</option>`).join("")
    : `<option value="">登録キャストなし</option>`;

  const selectedCast = elements.castFilter?.value ?? "";
  const selectedCharacter = candidates.find(character => character.public_id === selectedCast)
    ?? candidates.find(character => String(character.id) === previous)
    ?? candidates[0];

  if (selectedCharacter) elements.character.value = selectedCharacter.id;
  const submit = elements.form?.querySelector("button[type='submit']");
  if (submit) submit.disabled = !candidates.length;
}

function renderSpendingHistory() {
  const rows = getFilteredSpendingRows();
  const charactersById = new Map(ownedCharacters.map(character => [String(character.id), character]));

  if (!rows.length) {
    elements.list.innerHTML = `<p class="experience-spending-empty">条件に一致する経験点消費履歴はありません。</p>`;
    updateExperienceSummary();
    return;
  }

  elements.list.innerHTML = rows.map(row => {
    const character = charactersById.get(String(row.character_id));
    return `
      <article class="experience-spending-record" data-spending-id="${escapeAttribute(row.id)}">
        <p class="experience-spending-record__date"><small>DATE</small><strong>${escapeHtml(formatDate(row.spent_on))}</strong></p>
        <p class="experience-spending-record__cast"><small>CAST</small><strong>${escapeHtml(character ? formatFullName(character) : "削除済みキャスト")}</strong></p>
        <p class="experience-spending-record__amount"><small>SPENT EXP</small><strong>－${escapeHtml(row.amount)} EXP</strong></p>
        <p class="experience-spending-record__description"><small>DESCRIPTION</small><strong>${escapeHtml(row.description || "用途未記入")}</strong></p>
        <button type="button" class="experience-spending-record__delete" data-delete-spending>削除</button>
      </article>`;
  }).join("");

  updateExperienceSummary();
}

function updateExperienceSummary() {
  const earned = Number(String(elements.earnedTotal?.textContent ?? "0").replace(/[^0-9-]/g, "")) || 0;
  const spent = getFilteredSpendingRows().reduce((sum, row) => sum + Number(row.amount || 0), 0);
  if (elements.spentTotal) elements.spentTotal.textContent = String(spent);
  if (elements.balanceTotal) elements.balanceTotal.textContent = String(earned - spent);
}

async function addSpendingRecord(event) {
  event.preventDefault();
  const characterId = String(elements.character.value || "");
  const amount = Number(elements.amount.value);
  const spentOn = elements.date.value;
  const description = elements.description.value.trim();

  if (!ownedCharacters.some(character => String(character.id) === characterId)) {
    setStatus("自分が所有するキャストを選択してください。", "error");
    return;
  }
  if (!Number.isInteger(amount) || amount < 1 || amount > 9999) {
    setStatus("消費経験点は1～9999の整数で入力してください。", "error");
    return;
  }
  if (!spentOn) {
    setStatus("消費日を入力してください。", "error");
    return;
  }

  const button = elements.form.querySelector("button[type='submit']");
  button.disabled = true;
  button.textContent = "追加中";

  const { data, error } = await supabase
    .from("character_experience_spending")
    .insert({
      character_id: characterId,
      amount,
      description,
      spent_on: spentOn,
      created_by: currentUser.id
    })
    .select("id, character_id, amount, description, spent_on, created_at")
    .single();

  button.disabled = false;
  button.textContent = "消費履歴を追加";

  if (error) {
    console.error(error);
    setStatus("経験点消費履歴を追加できませんでした。", "error");
    return;
  }

  spendingRows.unshift(data);
  elements.amount.value = "";
  elements.description.value = "";
  renderSpendingHistory();
  setStatus("経験点消費履歴を追加しました。", "success");
}

function handleSpendingListClick(event) {
  const target = event.target instanceof Element ? event.target : event.target?.parentElement;
  const button = target?.closest?.("[data-delete-spending]");
  if (!button || !elements.list.contains(button)) return;
  event.preventDefault();
  deleteSpendingRecord(button);
}

async function deleteSpendingRecord(button) {
  const record = button.closest("[data-spending-id]");
  const spendingId = String(record?.dataset.spendingId || "");
  const row = spendingRows.find(item => String(item.id) === spendingId);

  if (!record || !row) {
    setStatus("削除対象の経験点消費履歴を確認できませんでした。", "error");
    return;
  }

  const ownedCharacter = ownedCharacters.find(character => String(character.id) === String(row.character_id));
  if (!ownedCharacter) {
    setStatus("自分が所有するキャストの経験点履歴だけ削除できます。", "error");
    return;
  }

  const confirmed = await confirmSpendingDeletion(row, ownedCharacter);
  if (!confirmed) return;

  button.disabled = true;
  button.textContent = "削除中";
  setStatus("経験点消費履歴を削除中…");

  const { data, error } = await supabase
    .from("character_experience_spending")
    .delete()
    .eq("id", row.id)
    .eq("character_id", ownedCharacter.id)
    .select("id")
    .single();

  if (error || String(data?.id ?? "") !== spendingId) {
    console.error(error);
    button.disabled = false;
    button.textContent = "削除";
    setStatus("経験点消費履歴を削除できませんでした。ログイン状態と所有権を確認してください。", "error");
    return;
  }

  spendingRows = spendingRows.filter(item => String(item.id) !== spendingId);
  renderSpendingHistory();
  setStatus("経験点消費履歴を削除しました。", "success");
}

function confirmSpendingDeletion(row, character) {
  return new Promise(resolve => {
    document.querySelector(".experience-spending-confirm")?.remove();

    const overlay = document.createElement("div");
    overlay.className = "experience-spending-confirm";
    overlay.setAttribute("role", "presentation");
    overlay.innerHTML = `
      <section class="experience-spending-confirm__panel" role="dialog" aria-modal="true" aria-labelledby="experience-spending-confirm-title">
        <p class="experience-spending-confirm__eyebrow">DELETE EXPERIENCE RECORD</p>
        <h2 id="experience-spending-confirm-title">経験点消費履歴を削除</h2>
        <dl class="experience-spending-confirm__details">
          <div><dt>キャスト</dt><dd>${escapeHtml(formatFullName(character))}</dd></div>
          <div><dt>消費日</dt><dd>${escapeHtml(formatDate(row.spent_on))}</dd></div>
          <div><dt>消費経験点</dt><dd>${escapeHtml(Number(row.amount || 0))} EXP</dd></div>
          <div><dt>用途</dt><dd>${escapeHtml(row.description || "用途未記入")}</dd></div>
        </dl>
        <p class="experience-spending-confirm__warning">この操作は元に戻せません。</p>
        <div class="experience-spending-confirm__actions">
          <button type="button" data-spending-confirm-cancel>キャンセル</button>
          <button type="button" class="danger" data-spending-confirm-delete>削除する</button>
        </div>
      </section>`;

    const finish = result => {
      document.removeEventListener("keydown", onKeyDown);
      overlay.remove();
      resolve(result);
    };
    const onKeyDown = event => {
      if (event.key === "Escape") finish(false);
    };

    overlay.addEventListener("click", event => {
      const target = event.target instanceof Element ? event.target : null;
      if (target === overlay || target?.closest?.("[data-spending-confirm-cancel]")) finish(false);
      if (target?.closest?.("[data-spending-confirm-delete]")) finish(true);
    });
    document.addEventListener("keydown", onKeyDown);
    document.body.appendChild(overlay);
    window.requestAnimationFrame(() => overlay.querySelector("[data-spending-confirm-delete]")?.focus());
  });
}

function displayPlayer(character) {
  return character.player_name || "プレイヤー未登録";
}

function formatFullName(character) {
  const handle = String(character?.handle ?? "").trim();
  const name = String(character?.character_name ?? "").trim();
  const formatter = window.TNXHandleFormat?.formatIdentity;
  if (typeof formatter === "function") return formatter(handle, name);
  const stripped = handle.replace(/^[\s　“”"「『]+|[\s　“”"」』]+$/g, "").trim();
  return [stripped ? `“${stripped}”` : "", name].filter(Boolean).join(" ");
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "—";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}/${match[2]}/${match[3]}`;
  return new Intl.DateTimeFormat("ja-JP").format(new Date(value));
}

function setStatus(message, state = "") {
  if (!elements.status) return;
  elements.status.textContent = message;
  elements.status.className = `experience-spending-status${state ? ` is-${state}` : ""}`;
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
