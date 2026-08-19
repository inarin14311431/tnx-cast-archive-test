/* Manual-save UX compatibility for the sheet editor.
 * The old autosave timer no longer exists, so this module must not patch timers
 * or own save-state / beforeunload detection. Save state is centralized in
 * sheet.js + sheet-save-state.js.
 */
(() => {
  function applyManualSaveLabels() {
    const saveButton = document.querySelector('#save-button');
    if (saveButton) {
      saveButton.title = '編集内容は自動保存されません。クリックして保存してください。';
    }

    const importGuide = document.querySelector('#legacy-import-dialog p');
    if (importGuide) {
      importGuide.textContent = 'キャラシ倉庫で取得したJSONを貼り付けてください。反映後に内容を確認し、画面左の保存ボタンを押すまでDBには保存されません。';
    }

    document.querySelectorAll('#personal-data-status,#life-path-status').forEach(status => {
      if (status.textContent.trim() === '保存ボタンで保存されます。') status.textContent = '';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyManualSaveLabels, { once: true });
  } else {
    applyManualSaveLabels();
  }
})();
