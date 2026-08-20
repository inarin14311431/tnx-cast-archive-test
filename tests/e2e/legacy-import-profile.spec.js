import { test, expect } from "@playwright/test";
import { getTestCastId, hasAuthCredentials, waitForEditorReady } from "./helpers.js";

test("旧JSON取込はパーソナル・ライフパスと★取得技能を反映する", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");

  await page.goto(`/sheet.html?id=${encodeURIComponent(getTestCastId())}`);
  await waitForEditorReady(page);

  const legacy = {
    base: {
      name: "IMPORT TEST",
      age: "31",
      sex: "X",
      height: "170cm",
      weight: "60kg",
      eyes: "青",
      hair: "黒",
      skin: "白",
      birth: "N◎VA",
      memoir: "取込プロフィール",
      lifepath: {
        experience: "化学汚染地",
        environment: "企業",
        encounter: "ビジネス"
      }
    },
    skills1: [
      { name: "★射撃", level: 1, s: 1 }
    ]
  };

  await page.locator("#legacy-import-open").click();
  await page.locator("#legacy-import-json").fill(JSON.stringify(legacy));
  await page.locator("#legacy-import-apply").click();
  await expect(page.locator("#legacy-import-message")).toContainText("取込が完了", { timeout: 15000 });

  await expect(page.locator("#age")).toHaveValue("31");
  await expect(page.locator("#gender")).toHaveValue("X");
  await expect(page.locator("#height")).toHaveValue("170cm");
  await expect(page.locator("#weight")).toHaveValue("60kg");
  await expect(page.locator("#eyes")).toHaveValue("青");
  await expect(page.locator("#hair")).toHaveValue("黒");
  await expect(page.locator("#skin")).toHaveValue("白");
  await expect(page.locator("#life-path-origin")).toHaveValue("化学汚染地");
  await expect(page.locator("#life-path-experience")).toHaveValue("企業");
  await expect(page.locator("#life-path-encounter")).toHaveValue("ビジネス");
  await expect(page.locator("#profile")).toHaveValue(/取込プロフィール/);
  await expect(page.locator("#profile")).toHaveValue(/出身：N◎VA/);

  const shooting = page.locator('#general-skills tr[data-skill-key]:has(input[data-f="name"][value="射撃"])').first();
  await expect(shooting.locator('[data-f="free_level"]')).toHaveValue("1");
});
