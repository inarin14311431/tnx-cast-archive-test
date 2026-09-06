import { getImageObjectPosition, getImageScale, getImageTransformOrigin } from "./image-focus.js?v=3";

const SUPABASE_URL = "https://koprmbkoftuuffslhsvt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Dsb9Boo4aP3c_v-Iaam4mw_F1szMdUi";

const status = document.querySelector("#act-showcase-status");
const root = document.querySelector("#act-showcase-root");
const story = document.querySelector("#showcase-story");
const cinematicIntro = document.querySelector("#cinematic-intro");
const pageStartedAt = performance.now();

initialize();

async function initialize() {
  try {
    const slug = normalizeSlug(new URLSearchParams(location.search).get("id"));
    if (!slug) throw new Error("アクト識別名が指定されていません。");

    const data = await fetchPublicShowcase(slug);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("指定されたアクト紹介は公開されていません。公開画面から再度『アクト紹介を公開』してください。");
    }

    renderShowcase(data);
    status.hidden = true;
    root.hidden = false;
    requestAnimationFrame(() => story?.classList.add("is-ready"));
    initializeCinematicPresentation();
  } catch (error) {
    console.error(error);
    hideCinematicIntro(0);
    status.textContent = error?.message || "アクト紹介を読み込めませんでした。";
    status.classList.add("is-error");
  }
}

async function fetchPublicShowcase(slug) {
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

  const responseText = await response.text();
  let payload = null;
  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = responseText;
    }
  }

  if (!response.ok) {
    const detail = typeof payload === "object" && payload
      ? [payload.message, payload.hint, payload.details, payload.code].filter(Boolean).join(" / ")
      : String(payload || "");
    throw new Error(translateError({ message: detail, status: response.status }));
  }
  return payload;
}

function renderShowcase(data) {
  const castList = Array.isArray(data.casts) ? data.casts.slice(0, 6) : [];
  if (!castList.length) throw new Error("このアクト紹介には表示できるキャストがありません。");

  const pageTitle = text(data.pageTitle) || "ACT SHOWCASE";
  const heroTitle = text(data.heroTitle) || pageTitle;
  const heroSubTitle = text(data.heroSubTitle) || "CAST SHOWCASE";
  const actLabel = text(data.actName) || heroTitle;
  const rulerName = text(data.rulerName);
  const introText = text(data.intro);

  document.title = pageTitle;
  setText("#showcase-kicker", heroTitle);
  setText("#opening-act-name", actLabel);
  setText("#opening-subtitle", heroSubTitle);
  setText("#trailer-title", actLabel);
  setText("#trailer-ghost-title", actLabel);
  setText("#end-title", heroTitle);
  setText("#end-act-name", actLabel);
  setText("#data-act-name", actLabel);
  setText("#data-ruler", rulerName || "—");

  const openingRuler = document.querySelector("#opening-ruler");
  if (openingRuler) {
    openingRuler.hidden = !rulerName;
    openingRuler.textContent = rulerName ? `RULER // ${rulerName}` : "";
  }

  const trailerBody = document.querySelector("#trailer-body");
  const trailerEmpty = document.querySelector("#trailer-empty");
  if (trailerBody) {
    trailerBody.textContent = introText;
    trailerBody.hidden = !introText;
  }
  if (trailerEmpty) trailerEmpty.hidden = Boolean(introText);

  const background = safeImageUrl(data.background);
  if (background) {
    document.body.style.setProperty("--showcase-background", `url("${escapeCssString(background)}")`);
    document.body.classList.add("has-showcase-background");
  }

  renderTrailerVisual(castList);
  renderHandouts(castList);
  renderCasts(castList);

  const handoutCount = castList.filter(item => item?.handout && typeof item.handout === "object").length;
  const styleCount = castList.reduce((sum, item) => sum + (Array.isArray(item?.styles) ? item.styles.length : 0), 0);
  setText("#metric-cast", String(castList.length).padStart(2, "0"));
  setText("#metric-handout", String(handoutCount).padStart(2, "0"));
  setText("#metric-style", String(styleCount).padStart(2, "0"));
}

function renderTrailerVisual(castList) {
  const source = castList.find(item => safeImageUrl(item?.imageUrl));
  const visual = document.querySelector("#trailer-visual");
  const image = document.querySelector("#trailer-image");
  if (!visual || !image || !source) return;

  const imageUrl = safeImageUrl(source.imageUrl);
  image.src = imageUrl;
  image.alt = text(source.imageAlt) || text(source.fullName);
  image.style.objectPosition = getImageObjectPosition(source.imageUrl);
  image.style.setProperty("--tnx-image-scale", String(getImageScale(source.imageUrl)));
  image.style.setProperty("--tnx-image-origin", getImageTransformOrigin(source.imageUrl));
  setText("#trailer-cast-name", text(source.fullName) || "CAST VISUAL");
  visual.hidden = false;
}

