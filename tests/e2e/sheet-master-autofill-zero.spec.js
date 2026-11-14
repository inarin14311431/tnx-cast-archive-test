import { test, expect } from "@playwright/test";

// SKD・OFC補完 (js/sheet-master-autofill.js): the number fields a new outfit row starts with at 0 (常備化, 制御値, CS修正) are filled from the master
// even though they say "0", a value already typed in is never overwritten, and a master 0 gives nothing. The real module runs over rows drawn by the
// editor's own renderer; only js/supabase-client.js is replaced by a stub that answers the privileged-tools check and the master tables.

const HOST = "/tests/e2e/fixtures/master-autofill-host.html";

const OFC_MASTER = [
  { name: "アサルトナーブス", site_category: "cyberware", purchase_target: "12", permanent_cost: "4", electronic_control: "16", raw_data: {} },
  { name: "テストアーマー", site_category: "armor", purchase_target: "6", permanent_cost: "0", control_value: "5", raw_data: {} },
  { name: "テストトロン", site_category: "tron", purchase_target: "7", permanent_cost: "3", raw_data: { cs_value: "2" } },
  { name: "ゼロだけのウェア", site_category: "cyberware", purchase_target: "8", permanent_cost: "0", electronic_control: "9", raw_data: {} },
  // two masters of one name: the row's 常備化 is still 0, so only the typed purchase value tells them apart
  { name: "二つあるウェア", site_category: "cyberware", purchase_target: "20", permanent_cost: "6", electronic_control: "11", raw_data: {} },
  { name: "二つあるウェア", site_category: "cyberware", purchase_target: "99", permanent_cost: "0", raw_data: {} },
  // a candidate whose 常備化 is 0 must not win only because the row's untouched 0 "matches" it
  { name: "同じ名前の候補", site_category: "cyberware", permanent_cost: "4", purchase_target: "30", electronic_control: "13", concealment: "2", attack: "1", raw_data: {} },
  { name: "同じ名前の候補", site_category: "cyberware", permanent_cost: "0", raw_data: {} }
];

async function openHost(page) {
  await page.route("**/js/supabase-client.js*", route => route.fulfill({
    contentType: "text/javascript",
    body: `
      const tables = { ofc_master: ${JSON.stringify(OFC_MASTER)}, skd_master: [] };
      const query = table => {
        const answer = { data: tables[table] ?? [], error: null };
        const chain = { select: () => chain, range: () => chain, order: () => chain, then: (resolve, reject) => Promise.resolve(answer).then(resolve, reject) };
        return chain;
      };
      export const supabase = { rpc: async () => ({ data: true, error: null }), from: query };`
  }));
  await page.goto(HOST);
  await page.evaluate(async () => {
    const { renderOutfitEditor } = await import("/js/sheet-outfit-renderer.js");
    const { createBlankOutfit } = await import("/js/sheet-row-factory.js");
    const row = (category, name, overrides = {}) => ({ ...createBlankOutfit(), category, name, ...overrides });
    document.querySelector("#outfit-list").innerHTML = renderOutfitEditor([
      row("cyberware", "アサルトナーブス"),
      row("cyberware", "アサルトナーブス", { experience_cost: 2, purchase_value: "5" }),
      row("armor", "テストアーマー"),
      row("tron", "テストトロン"),
      row("cyberware", "ゼロだけのウェア"),
      row("cyberware", "二つあるウェア", { purchase_value: "20" }),
      row("cyberware", "同じ名前の候補")
    ]);
    window.__autofillAlerts = [];
    window.alert = message => window.__autofillAlerts.push(message);
    await import("/js/sheet-master-autofill.js");
  });
  const button = page.locator("#master-autofill-button");
  await expect(button).toBeVisible();
  return button;
}

const outfit = (page, index) => page.locator("#outfit-list [data-outfit-key]").nth(index);
const field = (page, index, name) => outfit(page, index).locator(`[data-o="${name}"]`);

