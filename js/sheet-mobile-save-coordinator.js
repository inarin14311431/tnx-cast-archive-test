const $ = selector => document.querySelector(selector);

let replaying = false;
let saving = false;

function setBusy(busy) {
  const button = $("#mobile-save");
  if (!button) return;
  button.disabled = busy;
  if (busy) {
    button.dataset.state = "saving";
    button.textContent = "保存中…";
  }
}

function setError(error) {
  const status = $("#mobile-save-status");
  if (!status) return;
  status.dataset.state = "error";
  status.textContent = `保存に失敗しました：${error?.message || "不明なエラー"}`;
}

async function handleSave(event) {
  const button = event.target.closest?.("#mobile-save");
  if (!button || replaying || saving) return;

  const tasks = [];
  const detail = {
    add(task) {
      if (task) tasks.push(Promise.resolve(task));
    }
  };
  document.dispatchEvent(new CustomEvent("tnx:mobile-before-save", { detail }));
  if (!tasks.length) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  saving = true;
  setBusy(true);
  try {
    await Promise.all(tasks);
    replaying = true;
    setBusy(false);
    button.click();
  } catch (error) {
    console.error(error);
    setBusy(false);
    button.dataset.state = "dirty";
    button.textContent = "変更を保存";
    setError(error);
  } finally {
    replaying = false;
    saving = false;
  }
}

document.addEventListener("click", handleSave, true);
