import { test, expect } from "@playwright/test";
import { installShowcaseGeneratorMock, MOCK_PUBLIC_CASTS } from "./fixtures/showcase-generator-mock.mjs";

// A cast row's panels: a manual cast has two ("編集 EDIT": picture, handle, name, styles, player, details; "ハンドアウト HANDOUT": CAST No, role,
// tagline, handout), a registered cast one. The whole list has at most one open panel; each panel ends with a "閉じる CLOSE" button.
// The rows are updated in place when a panel opens or closes, so what was typed into a closed panel stays.

async function openGenerator(page) {
  await page.route("**/*", route => {
    const { hostname } = new URL(route.request().url());
    return hostname === "127.0.0.1" || hostname === "localhost" ? route.fallback() : route.abort();
  });
  await installShowcaseGeneratorMock(page, { rpc: { publish_act_showcase_for_current_user: "act-mock-id", replace_act_showcase_guests_for_current_user: null } });
  await page.goto("/showcase-generator.html");
  await expect(page.locator("html")).toHaveAttribute("data-showcase-generator-state", "ready", { timeout: 15_000 });
  await expect(page.locator("#public-cast-grid [data-public-character-id]").first()).toBeVisible();
}

const row = (page, index) => page.locator(`#selected-casts [data-selected-index="${index}"]`);
const toggle = (page, index, panel) => row(page, index).locator(`[data-action="toggle"][data-panel="${panel}"]`);
const panelOf = (page, index, panel) => row(page, index).locator(`.cast-row__panel--${panel}`);
const addRegistered = (page, index) => page.locator(`[data-public-character-id="${MOCK_PUBLIC_CASTS[index].id}"]`).click();

async function addManual(page, name) {
  const form = page.locator("#manual-cast-form");
  if (await form.isHidden()) await page.locator("#add-manual-cast").click();
  await form.locator('[data-manual-new="name"]').fill(name);
  await form.locator('button[type="submit"]').click();
  await expect(form).toBeHidden();
}

// every panel of the list that can be seen
const visiblePanels = page => page.locator("#selected-casts .cast-row__panel:visible");

async function expectOnlyOpen(page, index, panel) {
  await expect(visiblePanels(page)).toHaveCount(panel ? 1 : 0);
  if (panel) await expect(panelOf(page, index, panel)).toBeVisible();
  const expanded = await page.locator("#selected-casts [data-action=\"toggle\"]").evaluateAll(buttons => buttons.map(button => [button.closest("[data-selected-index]").dataset.selectedIndex, button.dataset.panel, button.getAttribute("aria-expanded")]));
  for (const [at, name, value] of expanded) expect(value, `row ${at} ${name}`).toBe(String(panel !== null && Number(at) === index && name === panel));
}

test("a manual row has EDIT to the left of HANDOUT; a registered row has HANDOUT only; each button controls its own panel", async ({ page }) => {
  await openGenerator(page);
  await addRegistered(page, 0);
  await addManual(page, "手動キャスト");
  const registered = row(page, 0);
  await expect(registered.locator('[data-action="toggle"]')).toHaveCount(1);
  await expect(registered.locator(".cast-row__panel--identity")).toHaveCount(0);
  await expect(registered.locator('[data-action="toggle"]')).toContainText("ハンドアウト");
  await expect(registered.locator('[data-action="toggle"] small')).toHaveText("HANDOUT");

  const manual = row(page, 1);
  const buttons = manual.locator('.cast-row__actions [data-action="toggle"]');
  await expect(buttons).toHaveCount(2);
  await expect(buttons.nth(0)).toHaveAttribute("data-panel", "identity");
  await expect(buttons.nth(0)).toContainText("編集");
  await expect(buttons.nth(0).locator("small")).toHaveText("EDIT");
  await expect(buttons.nth(1)).toHaveAttribute("data-panel", "handout");
  // EDIT is to the left of HANDOUT, and both are before the arrows
  const lefts = await buttons.evaluateAll(items => items.map(item => item.getBoundingClientRect().left));
  expect(lefts[0]).toBeLessThan(lefts[1]);
  for (const panel of ["identity", "handout"]) {
    const controls = await toggle(page, 1, panel).getAttribute("aria-controls");
    expect(await page.locator(`#${controls}`).getAttribute("data-panel")).toBe(panel);
  }
  // the identity panel holds the picture, handle, name, styles, player and details; the handout panel holds the rest
  for (const field of ["manual-image-url", "manual-handle", "manual-name", "manual-styles", "manual-player", "manual-affiliation"]) {
    await expect(panelOf(page, 1, "identity").locator(`[data-field="${field}"]`)).toHaveCount(1);
    await expect(panelOf(page, 1, "handout").locator(`[data-field="${field}"]`)).toHaveCount(0);
  }
  for (const field of ["cast-no", "quote", "tagline", "description"]) {
    await expect(panelOf(page, 1, "handout").locator(`[data-field="${field}"]`)).toHaveCount(1);
    await expect(panelOf(page, 1, "identity").locator(`[data-field="${field}"]`)).toHaveCount(0);
  }
});