test("a new row with only a name gets 常備化, 購入 and 電制 from the master, although 常備化 starts at 0", async ({ page }) => {
  const button = await openHost(page);
  await expect(field(page, 0, "experience_cost")).toHaveValue("0");
  await button.click();
  await expect.poll(() => page.evaluate(() => window.__autofillAlerts.length)).toBe(1);
  await expect(field(page, 0, "experience_cost")).toHaveValue("4");
  await expect(field(page, 0, "purchase_value")).toHaveValue("12");
  await expect(outfit(page, 0).locator('[data-ofc="electronic_control"]')).toHaveValue("16");
  await expect(field(page, 0, "experience_cost")).toHaveClass(/master-autofill-updated/);
});

test("a value that is already typed in (not 0) is never overwritten", async ({ page }) => {
  const button = await openHost(page);
  await button.click();
  await expect.poll(() => page.evaluate(() => window.__autofillAlerts.length)).toBe(1);
  await expect(field(page, 1, "experience_cost")).toHaveValue("2");
  await expect(field(page, 1, "purchase_value")).toHaveValue("5");
  await expect(field(page, 1, "experience_cost")).not.toHaveClass(/master-autofill-updated/);
});

test("制御値 and CS修正, which start at 0 too, are filled from the master (the editor's data-o control_modifier / cs_modifier)", async ({ page }) => {
  const button = await openHost(page);
  await expect(field(page, 2, "control_modifier")).toHaveValue("0");
  await expect(field(page, 3, "cs_modifier")).toHaveValue("0");
  await button.click();
  await expect.poll(() => page.evaluate(() => window.__autofillAlerts.length)).toBe(1);
  await expect(field(page, 2, "control_modifier")).toHaveValue("5");
  await expect(field(page, 3, "cs_modifier")).toHaveValue("2");
  await expect(field(page, 3, "experience_cost")).toHaveValue("3");
});

test("a master 0 gives nothing: the field stays 0 and is not marked as filled, while the other fields are still filled", async ({ page }) => {
  const button = await openHost(page);
  await button.click();
  await expect.poll(() => page.evaluate(() => window.__autofillAlerts.length)).toBe(1);
  // テストアーマー: 常備化 0 in the master
  await expect(field(page, 2, "experience_cost")).toHaveValue("0");
  await expect(field(page, 2, "experience_cost")).not.toHaveClass(/master-autofill-updated/);
  await expect(field(page, 2, "purchase_value")).toHaveValue("6");
  // ゼロだけのウェア
  await expect(field(page, 4, "experience_cost")).toHaveValue("0");
  await expect(field(page, 4, "experience_cost")).not.toHaveClass(/master-autofill-updated/);
  await expect(outfit(page, 4).locator('[data-ofc="electronic_control"]')).toHaveValue("9");
  // no master 制御値 at all: 制御値 stays 0
  await expect(field(page, 2, "control_modifier")).toHaveValue("5");
});

test("the duplicate scoring ignores the untouched 0 of 常備化: a candidate whose 常備化 is 0 does not win because it matches the 0", async ({ page }) => {
  const button = await openHost(page);
  await button.click();
  await expect.poll(() => page.evaluate(() => window.__autofillAlerts.length)).toBe(1);
  // 二つあるウェア: the typed 購入 20 picks the first master (常備化 6)
  await expect(field(page, 5, "experience_cost")).toHaveValue("6");
  await expect(outfit(page, 5).locator('[data-ofc="electronic_control"]')).toHaveValue("11");
  // 同じ名前の候補: nothing typed, the fuller master wins over the one that only matches 0 with 0
  await expect(field(page, 6, "experience_cost")).toHaveValue("4");
  await expect(outfit(page, 6).locator('[data-ofc="electronic_control"]')).toHaveValue("13");
  const alerts = await page.evaluate(() => window.__autofillAlerts);
  expect(alerts[0]).toContain("アウトフィット：");
});
