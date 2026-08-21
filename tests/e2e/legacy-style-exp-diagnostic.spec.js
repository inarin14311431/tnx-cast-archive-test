import { test, expect } from "@playwright/test";

const TARGET = "https://character-sheets.appspot.com/tnx/edit.html?key=ahVzfmNoYXJhY3Rlci1zaGVldHMtbXByFwsSDUNoYXJhY3RlckRhdGEYx5G_6gQM";

test("diagnose transferred legacy style experience", async ({ page }) => {
  await page.goto(TARGET, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await expect(page).toHaveTitle(/トーキョーN◎VA/i);
  await page.waitForTimeout(1500);

  const diagnostic = await page.evaluate(() => {
    const controls = [...document.querySelectorAll("input,select,textarea")];
    const style = controls
      .filter(el => String(el.id || el.name || "").includes("superhumanskills"))
      .map(el => ({
        key: el.id || el.name || "",
        value: el.type === "checkbox" || el.type === "radio" ? String(el.checked) : String(el.value ?? "")
      }));
    const experience = controls
      .filter(el => /exp|experience/i.test(String(el.id || el.name || "")))
      .map(el => ({ key: el.id || el.name || "", value: String(el.value ?? "") }));
    return { style, experience };
  });

  console.log(`LEGACY_STYLE_DIAGNOSTIC=${JSON.stringify(diagnostic)}`);
  expect(diagnostic.style.length).toBeGreaterThan(0);
});
