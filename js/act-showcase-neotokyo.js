const SAMPLE_TRAILER_MESSAGE = "公開用アクトトレーラーは未登録です。\n公開データにトレーラーを登録すると、ここで読み上げ表示されます。";
const FALLBACK_IMAGE = "./assets/placeholders/scan-failed.webp";

export function prepareNeoTokyoLoading(intro) {
  if (!intro) return;
  document.body.classList.add("showcase-neotokyo");
  const overline = intro.querySelector(".cinematic-intro__overline");
  const title = intro.querySelector(".cinematic-intro__title");
  const sub = intro.querySelector(".cinematic-intro__sub");
  if (overline) overline.textContent = "N◎VA MUNICIPAL DATABASE // ACT ASSIGNMENT SYSTEM";
  if (title) title.textContent = "OPENING";
  if (sub) sub.textContent = "アクト紹介を読み込み中…";
}

export async function runNeoTokyoIntro({ intro, model }) {
  if (!intro || !model) return;
  if (prefersReducedMotion()) {
    document.body.classList.add("showcase-neotokyo-reduced");
    return;
  }

  const state = createSequenceState();
  const shell = createSequenceShell(state);
  intro.setAttribute("aria-hidden", "false");
  intro.classList.add("neotokyo-sequence");
  intro.replaceChildren(shell);
  document.body.classList.add("showcase-neotokyo-intro-active");

  const finish = () => {
    if (state.finished) return;
    state.finished = true;
    state.skipRequested = true;
    state.resolveWaiters();
    document.body.classList.remove("showcase-neotokyo-intro-active");
    intro.setAttribute("aria-hidden", "true");
  };

  state.skipButton.addEventListener("click", finish, { once: true });

  try {
    await showOpening(state);
    if (state.finished) return;
    await showActTitle(state, model);
    if (state.finished) return;
    await showTrailer(state, model);
    if (state.finished) return;

    for (let index = 0; index < model.casts.length; index += 1) {
      await showHandoutAndAssign(state, model.casts[index], index, model.casts.length);
      if (state.finished) return;
    }

    await showReady(state, model);
  } finally {
    finish();
  }
}

function createSequenceState() {
  const state = {
    finished: false,
    skipRequested: false,
    waiters: new Set(),
    stage: null,
    progress: null,
    progressLabel: null,
    skipButton: null,
    resolveWaiters() {
      for (const resolve of this.waiters) resolve();
      this.waiters.clear();
    }
  };
  return state;
}

function createSequenceShell(state) {
  const shell = node("div", "neotokyo-sequence__shell");
  const header = node("header", "neotokyo-sequence__header");
  const brand = node("div", "neotokyo-sequence__brand");
  brand.append(
    textNode("strong", "", "N◎VA"),
    textNode("span", "", "MUNICIPAL DATABASE"),
    textNode("small", "", "ACT ASSIGNMENT SYSTEM // PUBLIC ACCESS")
  );

  const system = node("div", "neotokyo-sequence__system");
  system.append(
    textNode("span", "", "CONNECTION // SECURE"),
    textNode("span", "", "NODE // NEOTOKYO")
  );

  const skip = textNode("button", "neotokyo-sequence__skip", "SKIP INTRO");
  skip.type = "button";
  skip.setAttribute("aria-label", "アクト紹介の導入演出をスキップ");
  state.skipButton = skip;
  header.append(brand, system, skip);

  const rail = node("aside", "neotokyo-sequence__rail");
  for (const [index, label] of ["OPENING", "ACT", "TRAILER", "HANDOUT", "ASSIGN"].entries()) {
    const item = node("div", "neotokyo-sequence__rail-item");
    item.append(textNode("span", "", String(index + 1).padStart(2, "0")), textNode("strong", "", label));
    rail.append(item);
  }

  const stage = node("main", "neotokyo-sequence__stage");
  stage.setAttribute("aria-live", "polite");
  state.stage = stage;

  const footer = node("footer", "neotokyo-sequence__footer");
  const progress = node("div", "neotokyo-sequence__progress");
  progress.append(node("i", ""));
  const progressLabel = textNode("span", "", "INITIALIZING // 00%");
  state.progress = progress;
  state.progressLabel = progressLabel;
  footer.append(progress, progressLabel, textNode("small", "", "TOKYO N◎VA // PUBLIC ACT ARCHIVE"));

  shell.append(header, rail, stage, footer);
  return shell;
}

async function showOpening(state) {
  setProgress(state, 5, "OPENING");
  replaceStage(state, {
    eyebrow: "01 // OPENING",
    title: "OPENING",
    sub: "アクト紹介を読み込み中…",
    status: ["PUBLIC ACT FILE // DETECTED", "SHOWCASE DATA // VERIFIED", "ASSIGNMENT SEQUENCE // READY"]
  });
  await wait(state, 950);
}

