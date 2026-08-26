import { supabase } from "./supabase-client.js";

const list = document.querySelector("#experience-spending-list");
const status = document.querySelector("#spending-status");

if (list) {
  document.addEventListener("click", handleDelete, true);
}

async function handleDelete(event) {
  const button = event.target.closest?.("[data-delete-spending]");
  if (!button || !list.contains(button)) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const record = button.closest("[data-spending-id]");
  const spendingId = Number(record?.dataset.spendingId || 0);
  if (!record || !Number.isSafeInteger(spendingId) || spendingId < 1) {
    setStatus("削除対象の経験点消費履歴を確認できませんでした。", "error");
    return;
  }

  if (!window.confirm("この経験点消費履歴を削除します。")) return;

  button.disabled = true;
  button.textContent = "削除中";
  setStatus("経験点消費履歴を削除中…");

  const { data, error } = await supabase.rpc("delete_owned_experience_spending", {
    p_spending_id: spendingId
  });

  if (error || data !== true) {
    console.error(error);
    button.disabled = false;
    button.textContent = "削除";
    const missingRpc = /delete_owned_experience_spending|schema cache|function.*does not exist/i.test(String(error?.message || ""));
    setStatus(
      missingRpc
        ? "経験点消費履歴の削除機能が未設定です。"
        : "経験点消費履歴を削除できませんでした。キャスト所有者だけが削除できます。",
      "error"
    );
    return;
  }

  record.remove();
  setStatus("経験点消費履歴を削除しました。再集計します…", "success");
  window.setTimeout(() => window.location.reload(), 120);
}

function setStatus(message, state = "") {
  if (!status) return;
  status.textContent = message;
  status.className = `experience-spending-status${state ? ` is-${state}` : ""}`;
}
