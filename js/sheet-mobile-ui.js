import "./sheet-mobile-save-coordinator.js?v=20260818-1";
import "./sheet-mobile-skills.js?v=20260818-2";
import "./sheet-mobile-summary-text.js?v=20260818-2";
import "./sheet-mobile-header-exp.js?v=20260818-3";
import "./sheet-mobile-combos.js?v=20260818-6";
import "./sheet-mobile-snapshots.js?v=20260818-2";
import "./sheet-mobile-image.js?v=20260818-1";
import "./sheet-mobile-import.js?v=20260818-3";
import "./sheet-mobile-profile.js?v=20260818-3";

const $=selector=>document.querySelector(selector);
const NAV_ITEMS=[["#mobile-profile","01 基本情報"],["#mobile-styles-section","02 スタイル"],["#mobile-ability-section","03 能力値"],["#mobile-general","04 一般技能"],["#mobile-style-skills-section","05 スタイル技能"],["#mobile-outfits-section","06 アウトフィット"],["#mobile-combos-section","07 コンボ"],["#mobile-snapshots-section","08 スナップショット"],["#mobile-image-section","09 キャスト画像"]];
function ensureCommonStyles(){const base=document.querySelector('link[href*="/sheet-mobile.css"],link[href^="./css-next/pages/sheet-mobile.css"]');if(base)base.href="./css-next/pages/sheet-mobile.css?v=5";const styles=[["mobile-theme","./css-next/pages/sheet-mobile-theme.css?v=2"],["mobile-ui","./css-next/pages/sheet-mobile-ui.css?v=4"],["mobile-profile-current","./css-next/pages/sheet-mobile-profile.css?v=11"],["mobile-ability-current","./css-next/pages/sheet-mobile-ability.css?v=4"],["mobile-skills","./css-next/pages/sheet-mobile-skills.css?v=3"],["mobile-combo","./css-next/pages/sheet-mobile-combos.css?v=5"],["mobile-snapshots","./css-next/pages/sheet-mobile-snapshots.css?v=2"],["mobile-image","./css-next/pages/sheet-mobile-image.css?v=1"],["mobile-import","./css-next/pages/sheet-mobile-import.css?v=2"]];for(const[key,href]of styles){const current=document.querySelector(`link[data-${key}-style]`);if(current){if(current.getAttribute("href")!==href)current.href=href;continue;}const link=document.createElement("link");link.rel="stylesheet";link.href=href;link.setAttribute(`data-${key}-style`,"1");document.head.append(link);}}
function ensureSectionIds(){const sections=[...document.querySelectorAll("main .mobile-sheet-section")];const styles=sections.find(s=>s.classList.contains("mobile-sheet-section--styles"));const ability=sections.find(s=>s.classList.contains("mobile-sheet-section--ability"));if(styles&&!styles.id)styles.id="mobile-styles-section";if(ability&&!ability.id)ability.id="mobile-ability-section";}
function normalizeNav(){ensureSectionIds();const nav=$(".mobile-sheet-nav");if(!nav)return;for(const[href,label]of NAV_ITEMS){if(!document.querySelector(href))continue;let a=nav.querySelector(`a[href="${href}"]`);if(!a){a=document.createElement("a");a.href=href;}a.textContent=label;nav.append(a);}}
function observeNav(){const nav=$(".mobile-sheet-nav");if(!nav)return;normalizeNav();new MutationObserver(normalizeNav).observe(document.querySelector("main"),{childList:true,subtree:true});}
function removeObsoleteControls(){document.querySelectorAll(".mobile-section-top").forEach(node=>node.remove());["#mobile-ability-dialog-apply","#mobile-cs-dialog-apply","#style-skill-dialog-apply"].forEach(selector=>$(selector)?.remove());["#mobile-ability-dialog","#mobile-cs-dialog","#style-skill-dialog"].forEach(selector=>$(selector)?.querySelector(".mobile-editor-dialog__header")?.classList.add("mobile-editor-dialog__header--close-only"));document.querySelectorAll(".mobile-sheet-section > header > small").forEach(node=>node.remove());}
function addEditNotice(){if($("#mobile-edit-notice")){$("#mobile-edit-notice").textContent="各項目はタップすると編集できます。モーダルは閉じると編集内容を反映し、画面下部の保存ボタンで確定します。";return;}const status=$("#mobile-save-status");if(!status)return;const notice=document.createElement("p");notice.id="mobile-edit-notice";notice.className="mobile-edit-notice";notice.textContent="各項目はタップすると編集できます。モーダルは閉じると編集内容を反映し、画面下部の保存ボタンで確定します。";status.after(notice);}
function init(){ensureCommonStyles();removeObsoleteControls();addEditNotice();observeNav();}
init();
