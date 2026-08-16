(() => {
  const button = document.querySelector("#direct-transfer-button");
  if (!button) return;

  const style = document.createElement("style");
  style.textContent = `
    .cast-header__export-actions #direct-transfer-button:hover,
    .cast-header__export-actions #direct-transfer-button:focus-visible {
      border-color: #66d9c7;
      background: color-mix(in srgb, #66d9c7 18%, var(--color-surface, #0d1820));
      color: #d8fff8;
      box-shadow: 0 0 14px color-mix(in srgb, #66d9c7 24%, transparent);
    }
  `;
  document.head.append(style);

  const publicId = new URLSearchParams(location.search).get("id")?.trim() || "";
  button.disabled = !publicId;
  button.title = publicId ? "キャラシ倉庫へデータ転記" : "保存済みキャストで利用できます。";

  button.addEventListener("click", () => {
    if (!publicId) return;
    location.href = `./transfer.html?id=${encodeURIComponent(publicId)}`;
  });
})();
