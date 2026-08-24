import { test, expect } from "@playwright/test";

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

  for (const path of ["/login.html", "/cast.html", "/sheet-mobile-new.html", "/troop.html"]) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "spectrum-neon");
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--neon-violet").trim())).not.toBe("");
  }
});
