(() => {
  const removeLegacyTransferButtons = () => {
    document.querySelector("#transfer-tsv-copy-button")?.remove();
    document.querySelector("#transfer-bookmarklet-copy-button")?.remove();
  };

  removeLegacyTransferButtons();
  window.addEventListener("load", removeLegacyTransferButtons, { once: true });

  const button = document.querySelector("#direct-transfer-button");
  if (!button) return;

  const publicId = new URLSearchParams(location.search).get("id")?.trim() || "";
  button.disabled = !publicId;
  button.title = publicId ? "キャラシ倉庫へデータ転記" : "保存済みキャストで利用できます。";

  button.addEventListener("click", () => {
    if (!publicId) return;
    location.href = `./transfer.html?id=${encodeURIComponent(publicId)}`;
  });
})();