function renderHandouts(castList) {
  const host = document.querySelector("#showcase-handouts");
  if (!host) return;

  const handouts = castList
    .map((item, index) => ({ item, index, handout: item?.handout }))
    .filter(entry => entry.handout && typeof entry.handout === "object");

  if (!handouts.length) {
    const empty = element("article", "handout-file handout-file--empty");
    empty.innerHTML = `
      <div class="handout-file__top"><span>PUBLIC HANDOUT</span><strong>NO DATA</strong></div>
      <div class="handout-file__body">
        <p>PLAYER INFORMATION FILE</p>
        <h3>HANDOUT DATA NOT REGISTERED</h3>
        <p class="handout-file__empty-copy">公開用ハンドアウトは登録されていません。</p>
      </div>
    `;
    host.replaceChildren(empty);
    return;
  }

  host.replaceChildren(...handouts.map(({ item, index, handout }) => {
    const card = element("article", "handout-file");
    const top = element("div", "handout-file__top");
    top.append(
      paragraph("", `HO-${String(index + 1).padStart(2, "0")}`),
      elementWithText("strong", "", text(item.fullName) || `CAST ${index + 1}`)
    );

    const body = element("div", "handout-file__body");
    body.append(
      paragraph("", "PLAYER INFORMATION FILE"),
      elementWithText("h3", "", text(handout.title) || "HANDOUT"),
      paragraph("handout-file__copy", text(handout.body) || "ハンドアウト詳細は未登録です。")
    );
    card.append(top, body);
    return card;
  }));
}

function renderCasts(castList) {
  const navigation = document.querySelector("#showcase-navigation");
  const casts = document.querySelector("#showcase-casts");
  if (!navigation || !casts) return;

  navigation.replaceChildren(...castList.map((item, index) => createNavigationItem(item, index)));
  casts.replaceChildren(...castList.map((item, index) => createCastCard(item, index)));
}

function createNavigationItem(item, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.castTarget = `cast-${index + 1}`;
  const number = document.createElement("span");
  number.textContent = String(index + 1).padStart(2, "0");
  button.append(number, document.createTextNode(text(item.fullName) || `CAST ${index + 1}`));
  return button;
}

function createCastCard(item, index) {
  const card = element("article", "cast-card");
  card.id = `cast-${index + 1}`;
  card.dataset.reveal = "";

  const imageWrap = element("div", "cast-card__image");
  const image = document.createElement("img");
  image.src = safeImageUrl(item.imageUrl) || "./assets/placeholders/scan-failed.webp";
  image.alt = text(item.imageAlt) || text(item.fullName);
  image.style.objectPosition = getImageObjectPosition(item.imageUrl);
  image.style.setProperty("--tnx-image-scale", String(getImageScale(item.imageUrl)));
  image.style.setProperty("--tnx-image-origin", getImageTransformOrigin(item.imageUrl));
  image.loading = index === 0 ? "eager" : "lazy";
  image.decoding = "async";
  imageWrap.append(image);

  const body = element("div", "cast-card__body");
  body.append(paragraph("cast-card__slot", text(item.slot) || `CAST ${String(index + 1).padStart(2, "0")}`));

  if (text(item.reading)) body.append(paragraph("cast-card__reading", text(item.reading)));

  const name = element("h3", "cast-card__name");
  const allowedNameClasses = new Set(["cast-card__name--long", "cast-card__name--very-long"]);
  for (const className of Array.isArray(item.nameClass) ? item.nameClass : []) {
    if (allowedNameClasses.has(className)) name.classList.add(className);
  }
  name.textContent = text(item.fullName) || "名称未登録";
  body.append(name);

  const styles = Array.isArray(item.styles) ? item.styles : [];
  if (styles.length) {
    const styleWrap = element("div", "cast-card__styles");
    for (const styleData of styles) {
      const badge = element("span", "style");
      badge.style.setProperty("--style-color", safeColor(styleData.color));
      if (styleData.handoutRole === true) {
        badge.classList.add("style--handout-role");
        badge.append(elementWithText("small", "style__handout-role-label", "HANDOUT"));
      }
      badge.append(document.createTextNode(text(styleData.label)));
      styleWrap.append(badge);
    }
    body.append(styleWrap);
  }

  const meta = Array.isArray(item.meta) ? item.meta.slice(0, 6) : [];
  if (meta.length) {
    const metaWrap = element("div", "cast-card__meta");
    for (const field of meta) {
      const box = document.createElement("div");
      box.append(
        elementWithText("small", "", text(field.label)),
        elementWithText("strong", "", text(field.value) || "—")
      );
      metaWrap.append(box);
    }
    body.append(metaWrap);
  }

  if (text(item.tagline)) body.append(paragraph("cast-card__tagline", text(item.tagline)));

  if (item.handout && typeof item.handout === "object") {
    const handoutFlag = element("div", "cast-card__handout-flag");
    handoutFlag.append(
      elementWithText("span", "", "HANDOUT"),
      elementWithText("strong", "", text(item.handout.title) || "PUBLIC FILE")
    );
    body.append(handoutFlag);
  }

  if (item.link && typeof item.link === "object") {
    const label = text(item.link.text) || "OPEN CAST DATABASE →";
    const href = safeLinkUrl(item.link.href);
    if (!item.link.disabled && href) {
      const link = elementWithText("a", "cast-card__link", label);
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener";
      body.append(link);
    } else {
      body.append(elementWithText("span", "cast-card__link cast-card__link--disabled", label));
    }
  }

  card.append(imageWrap, body, paragraph("cast-card__serial", text(item.serial) || `NV-${String(index + 1).padStart(3, "0")}`));
  return card;
}