test("a manual cast added from the form opens only its handout panel, scrolled into view, at CAST No", async ({ page }) => {
  await openGenerator(page);
  for (const index of [0, 1, 2]) await addRegistered(page, index);
  await addManual(page, "追加した手動キャスト");
  await expectOnlyOpen(page, 3, "handout");
  await expect(panelOf(page, 3, "identity")).toBeHidden();
  await expect(row(page, 3).locator('[data-field="cast-no"]')).toBeFocused();
  // the opened row is inside the window
  const box = await row(page, 3).boundingBox();
  const height = page.viewportSize().height;
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeLessThan(height);
  // adding another one moves the open panel to it
  await addManual(page, "二人目の手動キャスト");
  await expectOnlyOpen(page, 4, "handout");
});

test("a row restored from a saved act (an empty manual row that is then filled) opens no panel", async ({ page }) => {
  await openGenerator(page);
  await addRegistered(page, 0);
  await toggle(page, 0, "handout").click();
  await expectOnlyOpen(page, 0, "handout");
  await page.evaluate(() => document.dispatchEvent(new CustomEvent("tnx:showcase-add-manual-cast")));
  await expect(row(page, 1)).toHaveAttribute("data-manual", "true");
  // the add does not touch the open panel of the other row, and the new row has none open
  await expect(panelOf(page, 1, "identity")).toBeHidden();
  await expect(panelOf(page, 1, "handout")).toBeHidden();
  await expect(toggle(page, 1, "identity")).toHaveAttribute("aria-expanded", "false");
  await expect(toggle(page, 1, "handout")).toHaveAttribute("aria-expanded", "false");
});

test("one panel is open in the whole list: opening one closes the other panel of the row and the panels of the other rows; the open button closes it", async ({ page }) => {
  await openGenerator(page);
  await addRegistered(page, 0);
  await addManual(page, "手動キャスト");
  await expectOnlyOpen(page, 1, "handout");

  await toggle(page, 1, "identity").click();
  await expectOnlyOpen(page, 1, "identity");
  await toggle(page, 0, "handout").click();
  await expectOnlyOpen(page, 0, "handout");
  await toggle(page, 1, "handout").click();
  await expectOnlyOpen(page, 1, "handout");
  await toggle(page, 1, "identity").click();
  await expectOnlyOpen(page, 1, "identity");
  // the open button closes it
  await toggle(page, 1, "identity").click();
  await expectOnlyOpen(page, 1, null);
  // the row's border says "open" only while a panel of it is open
  await toggle(page, 1, "handout").click();
  await expect(row(page, 1)).toHaveClass(/is-open/);
  await expect(row(page, 0)).not.toHaveClass(/is-open/);
  await toggle(page, 1, "handout").click();
  await expect(row(page, 1)).not.toHaveClass(/is-open/);
});

test("each panel ends with CLOSE: it closes the panel and puts the focus on the row's heading line", async ({ page }) => {
  await openGenerator(page);
  await addRegistered(page, 0);
  await addManual(page, "手動キャスト");
  // (the manual cast was just added, so its handout panel is already open: start with the identity panel)
  for (const [index, panel] of [[1, "identity"], [1, "handout"], [0, "handout"]]) {
    await toggle(page, index, panel).click();
    await expectOnlyOpen(page, index, panel);
    const close = panelOf(page, index, panel).locator('[data-action="close"]');
    await expect(close).toHaveText(/閉じる\s*CLOSE/);
    await expect(close.locator("small")).toHaveText("CLOSE");
    await close.click();
    await expectOnlyOpen(page, index, null);
    await expect(row(page, index).locator(".cast-row__main")).toBeFocused();
  }
});

