const $=selector=>document.querySelector(selector);
const NAV_ITEMS=[
  ["#mobile-profile","01 基本情報"],
  ["#mobile-styles-section","02 スタイル"],
  ["#mobile-ability-section","03 能力値"],
  ["#mobile-general","04 一般技能"],
  ["#mobile-style-skills-section","05 スタイル技能"],
  ["#mobile-outfits-section","06 アウトフィット"],
  ["#mobile-combos-section","07 コンボ"],
  ["#mobile-snapshots-section","08 スナップショット"],
  ["#mobile-image-section","09 キャスト画像"]
];

function normalizeNav(){
  const nav=$(".mobile-sheet-nav");
  if(!nav)return;
  for(const[href,label]of NAV_ITEMS){
    if(!document.querySelector(href))continue;
    let link=nav.querySelector(`a[href="${href}"]`);
    if(!link){
      link=document.createElement("a");
      link.href=href;
    }
    link.textContent=label;
    if(link.parentElement!==nav)nav.append(link);
    else if(nav.lastElementChild!==link)nav.append(link);
  }
}

function removeObsoleteControls(){
  document.querySelectorAll(".mobile-section-top").forEach(node=>node.remove());
  ["#mobile-ability-dialog-apply","#mobile-cs-dialog-apply","#style-skill-dialog-apply"].forEach(selector=>$(selector)?.remove());
  ["#mobile-ability-dialog","#mobile-cs-dialog","#style-skill-dialog"].forEach(selector=>$(selector)?.querySelector(".mobile-editor-dialog__header")?.classList.add("mobile-editor-dialog__header--close-only"));
  document.querySelectorAll(".mobile-sheet-section > header > small").forEach(node=>node.remove());
}

function addEditNotice(){
  const text="各項目はタップすると編集できます。モーダルは閉じると編集内容を反映し、画面下部の保存ボタンで確定します。";
  const current=$("#mobile-edit-notice");
  if(current){current.textContent=text;return;}
  const status=$("#mobile-save-status");
  if(!status)return;
  const notice=document.createElement("p");
  notice.id="mobile-edit-notice";
  notice.className="mobile-edit-notice";
  notice.textContent=text;
  status.after(notice);
}

function init(){
  removeObsoleteControls();
  addEditNotice();
  normalizeNav();
  document.addEventListener("tnx:mobile-section-ready",normalizeNav);
}

init();
