const section = document.querySelector("#owned-showcase-restore");
const heading = document.querySelector("#owned-showcase-restore-heading");
const lead = section?.querySelector(".private-history-selector__lead");

if (section && heading && lead) {
  heading.innerHTML = `公開済みアクト紹介 <small>PUBLISHED SHOWCASE MANAGEMENT</small>`;
  lead.textContent = "自分が公開したアクト紹介を選択して読み込み・削除できます。削除してもアクト履歴と参加履歴は残ります。";
  section.dataset.managementMode = "selector";
}
