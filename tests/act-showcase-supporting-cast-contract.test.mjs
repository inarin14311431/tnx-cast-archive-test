import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("generator loads guest persistence before dynamic publishing", async () => {
  const loader = await read("js/showcase-generator-loader.js");
  const guestIndex = loader.indexOf("showcase-guests.js");
  const publishIndex = loader.indexOf("showcase-dynamic-publish-v2.js");
  assert.ok(guestIndex >= 0 && publishIndex > guestIndex);
  assert.match(loader, /Guest registration is initialized before the dynamic publisher/);
});

test("guest editor keeps supporting cast separate from participant history", async () => {
  const js = await read("js/showcase-guests.js");
  assert.match(js, /const MAX_GUESTS = 12/);
  assert.match(js, /replace_act_showcase_guests_for_current_user/);
  assert.match(js, /act-guests/);
  assert.match(js, /ゲストはハンドアウトのアサイン対象や参加履歴には含まれません/);
  assert.match(js, /image\/jpeg/);
  assert.match(js, /image\/png/);
  assert.match(js, /image\/webp/);
});

test("guest database API only exposes guests for public showcases", async () => {
  const sql = await read("supabase/21_act_showcase_guests.sql");
  assert.match(sql, /alter table public\.act_showcase_guests enable row level security/);
  assert.match(sql, /replace_act_showcase_guests_for_current_user/);
  assert.match(sql, /get_public_act_showcase_guests/);
  assert.match(sql, /join public\.acts a on a\.slug = g\.showcase_slug and a\.published_by = g\.owner_id/);
  assert.match(sql, /showcase_public,false\) = true/);
  assert.match(sql, /revoke all on table public\.act_showcase_guests from anon/);
});

test("public showcase loads supporting cast after the canonical story layers", async () => {
  const html = await read("act-showcase.html");
  const writingCss = html.indexOf("act-showcase-writing-patterns.css");
  const supportingCss = html.indexOf("act-showcase-supporting-cast.css");
  const pageJs = html.indexOf("act-showcase-page.js");
  const supportingJs = html.indexOf("act-showcase-supporting-cast.js");
  assert.ok(writingCss >= 0 && supportingCss > writingCss);
  assert.ok(pageJs >= 0 && supportingJs > pageJs);
});

test("assigned style repair prefers the first matching style and preserves duplicate distinction", async () => {
  const js = await read("js/act-showcase-supporting-cast.js");
  const css = await read("css-next/pages/act-showcase-supporting-cast.css");
  assert.match(js, /handoutRole \|\| style\?\.handout_role/);
  assert.match(js, /let found = false/);
  assert.match(js, /is-role-primary/);
  assert.match(js, /is-role-duplicate/);
  assert.match(css, /is-assigned-style/);
  assert.match(css, /ASSIGNED/);
  assert.doesNotMatch(css, /!important/);
});

test("final briefing and supporting guests are rendered as separate presentation roles", async () => {
  const js = await read("js/act-showcase-supporting-cast.js");
  assert.match(js, /FINAL BRIEFING/);
  assert.match(js, /GUEST CAST/);
  assert.match(js, /SUPPORTING CHANNEL \/\/ GUEST FILES/);
  assert.match(js, /renderPosterGuests/);
  assert.match(js, /renderSummaryGuests/);
});
