import { supabase } from "./supabase-client.js";

const params = new URLSearchParams(location.search);
const slug = normalizeSlug(params.get("id"));
if (slug) void initializeSupportingCast(slug);

async function initializeSupportingCast(showcaseSlug) {
  const [{ data: showcase, error: showcaseError }, { data: guestRows, error: guestError }] = await Promise.all([
    supabase.rpc("get_public_act_showcase", { p_slug: showcaseSlug }),
    supabase.rpc("get_public_act_showcase_guests", { p_slug: showcaseSlug })
  ]);
  if (showcaseError) console.warn("Showcase role map could not be loaded.", showcaseError);
  if (guestError) console.warn("Guest cast could not be loaded.", guestError);
  const casts = Array.isArray(showcase?.casts) ? showcase.casts : [];
  const guests = Array.isArray(guestRows) ? guestRows.map(normalizeGuest).filter(item => item.name) : [];

  let queued = false;
  const sync = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      emphasizePosterRoles(casts);
      emphasizeNeoTokyoRoles();
      removeFinalTitleDuplicate();
      if (guests.length) {
        renderPosterGuests(guests);
        renderSummaryGuests(guests);
      }
    });
  };
  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "aria-hidden"] });
  sync();
}

function normalizeGuest(row) {
  return {
    sortOrder: Number(row?.sort_order || 0),
    handle: clean(row?.handle),
    name: clean(row?.name),
    personaStyle: clean(row?.persona_style),
    affiliation: clean(row?.affiliation),
    gender: clean(row?.gender),
    age: clean(row?.age),
    tagline: clean(row?.tagline),
    summary: clean(row?.summary),
    imageUrl: safeImageUrl(row?.image_url)
  };
}

function emphasizePosterRoles(casts) {
  for (const profile of document.querySelectorAll(".poster-v2-panel--profile")) {
    const name = clean(profile.querySelector(".poster-v2-name")?.textContent);
    const cast = casts.find(item => normalizeName(item?.fullName) === normalizeName(name));
    const role = clean(cast?.participationRole);
    if (!role) continue;
    let found = false;
    for (const chip of profile.querySelectorAll(".poster-v2-tags span")) {
      chip.classList.remove("is-assigned-style", "is-assigned-style-duplicate");
      if (normalizeStyle(chip.textContent) !== normalizeStyle(role)) continue;
      if (!found) {
        found = true;
        chip.classList.add("is-assigned-style");
        chip.dataset.assignedLabel = "ASSIGNED";
      } else {
        chip.classList.add("is-assigned-style-duplicate");
      }
    }
  }
}

function emphasizeNeoTokyoRoles() {
  for (const group of document.querySelectorAll(".neotokyo-sequence__styles,.neotokyo-sequence__summary-cast-styles")) {
    const selected = group.querySelector(".is-role-primary");
    if (!selected) continue;
    group.classList.add("has-assigned-style");
    selected.dataset.assignedLabel = "ASSIGNED STYLE";
  }
}

function removeFinalTitleDuplicate() {
  const summary = document.querySelector(".neotokyo-sequence__screen--summary");
  const title = summary?.querySelector(".neotokyo-sequence__overview .neotokyo-sequence__summary-title");
  if (!title || title.dataset.finalBriefing === "1") return;
  title.dataset.finalBriefing = "1";
  title.textContent = "FINAL BRIEFING";
  title.classList.add("neotokyo-supporting__briefing-title");
  const label = summary.querySelector(".neotokyo-sequence__overview .neotokyo-sequence__micro");
  if (label) label.textContent = "ACT CORE // OPENING BRIEF";
}

function renderPosterGuests(guests) {
  const board = document.querySelector("#poster-showcase-board-v2");
  if (!board || document.querySelector("#poster-supporting-cast")) return;
  const section = document.createElement("section");
  section.id = "poster-supporting-cast";
  section.className = "poster-supporting-cast";
  section.setAttribute("aria-label", "ゲストキャスト");
  section.append(createGuestHeading("04 / SUPPORTING", "GUEST CAST", `${guests.length} SUPPORTING FILES`));
  const grid = document.createElement("div");
  grid.className = "poster-supporting-cast__grid";
  guests.forEach((guest, index) => grid.append(createPosterGuestCard(guest, index)));
  section.append(grid);
  board.after(section);
}

