const params = new URLSearchParams(location.search);
const publicId = params.get("id")?.trim() || "";

const castLabel = document.querySelector("#mobile-transfer-cast");
const backLink = document.querySelector("#mobile-transfer-back");
const bookmarkletSlot = document.querySelector("#mobile-transfer-bookmarklet-slot");
const tsvSlot = document.querySelector("#mobile-transfer-tsv-slot");
const status = document.querySelector("#mobile-transfer-status");

initialize().catch(error => {
  console.error("Mobile bookmarklet transfer initialization failed", error);
  setStatus(
    error instanceof Error ? error.message : "スマホ転記を初期化できませんでした。",
    "error"
  );
});

async function initialize() {
  if (!publicId) {
    if (castLabel) castLabel.textContent = "CAST ID が指定されていません。";
    setStatus("キャスト画面からスマホ転記を開いてください。", "error");
    return;
  }

  if (castLabel) castLabel.textContent = `CAST ID ${publicId}`;
  if (backLink) backLink.href = `./cast.html?id=${encodeURIComponent(publicId)}`;

  await import("./transfer-tsv-export.js?v=8");

  const transferButton = document.querySelector("#transfer-tsv-copy-button");
  const bookmarkletButton = document.querySelector("#transfer-bookmarklet-copy-button");

  if (
    !(transferButton instanceof HTMLButtonElement) ||
    !(bookmarkletButton instanceof HTMLButtonElement)
  ) {
    throw new Error("転記ツールを読み込めませんでした。");
  }

  bookmarkletSlot?.append(bookmarkletButton);
  tsvSlot?.append(transferButton);

  bookmarkletButton.addEventListener("click", () => {
    setStatus(
      "転記BMをコピーしました。初回だけブックマークURLへ登録してください。",
      "success"
    );
  });

  observeTransferState(transferButton);

  transferButton.addEventListener("click", () => {
    setStatus("転記データをコピーしています…", "working");
  });
}

function observeTransferState(transferButton) {
  const updateFromButton = () => {
    const copyState = transferButton.dataset.copyState || "";

    if (copyState === "copying") {
      setStatus("転記データをコピーしています…", "working");
      return;
    }

    if (copyState === "success") {
      setStatus(
        "転記TSVをコピーしました。倉庫を開いて転記BMを実行してください。",
        "success"
      );
      return;
    }

    if (copyState === "error") {
      setStatus(
        transferButton.title || "転記TSVをコピーできませんでした。",
        "error"
      );
    }
  };

  const observer = new MutationObserver(mutations => {
    if (
      mutations.some(
        mutation =>
          mutation.type === "attributes" &&
          mutation.attributeName === "data-copy-state"
      )
    ) {
      updateFromButton();
    }
  });

  observer.observe(transferButton, {
    attributes: true,
    attributeFilter: ["data-copy-state"]
  });

  updateFromButton();
}

function setStatus(message, state = "") {
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state;
}