function initializeCinematicPresentation() {
  const elapsed = performance.now() - pageStartedAt;
  hideCinematicIntro(Math.max(220, 1150 - elapsed));
  initializeSceneNavigation();
  initializeSceneReveal();
  initializeCastNavigation();
  initializeOpeningParallax();
}

function hideCinematicIntro(delay = 0) {
  if (!cinematicIntro) return;
  window.setTimeout(() => cinematicIntro.classList.add("is-hidden"), delay);
  window.setTimeout(() => cinematicIntro.remove(), delay + 850);
}

function initializeSceneNavigation() {
  const buttons = [...document.querySelectorAll("[data-scene-target]")];
  const scenes = [...document.querySelectorAll("[data-scene]")];

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      const target = document.querySelector(`[data-scene="${button.dataset.sceneTarget}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  if (!("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    const key = visible.target.dataset.scene;
    buttons.forEach(button => button.classList.toggle("is-active", button.dataset.sceneTarget === key));
    visible.target.classList.add("is-visible");
  }, {
    threshold: [0.2, 0.42, 0.62],
    rootMargin: "-12% 0px -42% 0px"
  });

  scenes.forEach(scene => observer.observe(scene));
}

function initializeSceneReveal() {
  const revealItems = [...document.querySelectorAll("[data-reveal]")];
  if (!revealItems.length) return;

  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    revealItems.forEach(item => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });

  revealItems.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index * 65, 260)}ms`;
    observer.observe(item);
  });
}

function initializeCastNavigation() {
  const buttons = [...document.querySelectorAll("[data-cast-target]")];
  buttons.forEach(button => {
    button.addEventListener("click", () => {
      const card = document.getElementById(button.dataset.castTarget);
      card?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    });
  });
}

function initializeOpeningParallax() {
  const opening = document.querySelector(".scene-opening");
  if (!opening || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let frame = 0;
  opening.addEventListener("pointermove", event => {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const rect = opening.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      opening.style.setProperty("--pointer-x", x.toFixed(3));
      opening.style.setProperty("--pointer-y", y.toFixed(3));
      frame = 0;
    });
  }, { passive: true });
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

function element(tagName, className = "") {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  return node;
}

function elementWithText(tagName, className, value) {
  const node = element(tagName, className);
  node.textContent = value;
  return node;
}

function paragraph(className, value) {
  return elementWithText("p", className, value);
}

function safeImageUrl(value) {
  const source = text(value);
  if (!source) return "";
  if (source.startsWith("data:image/")) return source;
  try {
    const url = new URL(source, location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function safeLinkUrl(value) {
  const source = text(value);
  if (!source) return "";
  try {
    const url = new URL(source, location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function safeColor(value) {
  const source = text(value);
  return /^#[0-9a-f]{3,8}$/i.test(source) ? source : "#00efff";
}

function escapeCssString(value) {
  return String(value).replace(/["\\\n\r]/g, character => ({ '"': '\\"', "\\": "\\\\", "\n": "", "\r": "" }[character]));
}

function normalizeSlug(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function translateError(error) {
  const message = String(error?.message || "");
  if (/invalid jwt|jwt.*invalid|expected 3 parts/i.test(message)) {
    return "公開データ取得用の認証ヘッダーが不正でした。ページを再読み込みしてください。";
  }
  if (/get_public_act_showcase|function.*does not exist|schema cache|PGRST202/i.test(message)) {
    return "動的公開機能が未設定です。管理者がSupabaseの設定を確認してください。";
  }
  if (/permission denied|not authorized|401|403/i.test(`${error?.status || ""} ${message}`)) {
    return "公開アクト紹介の参照権限がありません。Supabaseの公開RPC権限を確認してください。";
  }
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "公開データの取得に失敗しました。通信状態を確認して再読み込みしてください。";
  }
  return message || "アクト紹介を読み込めませんでした。";
}

function text(value) {
  return String(value ?? "").trim();
}