function renderSummaryGuests(guests) {
  const screen = document.querySelector(".neotokyo-sequence__screen--summary");
  const area = screen?.querySelector(".neotokyo-sequence__summary-cast-area");
  if (!area || area.querySelector(".neotokyo-supporting-cast")) return;
  const section = document.createElement("section");
  section.className = "neotokyo-supporting-cast";
  const head = document.createElement("div");
  head.className = "neotokyo-supporting-cast__head";
  head.append(textNode("span", "SUPPORTING CHANNEL // GUEST FILES"), textNode("strong", `${guests.length} LINKED`));
  const rail = document.createElement("div");
  rail.className = "neotokyo-supporting-cast__rail";
  guests.forEach((guest, index) => rail.append(createSummaryGuestCard(guest, index)));
  section.append(head, rail);
  area.append(section);
}

function createGuestHeading(kicker, title, status) {
  const head = document.createElement("header");
  head.className = "poster-supporting-cast__head";
  const copy = document.createElement("div");
  copy.append(textNode("span", kicker), textNode("h2", title));
  head.append(copy, textNode("p", status));
  return head;
}

function createPosterGuestCard(guest, index) {
  const card = document.createElement("article");
  card.className = "poster-supporting-card";
  card.dataset.guest = String(index + 1);
  const visual = document.createElement("div");
  visual.className = "poster-supporting-card__visual";
  const image = document.createElement("img");
  image.src = guest.imageUrl || "./assets/placeholders/scan-failed.webp";
  image.alt = fullGuestName(guest);
  image.loading = "lazy";
  visual.append(image, textNode("span", `GUEST ${String(index + 1).padStart(2, "0")}`));
  const body = document.createElement("div");
  body.className = "poster-supporting-card__body";
  body.append(
    textNode("small", "SUPPORTING CAST // PERSONA FILE"),
    textNode("h3", fullGuestName(guest)),
    textNode("b", guest.personaStyle || "PERSONA UNREGISTERED")
  );
  const meta = [guest.affiliation, guest.age && `AGE ${guest.age}`, guest.gender].filter(Boolean).join(" / ");
  if (meta) body.append(textNode("p", meta, "poster-supporting-card__meta"));
  if (guest.tagline) body.append(textNode("blockquote", `“${guest.tagline}”`));
  if (guest.summary) body.append(textNode("p", guest.summary, "poster-supporting-card__summary"));
  card.append(visual, body);
  return card;
}

function createSummaryGuestCard(guest, index) {
  const card = document.createElement("article");
  card.className = "neotokyo-supporting-card";
  const image = document.createElement("img");
  image.src = guest.imageUrl || "./assets/placeholders/scan-failed.webp";
  image.alt = "";
  const body = document.createElement("div");
  body.append(
    textNode("span", `G${String(index + 1).padStart(2, "0")} // GUEST`),
    textNode("strong", fullGuestName(guest)),
    textNode("b", guest.personaStyle || "UNREGISTERED")
  );
  if (guest.tagline) body.append(textNode("small", `“${guest.tagline}”`));
  card.append(image, body);
  return card;
}

function fullGuestName(guest) { return [guest.handle ? `“${guest.handle}”` : "", guest.name].filter(Boolean).join(" "); }
function textNode(tag, value, className = "") { const node = document.createElement(tag); if (className) node.className = className; node.textContent = value; return node; }
function normalizeStyle(value) { return clean(value).replace(/[◎●]/g, "").replace(/[\s　]+/g, "").toLocaleLowerCase("ja-JP"); }
function normalizeName(value) { return clean(value).replace(/[“”"「」『』\s　]+/g, "").toLocaleLowerCase("ja-JP"); }
function clean(value) { return String(value ?? "").trim(); }
function normalizeSlug(value) { return clean(value).normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64); }
function safeImageUrl(value) { const source = clean(value); if (!source) return ""; if (/^(?:https?:|data:image\/|\.\/|\/)/i.test(source)) return source; return ""; }
