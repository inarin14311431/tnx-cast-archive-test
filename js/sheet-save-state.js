const STATUS_SELECTOR = "#save-status";
const BUTTON_SELECTOR = "#save-button";
const STATE_EVENT = "tnx:sheet-save-state";

const labels = Object.freeze({
  unsaved: ["未保存", "NOT SAVED"],
  saving: ["保存中…", "SAVING"],
  saved: ["保存済み", "SAVED"],
  error: ["保存失敗", "SAVE ERROR"]
});

let currentState = "unsaved";
let currentText = "";
let installed = false;

export function getSheetSaveState() {
  return currentState;
}

export function hasUnsavedSheetChanges() {
  return currentState === "unsaved" || currentState === "error";
}

export function requestSheetSave() {
  const button = document.querySelector(BUTTON_SELECTOR);
  if (!button) return false;
  button.click();
  return true;
}

export function focusSheetSaveButton() {
  document.querySelector(BUTTON_SELECTOR)?.focus();
}

export function waitForSheetSaved(timeout = 20000) {
  if (currentState === "saved") return Promise.resolve(true);
  if (currentState === "error") return Promise.reject(new Error(currentText || "キャスト本体の保存に失敗しました。"));

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener(STATE_EVENT, onState);
      reject(new Error("キャスト本体の保存完了を確認できませんでした。"));
    }, timeout);

    function onState(event) {
      const state = event.detail?.state;
      if (state !== "saved" && state !== "error") return;
      window.clearTimeout(timer);
      window.removeEventListener(STATE_EVENT, onState);
      if (state === "saved") resolve(true);
      else reject(new Error(event.detail?.text || "キャスト本体の保存に失敗しました。"));
    }

    window.addEventListener(STATE_EVENT, onState);
  });
}

export function installSheetSaveState() {
  if (installed) return;
  const status = document.querySelector(STATUS_SELECTOR);
  const button = document.querySelector(BUTTON_SELECTOR);
  if (!status || !button) return;
  installed = true;

  const sync = () => {
    const text = status.textContent || "";
    let state = "unsaved";
    if (status.classList.contains("error") || /エラー|失敗/.test(text)) state = "error";
    else if (status.classList.contains("saving") || /保存中|読込中|初期化中/.test(text)) state = "saving";
    else if (status.classList.contains("saved") || /保存済み/.test(text)) state = "saved";

    currentState = state;
    currentText = text;
    button.classList.remove("is-unsaved", "is-saving", "is-saved", "is-error");
    button.classList.add(`is-${state}`);
    button.dataset.saveState = state;

    const [jp, en] = labels[state];
    button.replaceChildren(document.createTextNode(jp + " "));
    const small = document.createElement("small");
    small.textContent = en;
    button.append(small);
    button.setAttribute("aria-label", jp);

    window.dispatchEvent(new CustomEvent(STATE_EVENT, { detail: { state, text } }));
  };

  new MutationObserver(sync).observe(status, {
    attributes: true,
    attributeFilter: ["class"],
    childList: true,
    subtree: true,
    characterData: true
  });
  sync();
}

installSheetSaveState();

globalThis.TNXSheetSaveState = Object.freeze({
  getState: getSheetSaveState,
  hasUnsavedChanges: hasUnsavedSheetChanges,
  requestSave: requestSheetSave,
  waitForSaved: waitForSheetSaved,
  focusButton: focusSheetSaveButton
});
