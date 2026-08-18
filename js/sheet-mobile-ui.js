import "./sheet-mobile-save-coordinator.js?v=20260818-1";
import "./sheet-mobile-skills.js?v=20260818-2";
import "./sheet-mobile-summary-text.js?v=20260818-2";
import "./sheet-mobile-header-exp.js?v=20260818-2";
import "./sheet-mobile-combos.js?v=20260818-6";
import "./sheet-mobile-snapshots.js?v=20260818-1";
import "./sheet-mobile-import.js?v=20260818-1";

const $=selector=>document.querySelector(selector);
function ensureCommonStyles(){const base=document.querySelector('link[href*="/sheet-mobile.css"],link[href^="./css-next/pages/sheet-mobile.css"]');if(base)base.href="./css-next/pages/sheet-mobile.css?v=5";const styles=[["mobile-theme","./css-next/pages/sheet-mobile-theme.css?v=1"],["mobile-ui","./css-next/pages/sheet-mobile-ui.css?v=3"],["mobile-profile-current","./css-next/pages/sheet-mobile-profile.css?v=11"],["mobile-ability-current","./css-next/pages/sheet-mobile-ability.css?v=4"],["mobile-skills","./css-next/pages/sheet-mobile-skills.css?v=3"],["mobile-snapshots","./css-next/pages/sheet-mobile-snapshots.css?v=1"],["mobile-import","./css-next/pages/sheet-mobile-import.css?v=1"]];for(const[key,href]of styles){const current=document.querySelector(`link[data-${key}-style]`);if(current){if(current.getAttribute("href")!==href)current.href=href;continue;}const link=document.createElement("link");link.rel="stylesheet";link.href=href;link.setAttribute(`data-${key}-style`,"1");document.head.append(link);}}
function removeObsoleteControls(){document.querySelectorAll(".mobile-section-top").forEach(node=>node.remove());["#mobile-ability-dialog-apply","#mobile-cs-dialog-apply","#style-skill-dialog-apply"].forEach(selector=>$(selector)?.remove());["#mobile-ability-dialog","#mobile-cs-dialog","#style-skill-dialog"].forEach(selector=>$(selector)?.querySelector(".mobile-editor-dialog__header")?.classList.add("mobile-editor-dialog__header--close-only"));document.querySelectorAll(".mobile-sheet-section > header > small").forEach(node=>node.remove());}
function addEditNotice(){if($("#mobile-edit-notice")){$("#mobile-edit-notice").textContent="各項目はタップすると編集できます。モーダルは閉じると編集内容を反映し、画面下部の保存ボタンで確定します。";return;}const status=$("#mobile-save-status");if(!status)return;const notice=document.createElement("p");notice.id="mobile-edit-notice";notice.className="mobile-edit-notice";notice.textContent="各項目はタップすると編集できます。モーダルは閉じると編集内容を反映し、画面下部の保存ボタンで確定します。";status.after(notice);}
function init(){ensureCommonStyles();removeObsoleteControls();addEditNotice();}
init();
