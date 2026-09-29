import test from "node:test";
import assert from "node:assert/strict";
import { supabase } from "../js/supabase-client.js";

const stubLocation = { href: "https://example.test/transfer.html", search: "" };
globalThis.window = globalThis.window || {};
globalThis.window.location = globalThis.window.location || stubLocation;
globalThis.window.setTimeout = globalThis.window.setTimeout || ((...args) => setTimeout(...args));
globalThis.window.clearTimeout = globalThis.window.clearTimeout || ((...args) => clearTimeout(...args));
globalThis.location = globalThis.location || stubLocation;

await import(`../js/archive-id-code.js?test=${Date.now()}`);
const { format } = window.TNXArchiveId;

const {
  resolveTransferSourceId,
  isDisplayCode,
  DISPLAY_CODE_NOT_OWNED_MESSAGE
} = await import(`../js/tnx-direct-transfer-data.js?test=${Date.now()}`);

function mockSession(user) {
  supabase.auth.getSession = async () => ({ data: { session: user ? { user } : null }, error: null });
}

function mockOwnedCharacters(rows) {
  supabase.from = table => {
    assert.equal(table, "characters");
    return {
      select() { return this; },
      eq(column, value) {
        this._rows = rows.filter(row => row[column] === value);
        return this;
      },
      then(resolve, reject) {
        Promise.resolve({ data: this._rows ?? [], error: null }).then(resolve, reject);
      }
    };
  };
}

test("internal id (TNX-数字) passes through unchanged, uppercased", async () => {
  assert.equal(await resolveTransferSourceId("tnx-000117"), "TNX-000117");
});

test("URL with ?id= resolves to the internal id it carries", async () => {
  assert.equal(await resolveTransferSourceId("https://example.test/cast.html?id=TNX-000117"), "TNX-000117");
});

test("unrecognized text resolves to an empty string", async () => {
  assert.equal(await resolveTransferSourceId("not a valid anything"), "");
});

test("empty input resolves to an empty string", async () => {
  assert.equal(await resolveTransferSourceId("   "), "");
});

test("isDisplayCode recognizes only the TNX-XXXX-XXXX shape", () => {
  assert.equal(isDisplayCode("TNX-K9F2-3G7H"), true);
  assert.equal(isDisplayCode("tnx-k9f2-3g7h"), true);
  assert.equal(isDisplayCode("TNX-000117"), false);
  assert.equal(isDisplayCode("TNX-AAAA-AAAA-EXTRA"), false);
  assert.equal(isDisplayCode("TNX-AA0A-AAAA"), false, "0 is excluded from the display-code alphabet");
  assert.equal(isDisplayCode("TNX-AAIA-AAAA"), false, "I is excluded from the display-code alphabet");
});

test("display code resolves to the matching internal id among the current user's own casts", async () => {
  mockSession({ id: "user-1" });
  mockOwnedCharacters([
    { owner_id: "user-1", public_id: "TNX-000117" },
    { owner_id: "user-1", public_id: "TNX-000200" }
  ]);
  const displayCode = format("TNX-000200");
  assert.equal(await resolveTransferSourceId(displayCode), "TNX-000200");
});

test("display code not among the current user's own casts throws a clear, non-leaking error", async () => {
  mockSession({ id: "user-1" });
  mockOwnedCharacters([{ owner_id: "user-1", public_id: "TNX-000117" }]);
  const someoneElsesDisplayCode = format("TNX-999999");
  await assert.rejects(
    () => resolveTransferSourceId(someoneElsesDisplayCode),
    { message: DISPLAY_CODE_NOT_OWNED_MESSAGE }
  );
});

test("display code while signed out throws the same not-owned error (no reverse lookup)", async () => {
  mockSession(null);
  await assert.rejects(
    () => resolveTransferSourceId(format("TNX-000117")),
    { message: DISPLAY_CODE_NOT_OWNED_MESSAGE }
  );
});
