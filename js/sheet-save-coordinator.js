const STATUS_SELECTOR = "#save-status";

export function createSheetSaveCoordinator({
  persist,
  validate,
  onSaved,
  onError
} = {}) {
  let dirty = false;
  let saving = false;
  let pending = false;

  function setStatus(text, state = "") {
    const element = document.querySelector(STATUS_SELECTOR);
    if (!element) return;
    element.textContent = text;
    element.className = state;
  }

  function markDirty() {
    dirty = true;
    setStatus("未保存", "unsaved");
  }

  function markSaved() {
    dirty = false;
    setStatus("保存済み", "saved");
  }

  function markLoading(text = "読込中…") {
    setStatus(text, "saving");
  }

  function markLoadError(text) {
    dirty = false;
    setStatus(text, "error");
  }

  function hasUnsavedChanges() {
    return dirty;
  }

  function isSaving() {
    return saving;
  }

  async function save(force = false) {
    if (saving) {
      pending = true;
      return false;
    }
    if (!dirty && force) {
      markSaved();
      return true;
    }

    const validationMessage = typeof validate === "function" ? validate({ force, dirty }) : "";
    if (validationMessage) {
      if (force) setStatus(validationMessage, "error");
      return false;
    }

    saving = true;
    setStatus("保存中…", "saving");
    let succeeded = false;
    try {
      const result = await persist?.();
      if (!result) throw new Error("保存結果を確認できませんでした。");
      dirty = false;
      setStatus("保存済み", "saved");
      onSaved?.(result);
      succeeded = true;
      return true;
    } catch (error) {
      console.error(error);
      dirty = true;
      const text = onError?.(error) || error?.message || "保存に失敗しました。";
      setStatus(text, "error");
      return false;
    } finally {
      saving = false;
      if (pending) {
        pending = false;
        queueMicrotask(() => save(false));
      }
    }
  }

  return Object.freeze({
    markDirty,
    markSaved,
    markLoading,
    markLoadError,
    hasUnsavedChanges,
    isSaving,
    save
  });
}
