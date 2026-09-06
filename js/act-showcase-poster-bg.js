const POSTER_SAMPLE_BACKGROUND = "./assets/showcase/act-showcase-moon-city-v2.svg";

initializePosterBackground();

function initializePosterBackground() {
  const root = document.querySelector("#act-showcase-root");
  if (!root) return;

  const apply = () => {
    if (root.hidden) return false;
    const params = new URLSearchParams(location.search);
    const sample = String(params.get("bgSample") || "").normalize("NFKC").toLowerCase();
    if (sample === "neotokyo" || !document.body.classList.contains("has-showcase-background")) {
      document.body.style.setProperty("--showcase-background", `url("${POSTER_SAMPLE_BACKGROUND}")`);
      document.body.classList.add("has-showcase-background", "showcase-poster-sample-background");
    }
    return true;
  };

  if (apply()) return;
  const observer = new MutationObserver(() => {
    if (!apply()) return;
    observer.disconnect();
  });
  observer.observe(root, { attributes: true });
}
