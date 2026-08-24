import { test, expect } from "@playwright/test";
import { getTestCastId, hasAuthCredentials } from "./helpers.js";

const inspectVisibleThemeControls = page => page.evaluate(() => {
  const visible = element => {
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
  };
  const controls = [...document.querySelectorAll('[data-theme-control="1"]')].filter(visible);
  return {
    count: controls.length,
    failures: controls.map(element => {
      const style = getComputedStyle(element);
      return {
        label: element.id || element.className || element.textContent.trim().slice(0, 40),
        borderWidth: style.borderTopWidth,
        outline: style.outlineStyle,
        layers: (style.backgroundImage.match(/linear-gradient/g) || []).length,
        glow: style.boxShadow
      };
    }).filter(item => item.borderWidth !== "2px" || item.outline !== "solid" || item.layers < 2 || item.glow === "none")
  };
});

test("seven-color gaming theme renders and persists across desktop and mobile screens", async ({ page }) => {
  await page.goto("/index.html");
  await page.locator("#theme-select").selectOption("spectrum-neon");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "spectrum-neon");
  const themeState = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const title = getComputedStyle(document.querySelector(".site-title__archive"));
    const bodyBefore = getComputedStyle(document.body, "::before");
    const bodyAfter = getComputedStyle(document.body, "::after");
    const themePicker = getComputedStyle(document.querySelector(".theme-picker"));
    const panel = getComputedStyle(document.querySelector(".archive-controls"));
    const button = getComputedStyle(document.querySelector("#archive-reset"));
    return {
      stored: localStorage.getItem("tnx-cast-site-theme"),
      colors: ["red", "orange", "yellow", "green", "cyan", "blue", "violet"]
        .map(name => root.getPropertyValue(`--neon-${name}`).trim()),
      background: getComputedStyle(document.body).backgroundImage,
      titleShadow: title.textShadow,
      scanOverlay: bodyBefore.backgroundImage,
      rgbRail: bodyAfter.backgroundImage,
      gamingControlGlow: themePicker.boxShadow,
      panelBorderWidth: panel.borderTopWidth,
      panelOutline: panel.outlineStyle,
      panelGlow: panel.boxShadow,
      buttonBorderWidth: button.borderTopWidth,
      buttonOutline: button.outlineStyle,
      buttonLayers: button.backgroundImage,
      buttonGlow: button.boxShadow
    };
  });

  expect(themeState.stored).toBe("spectrum-neon");
  expect(themeState.colors).toHaveLength(7);
  expect(new Set(themeState.colors).size).toBe(7);
  expect(themeState.background.match(/radial-gradient/g)?.length).toBe(7);
  expect(themeState.titleShadow).not.toBe("none");
  expect(themeState.scanOverlay).toContain("repeating-linear-gradient");
  expect(themeState.rgbRail).toContain("linear-gradient");
  expect(themeState.gamingControlGlow).not.toBe("none");
  expect(themeState.panelBorderWidth).toBe("2px");
  expect(themeState.panelOutline).toBe("solid");
  expect(themeState.panelGlow).not.toBe("none");
  expect(themeState.buttonBorderWidth).toBe("2px");
  expect(themeState.buttonOutline).toBe("solid");
  expect(themeState.buttonLayers.match(/linear-gradient/g)?.length).toBeGreaterThanOrEqual(2);
  expect(themeState.buttonGlow).not.toBe("none");

  const indexControls = await inspectVisibleThemeControls(page);
  expect(indexControls.count).toBeGreaterThan(1);
  expect(indexControls.failures).toEqual([]);

  for (const path of ["/login.html", "/cast.html", "/sheet-mobile-new.html", "/troop.html"]) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "spectrum-neon");
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--neon-violet").trim())).not.toBe("");
  }
});

test("Neon Sign covers page-specific and dynamically inserted link-style buttons", async ({ page }) => {
  await page.goto("/index.html");
  await page.locator("#theme-select").selectOption("spectrum-neon");

  for (const path of ["/transfer.html", "/mobile-transfer.html"]) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "spectrum-neon");
    const controls = await inspectVisibleThemeControls(page);
    expect(controls.count, `${path} should expose themed controls`).toBeGreaterThan(1);
    expect(controls.failures, `${path} has controls outside the final Neon Sign layer`).toEqual([]);
  }

  await page.goto("/login.html");
  await page.evaluate(() => {
    const link = document.createElement("a");
    link.id = "dynamic-theme-control-probe";
    link.className = "troop-primary-action";
    link.href = "#probe";
    link.textContent = "DYNAMIC CONTROL";
    document.body.append(link);
  });
  const probe = page.locator("#dynamic-theme-control-probe");
  await expect(probe).toHaveAttribute("data-theme-control", "1");
  const style = await probe.evaluate(element => {
    const computed = getComputedStyle(element);
    return {
      borderWidth: computed.borderTopWidth,
      outline: computed.outlineStyle,
      layers: (computed.backgroundImage.match(/linear-gradient/g) || []).length,
      glow: computed.boxShadow
    };
  });
  expect(style.borderWidth).toBe("2px");
  expect(style.outline).toBe("solid");
  expect(style.layers).toBeGreaterThanOrEqual(2);
  expect(style.glow).not.toBe("none");
});

test("Neon Sign remains final after authenticated mobile editor styles initialize", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E credentials are not configured.");
  await page.goto("/index.html");
  await page.locator("#theme-select").selectOption("spectrum-neon");
  await page.goto(`/sheet-mobile.html?id=${encodeURIComponent(getTestCastId())}`);

  await expect(page).not.toHaveURL(/login\.html/);
  await expect(page.locator("#mobile-save")).toBeVisible();
  await expect(page.locator('.mobile-sheet-nav [data-theme-control="1"]')).toHaveCount(9);
  const controls = await inspectVisibleThemeControls(page);
  expect(controls.count).toBeGreaterThan(10);
  expect(controls.failures).toEqual([]);
});