test("opening and closing panels never loses what was typed or the picture of a manual cast", async ({ page }) => {
  await openGenerator(page);
  await addManual(page, "手動キャスト");
  await toggle(page, 0, "identity").click();
  const identity = panelOf(page, 0, "identity");
  await identity.locator('[data-field="manual-image-url"]').fill("https://example.invalid/own.webp");
  await identity.locator('[data-field="manual-handle"]').fill("手動ハンドル");
  await identity.locator('[data-field="manual-name"]').fill("直した名前");
  await identity.locator('[data-field="manual-styles"]').fill("カブト◎ / フェイト●");
  await identity.locator('[data-field="manual-player"]').fill("手動PL");
  await identity.locator("details.cast-row__more > summary").click();
  await identity.locator('[data-field="manual-affiliation"]').fill("所属X");
  await toggle(page, 0, "handout").click();
  const handout = panelOf(page, 0, "handout");
  await handout.locator('[data-field="cast-no"]').fill("4");
  await handout.locator('[data-field="quote"]').fill("共通");
  await handout.locator('[data-field="tagline"]').fill("一言");
  await handout.locator('[data-field="description"]').fill("ハンドアウトの本文");
  // another row's panel opens and closes, the identity panel opens again: nothing was lost
  await addRegistered(page, 0);
  await toggle(page, 1, "handout").click();
  await expectOnlyOpen(page, 1, "handout");
  await toggle(page, 0, "identity").click();
  await expectOnlyOpen(page, 0, "identity");
  await expect(identity.locator('[data-field="manual-image-url"]')).toHaveValue("https://example.invalid/own.webp");
  await expect(identity.locator('[data-field="manual-handle"]')).toHaveValue("手動ハンドル");
  await expect(identity.locator('[data-field="manual-name"]')).toHaveValue("直した名前");
  await expect(identity.locator('[data-field="manual-styles"]')).toHaveValue("カブト◎ / フェイト●");
  await expect(identity.locator('[data-field="manual-player"]')).toHaveValue("手動PL");
  await expect(identity.locator('[data-field="manual-affiliation"]')).toHaveValue("所属X");
  await expect(row(page, 0).locator("img.cast-row__thumb")).toHaveAttribute("src", "https://example.invalid/own.webp");
  await expect(row(page, 0).locator(".manual-image__preview")).toHaveAttribute("src", "https://example.invalid/own.webp");
  await toggle(page, 0, "handout").click();
  await expect(handout.locator('[data-field="cast-no"]')).toHaveValue("4");
  await expect(handout.locator('[data-field="quote"]')).toHaveValue("共通");
  await expect(handout.locator('[data-field="tagline"]')).toHaveValue("一言");
  await expect(handout.locator('[data-field="description"]')).toHaveValue("ハンドアウトの本文");
  await expect(row(page, 0).locator("[data-handout-badge]")).toHaveAttribute("data-state", "done");
});

test("the open panel follows its cast when the order changes (buttons, keyboard on the grip) and when another row is removed; removing the open row leaves none open", async ({ page }) => {
  await openGenerator(page);
  await addRegistered(page, 0);
  await addRegistered(page, 1);
  await addManual(page, "手動キャスト");
  await expect(row(page, 2).locator(".cast-row__name")).toHaveText("手動キャスト");
  await toggle(page, 2, "identity").click();
  await row(page, 2).locator('[data-field="manual-name"]').fill("入力中の名前");
  await expectOnlyOpen(page, 2, "identity");

  // up with the button: the row is re-rendered at its new place with the same panel open and the same text
  await row(page, 2).locator('[data-action="up"]').click();
  await expect(row(page, 1).locator(".cast-row__name")).toHaveText("入力中の名前");
  await expectOnlyOpen(page, 1, "identity");
  await expect(row(page, 1).locator('[data-field="manual-name"]')).toHaveValue("入力中の名前");
  // down, and the keyboard on the grip
  await row(page, 1).locator('[data-action="down"]').click();
  await expectOnlyOpen(page, 2, "identity");
  await row(page, 2).locator('[data-action="grip"]').focus();
  await page.keyboard.press("ArrowUp");
  await expect(row(page, 1).locator(".cast-row__name")).toHaveText("入力中の名前");
  await expectOnlyOpen(page, 1, "identity");

  // another row is removed: the open panel stays with its cast
  await row(page, 0).locator('[data-action="remove"]').click();
  await expect(row(page, 0).locator(".cast-row__name")).toHaveText("入力中の名前");
  await expectOnlyOpen(page, 0, "identity");
  await expect(row(page, 0).locator('[data-field="manual-name"]')).toHaveValue("入力中の名前");
  // the open row is removed: nothing is open, and the next row is not opened by mistake
  await row(page, 0).locator('[data-action="remove"]').click();
  await expect(page.locator("#selected-casts .cast-row")).toHaveCount(1);
  await expectOnlyOpen(page, 0, null);
});

test("registered casts: the handout panel opens, closes and keeps its fields as before", async ({ page }) => {
  await openGenerator(page);
  await addRegistered(page, 0);
  await addRegistered(page, 1);
  await expectOnlyOpen(page, 0, null);
  await toggle(page, 0, "handout").click();
  await expectOnlyOpen(page, 0, "handout");
  await row(page, 0).locator('[data-field="description"]').fill("本文0");
  await toggle(page, 1, "handout").click();
  await expectOnlyOpen(page, 1, "handout");
  await toggle(page, 0, "handout").click();
  await expectOnlyOpen(page, 0, "handout");
  await expect(row(page, 0).locator('[data-field="description"]')).toHaveValue("本文0");
  await toggle(page, 0, "handout").click();
  await expectOnlyOpen(page, 0, null);
});
