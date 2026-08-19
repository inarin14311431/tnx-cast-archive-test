import { setSheetSaveState } from "./sheet-save-state.js?v=2";

export function createSheetSaveCoordinator({
  persist,
  validate,
  onSaved,
  onError
} = {}) {
  let dirty = false;
  let saving = false;
  let pending = false;

  function publish(state, text = "") {
    setSheetSaveState(state, text);
  }

  function markDirty() {
    dirty = true;
    publish("unsaved", "未保存");
  }

  function markSaved() {
    dirty = false;
    publish("saved", "保存済み");
  }

  function markLoading(text = "読込中…") {
    publish("saving", text);
  }

  function markLoadError(text) {
    dirty = false;
    publish("error", text);
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
      if (force) publish("error", validationMessage);
      return false;
    }

    saving = true;
    publish("saving", "保存中…");
    try {
      const result = await persist?.();
      if (!result) throw new Error("保存結果を確認できませんでした。");
      dirty = false;
      publish("saved", "保存済み");
      onSaved?.(result);
      return true;
    } catch (error) {
      console.error(error);
      dirty = true;
      const text = onError?.(error) || error?.message || "保存に失敗しました。";
      publish("error", text);
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