async function showActTitle(state, model) {
  setProgress(state, 18, "ACT FILE LOADED");
  const content = node("section", "neotokyo-sequence__screen neotokyo-sequence__screen--title");
  content.append(
    textNode("p", "neotokyo-sequence__eyebrow", "02 // ACT FILE"),
    textNode("p", "neotokyo-sequence__micro", "ACT TITLE"),
    textNode("h1", "neotokyo-sequence__act-title", model.actName || "ACT SHOWCASE"),
    textNode("p", "neotokyo-sequence__ruler", model.rulerName ? `RL // ${model.rulerName}` : "RL // UNREGISTERED"),
    textNode("p", "neotokyo-sequence__terminal", "ACT RECORD ACCEPTED // PREPARING TRAILER STREAM")
  );
  swapScreen(state, content);
  await wait(state, 1400);
}

async function showTrailer(state, model) {
  setProgress(state, 30, "ACT TRAILER");
  const content = node("section", "neotokyo-sequence__screen neotokyo-sequence__screen--trailer");
  const heading = model.trailerTitle || "ACT TRAILER";
  const trailer = model.trailer || SAMPLE_TRAILER_MESSAGE;
  const copy = textNode("p", "neotokyo-sequence__readout", "");
  if (!model.trailer) copy.classList.add("is-placeholder");
  content.append(
    textNode("p", "neotokyo-sequence__eyebrow", "03 // ACT TRAILER"),
    textNode("p", "neotokyo-sequence__micro", "PUBLIC BROADCAST TEXT"),
    textNode("h2", "neotokyo-sequence__section-title", heading),
    copy,
    textNode("p", "neotokyo-sequence__terminal", "VOICE CHANNEL // TEXT SYNTHESIS")
  );
  swapScreen(state, content);
  await typeReadout(state, copy, trailer, 2600);
  await wait(state, model.trailer ? 700 : 350);
}

async function showHandoutAndAssign(state, cast, index, total) {
  const pcNumber = index + 1;
  const handout = cast?.handout && typeof cast.handout === "object" ? cast.handout : {};
  const handoutTitle = clean(handout.title) || clean(cast?.participationRole) || `PC${pcNumber} HANDOUT`;
  const handoutBody = clean(handout.body) || "公開用ハンドアウト本文は登録されていません。";
  const progressBase = 34 + Math.round((index / Math.max(total, 1)) * 52);
  setProgress(state, progressBase, `HANDOUT ${String(pcNumber).padStart(2, "0")}`);

  const handoutScreen = node("section", "neotokyo-sequence__screen neotokyo-sequence__screen--handout");
  const copy = textNode("p", "neotokyo-sequence__readout", "");
  handoutScreen.append(
    textNode("p", "neotokyo-sequence__eyebrow", `04 // HANDOUT ${String(pcNumber).padStart(2, "0")} // PC${pcNumber}`),
    textNode("p", "neotokyo-sequence__micro", "PLAYER INFORMATION / CAST REQUIREMENT"),
    textNode("h2", "neotokyo-sequence__section-title", handoutTitle),
    copy,
    textNode("p", "neotokyo-sequence__terminal", `READING HANDOUT // PC${pcNumber}`)
  );
  swapScreen(state, handoutScreen);
  await typeReadout(state, copy, handoutBody, 2400);
  if (state.finished) return;
  await wait(state, 350);

  const assign = node("section", "neotokyo-sequence__screen neotokyo-sequence__screen--assign");
  const search = node("div", "neotokyo-sequence__search");
  search.append(
    textNode("span", "", `PC${pcNumber} // ${handoutTitle}`),
    textNode("strong", "", "SEARCHING CAST..."),
    textNode("small", "", "CROSS-REFERENCING PUBLIC CAST ARCHIVE")
  );
  assign.append(
    textNode("p", "neotokyo-sequence__eyebrow", `05 // ASSIGNMENT ${String(pcNumber).padStart(2, "0")}`),
    textNode("h2", "neotokyo-sequence__assign-title", "ASSIGN"),
    search
  );
  swapScreen(state, assign);
  setProgress(state, progressBase + 5, `SEARCHING CAST // PC${pcNumber}`);
  await wait(state, 620);
  if (state.finished) return;

  search.querySelector("strong").textContent = "MATCH FOUND";
  search.classList.add("is-found");
  await wait(state, 360);
  if (state.finished) return;

  assign.append(createAssignedCast(cast, pcNumber));
  assign.classList.add("is-assigned");
  setProgress(state, progressBase + 10, `CAST ASSIGNED // PC${pcNumber}`);
  await wait(state, 1150);
}

