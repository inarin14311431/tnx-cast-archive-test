import { SHOWCASE_BACKGROUND_PRESETS } from "./showcase-background-presets.js?v=7068197c";
import { parseSceneSelectionField } from "./act-showcase-scenes.js?v=2647c951";
import { hasGeneratedOutput } from "./showcase-generation-settle.js?v=cdbb78a8";
import {
  publishBlocker,
  summarizeBackground,
  summarizeCasts,
  summarizeChecklist,
  summarizeScenes,
  summarizeSteps,
  themeShortName
} from "./showcase-generator-summary.js?v=7d1ef899";

// The generator's frame (docs/SHOWCASE_GENERATOR_REDESIGN.md): the "published" band under the header, the step navigation,
// the publish checklist and settings summary, and the HTML export dialog. Nothing here changes what is saved or published:
// it only reads the same fields the other modules read and shows what they hold.

const $ = selector => document.querySelector(selector);
const preview = $("#showcase-preview");
const generatorStatus = $("#generator-status");

mountOwnedBand();
mountSteps();
mountSummary();
mountExportDialog();

// ---- the "公開済みを編集" band ------------------------------------------------------------------------------------------
function mountOwnedBand() {
  const toggle = $("#owned-showcase-toggle");
  const band = $("#owned-showcase-restore");
  if (!toggle || !band) return;
  const setOpen = open => {
    band.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.classList.toggle("is-open", open);
  };
  toggle.addEventListener("click", () => setOpen(band.hidden));
  // A restore started from a link (?edit=) reports its progress inside the band, so the band starts open.
  if (new URLSearchParams(location.search).has("edit")) setOpen(true);
}

// ---- step navigation ---------------------------------------------------------------------------------------------------
function mountSteps() {
  const nav = $("#generator-steps");
  if (!nav) return;
  const links = [...nav.querySelectorAll("a[data-step-target]")];
  const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  for (const link of links) {
    link.addEventListener("click", event => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", location.pathname + location.search);
    });
  }
  if (!("IntersectionObserver" in window)) return;
  const sections = links.map(link => document.querySelector(link.getAttribute("href"))).filter(Boolean);
  const visible = new Map();
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
    const active = sections.map(section => [section.id, visible.get(section.id) || 0]).sort((a, b) => b[1] - a[1])[0];
    if (!active || active[1] === 0) return;
    for (const link of links) {
      const current = link.getAttribute("href") === `#${active[0]}`;
      if (current) link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
    }
  }, { rootMargin: "-20% 0px -45% 0px", threshold: [0, 0.1, 0.4, 0.8] });
  sections.forEach(section => observer.observe(section));
}

// ---- checklist, step states, settings summary -------------------------------------------------------------------------
function readCastRows() {
  return [...document.querySelectorAll("#selected-casts [data-selected-index]")].map(row => ({
    isPrivate: row.dataset.visibility === "private",
    hasHandout: Boolean(row.querySelector('[data-field="description"]')?.value?.trim())
  }));
}

function readState() {
  const themeSelect = $("#showcase-theme");
  return {
    actName: $("#act-name")?.value ?? "",
    rulerName: $("#ruler-name")?.value ?? "",
    themeLabel: themeSelect?.selectedOptions?.[0]?.textContent ?? "",
    casts: summarizeCasts(readCastRows()),
    background: {
      presetKey: $("#background-preset")?.value ?? "",
      url: $("#background-url")?.value ?? "",
      hasFile: Boolean($("#background-file")?.files?.length),
      presets: SHOWCASE_BACKGROUND_PRESETS
    },
    scenes: parseSceneSelectionField($("#showcase-scenes")?.value)
  };
}

function renderSummary() {
  const state = readState();
  const steps = summarizeSteps(state);
  for (const [key, text] of Object.entries(steps)) {
    const node = document.querySelector(`[data-step-status="${key}"]`);
    if (node && node.textContent !== text) node.textContent = text;
  }
  const blocker = publishBlocker(state);
  const publishStep = document.querySelector('[data-step-target="publish"]');
  if (publishStep) publishStep.dataset.state = blocker ? "blocked" : "ready";

  const checklist = $("#publish-checklist");
  if (checklist) {
    const items = summarizeChecklist(state);
    const signature = JSON.stringify(items);
    if (checklist.dataset.signature !== signature) {
      checklist.dataset.signature = signature;
      checklist.replaceChildren(...items.map(item => {
        const li = document.createElement("li");
        li.dataset.state = item.state;
        const label = document.createElement("span");
        label.textContent = item.label;
        const value = document.createElement("b");
        value.textContent = item.value;
        li.append(label, value);
        return li;
      }));
    }
  }
  const blockerNode = $("#publish-blocker");
  if (blockerNode) {
    blockerNode.hidden = !blocker;
    blockerNode.textContent = blocker;
  }
  const settings = {
    theme: themeShortName(state.themeLabel) || "—",
    background: summarizeBackground(state.background),
    scenes: summarizeScenes(state.scenes)
  };
  for (const [key, text] of Object.entries(settings)) {
    const node = document.querySelector(`[data-setting="${key}"]`);
    if (node && node.textContent !== text) node.textContent = text;
  }
}

function mountSummary() {
  let scheduled = 0;
  const schedule = () => {
    if (scheduled) return;
    scheduled = requestAnimationFrame(() => { scheduled = 0; renderSummary(); });
  };
  document.addEventListener("input", schedule, true);
  document.addEventListener("change", schedule, true);
  document.addEventListener("click", event => {
    // Cards and buttons that change the input without an input event (background presets, scene buttons, removing a cast).
    if (event.target.closest?.("#background-preset-grid, #selected-casts, #public-cast-grid, #owned-private-cast-grid")) schedule();
  }, true);
  const casts = $("#selected-casts");
  if (casts) new MutationObserver(schedule).observe(casts, { childList: true, subtree: true });
  const scenes = $("#showcase-scene-composition");
  if (scenes) new MutationObserver(schedule).observe(scenes, { childList: true, subtree: true });
  renderSummary();
  // The fields that other modules fill after load (restore, saved settings) settle shortly after the first paint.
  window.setTimeout(schedule, 400);
}

// ---- HTML export dialog ------------------------------------------------------------------------------------------------
function mountExportDialog() {
  const dialog = $("#html-export-dialog");
  const open = $("#open-html-export");
  if (!dialog || !open) return;
  const generateButton = $("#generate-button");
  const mirror = $("#html-export-status");

  const syncStatus = () => {
    if (!mirror || !generatorStatus) return;
    mirror.textContent = generatorStatus.textContent;
    mirror.className = generatorStatus.className;
  };
  if (generatorStatus) new MutationObserver(syncStatus).observe(generatorStatus, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["class"] });

  open.addEventListener("click", () => {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    syncStatus();
    // Opening the dialog writes the HTML out of the current input: generate when nothing has been generated yet.
    if (!hasGeneratedOutput(preview)) generateButton?.click();
  });
  $("#close-html-export")?.addEventListener("click", () => dialog.close?.());
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close?.(); });
}
