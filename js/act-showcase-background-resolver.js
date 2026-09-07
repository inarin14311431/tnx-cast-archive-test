const SUPABASE_URL = "https://koprmbkoftuuffslhsvt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Dsb9Boo4aP3c_v-Iaam4mw_F1szMdUi";

void restorePublishedBackground();

async function restorePublishedBackground() {
  const params = new URLSearchParams(location.search);
  if (String(params.get("bgSample") || "").trim().toLowerCase() !== "neotokyo") return;
  const slug = normalizeSlug(params.get("id"));
  if (!slug) return;

  try {
    const [background] = await Promise.all([
      fetchPublishedBackground(slug),
      waitForShowcaseReady()
    ]);
    if (!background) return;
    document.body.style.setProperty("--showcase-background", `url("${escapeCssString(background)}")`);
    document.body.classList.remove("showcase-poster-sample-background");
    document.body.classList.add("has-showcase-background", "showcase-published-background-restored");
  } catch (error) {
    console.warn("Published showcase background could not be restored.", error);
  }
}

async function fetchPublishedBackground(slug) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_act_showcase`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({ p_slug: slug }),
    cache: "no-store"
  });
  if (!response.ok) return "";
  const payload = await response.json();
  return safeBackgroundUrl(payload?.background);
}

function waitForShowcaseReady() {
  if (document.body.classList.contains("showcase-poster-v2-ready")) return Promise.resolve();
  return new Promise(resolve => {
    const observer = new MutationObserver(() => {
      if (!document.body.classList.contains("showcase-poster-v2-ready")) return;
      observer.disconnect();
      resolve();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    setTimeout(() => {
      observer.disconnect();
      resolve();
    }, 6000);
  });
}

function safeBackgroundUrl(value) {
  const source = String(value || "").trim();
  if (!source) return "";
  if (/^data:image\/(?:png|jpe?g|webp);base64,/i.test(source)) return source;
  if (/^https?:\/\//i.test(source)) return source;
  if (/^(?:\.\/|\.\.\/|\/)[^\s]+$/i.test(source)) return source;
  return "";
}

function normalizeSlug(value) {
  return String(value || "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
}

function escapeCssString(value) {
  return String(value || "").replace(/[\\"\n\r\f]/g, character => ({ "\\": "\\\\", '"': '\\"', "\n": "\\a ", "\r": "\\d ", "\f": "\\c " }[character]));
}