function createAssignedCast(cast, pcNumber) {
  const card = node("article", "neotokyo-sequence__cast");
  const imageFrame = node("figure", "neotokyo-sequence__cast-image");
  const image = document.createElement("img");
  image.src = safeImageUrl(cast?.imageUrl) || FALLBACK_IMAGE;
  image.alt = clean(cast?.imageAlt) || clean(cast?.fullName) || `PC${pcNumber} CAST`;
  image.addEventListener("error", () => {
    if (!image.src.endsWith("scan-failed.webp")) image.src = FALLBACK_IMAGE;
  });
  imageFrame.append(image);

  const detail = node("div", "neotokyo-sequence__cast-detail");
  const styles = Array.isArray(cast?.styles)
    ? cast.styles.map(item => clean(item?.label)).filter(Boolean)
    : [];
  const styleRow = node("div", "neotokyo-sequence__styles");
  for (const style of styles) styleRow.append(textNode("span", "", style));
  detail.append(
    textNode("p", "neotokyo-sequence__micro", `PC${pcNumber} // CAST ASSIGNED`),
    textNode("h3", "", clean(cast?.fullName) || `CAST ${pcNumber}`),
    textNode("p", "neotokyo-sequence__cast-tagline", clean(cast?.tagline) || "PUBLIC CAST ARCHIVE"),
    styleRow,
    textNode("strong", "neotokyo-sequence__assigned", "CAST ASSIGNED")
  );
  card.append(imageFrame, detail);
  return card;
}

async function showReady(state, model) {
  setProgress(state, 100, "ACT READY");
  const content = node("section", "neotokyo-sequence__screen neotokyo-sequence__screen--ready");
  content.append(
    textNode("p", "neotokyo-sequence__eyebrow", "06 // ASSIGNMENT COMPLETE"),
    textNode("p", "neotokyo-sequence__micro", `${model.casts.length} CAST FILES LINKED`),
    textNode("h2", "neotokyo-sequence__ready-title", "ALL CASTS\nASSIGNED"),
    textNode("strong", "neotokyo-sequence__act-ready", "ACT READY"),
    textNode("p", "neotokyo-sequence__terminal", "OPENING PUBLIC ACT SHOWCASE...")
  );
  swapScreen(state, content);
  await wait(state, 1050);
}

function replaceStage(state, { eyebrow, title, sub, status = [] }) {
  const content = node("section", "neotokyo-sequence__screen neotokyo-sequence__screen--opening");
  content.append(
    textNode("p", "neotokyo-sequence__eyebrow", eyebrow),
    textNode("h2", "neotokyo-sequence__opening-title", title),
    textNode("p", "neotokyo-sequence__opening-sub", sub)
  );
  const log = node("div", "neotokyo-sequence__bootlog");
  for (const line of status) log.append(textNode("span", "", `> ${line}`));
  content.append(log);
  swapScreen(state, content);
}

function swapScreen(state, content) {
  state.stage.replaceChildren(content);
  requestAnimationFrame(() => content.classList.add("is-visible"));
}

function setProgress(state, value, label) {
  const progress = Math.max(0, Math.min(100, Number(value) || 0));
  state.progress.style.setProperty("--neotokyo-progress", `${progress}%`);
  state.progressLabel.textContent = `${label} // ${String(progress).padStart(2, "0")}%`;
}

async function typeReadout(state, target, value, maxDuration) {
  const source = clean(value);
  if (!source || state.finished) return;
  const characters = Array.from(source);
  const interval = Math.max(6, Math.min(24, Math.floor(maxDuration / Math.max(characters.length, 1))));
  const chunkSize = characters.length > 360 ? 3 : characters.length > 180 ? 2 : 1;
  let index = 0;
  while (index < characters.length && !state.finished) {
    index = Math.min(characters.length, index + chunkSize);
    target.textContent = characters.slice(0, index).join("");
    await wait(state, interval);
  }
  if (!state.finished) target.textContent = source;
}

function wait(state, milliseconds) {
  if (state.finished || state.skipRequested || milliseconds <= 0) return Promise.resolve();
  return new Promise(resolve => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      state.waiters.delete(done);
      resolve();
    };
    const timer = window.setTimeout(done, milliseconds);
    state.waiters.add(done);
  });
}

function safeImageUrl(value) {
  const source = clean(value);
  if (!source) return "";
  if (source.startsWith("data:image/")) return source;
  try {
    const url = new URL(source, location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

function node(tag, className = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  return element;
}

function textNode(tag, className, value) {
  const element = node(tag, className);
  element.textContent = value || "";
  return element;
}

function clean(value) {
  return String(value ?? "").trim();
}
