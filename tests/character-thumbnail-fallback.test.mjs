import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const archiveSource = await readFile(new URL("../js/archive.js", import.meta.url), "utf8");
const sheetImageSource = await readFile(new URL("../js/sheet-image.js", import.meta.url), "utf8");
const generatorSource = await readFile(new URL("../js/showcase-generator-v3.js", import.meta.url), "utf8");

// Card list locations must fall back to the full-size image_url whenever image_thumbnail_url is
// empty (existing characters have none until their photo is next re-uploaded - see
// docs/CURRENT_STATE.md). Verified as plain source-text assertions since these are simple string
// template functions with no branching worth extracting and executing.
test("archive card list falls back from image_thumbnail_url to image_url and no longer calls the retired Supabase transform helper", () => {
  assert.match(archiveSource, /character\.image_thumbnail_url \|\| character\.image_url \|\| "\.\/assets\/placeholders\/scan-failed\.webp"/);
  assert.doesNotMatch(archiveSource, /toThumbnailUrl/);
  assert.match(archiveSource, /image_url, image_thumbnail_url, summary, updated_at/);
});

test("showcase generator's three per-character card renders all fall back from image_thumbnail_url to image_url", () => {
  const matches = [...generatorSource.matchAll(/character\.image_thumbnail_url \|\| character\.image_url \|\| "\.\/assets\/placeholders\/scan-failed\.webp"/g)];
  assert.equal(matches.length, 3, "expected the library picker, selected-cast preview and published output cast card to all use the fallback");
  assert.match(generatorSource, /image_url, image_thumbnail_url, summary, age, gender, visibility, updated_at/);
});

// Extracts and runs the real column-fallback helpers (not hand-copied) against a fake Supabase
// client, so this tracks the shipped retry decision instead of a duplicate of it. This matters
// because migration 48 (image_thumbnail_url) is committed to the repo but not yet applied to the
// shared verification/production database - selecting the column against the live schema would
// otherwise fail the whole query, breaking the archive list and the image editor entirely until
// the migration is applied.
function extractBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `marker not found: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `end marker not found after ${startMarker}: ${endMarker}`);
  return source.slice(start, end);
}

function fakeSupabase(missingColumn) {
  const calls = [];
  return {
    calls,
    from(table) {
      return {
        select(columns) {
          calls.push(columns.replace(/\s+/g, " ").trim());
          const usesThumbnailColumn = columns.includes("image_thumbnail_url");
          const chain = {
            eq() { return chain; },
            order() {
              if (usesThumbnailColumn && missingColumn) {
                return Promise.resolve({ data: null, error: { message: `column ${table}.image_thumbnail_url does not exist` } });
              }
              return Promise.resolve({ data: [{ id: "ok", from: table }], error: null });
            },
            maybeSingle() {
              if (usesThumbnailColumn && missingColumn) {
                return Promise.resolve({ data: null, error: { message: `Could not find the 'image_thumbnail_url' column of '${table}' in the schema cache` } });
              }
              return Promise.resolve({ data: { id: "ok", from: table }, error: null });
            }
          };
          return chain;
        }
      };
    }
  };
}

function loadQueryPublicCharacters(supabase) {
  const body = extractBetween(archiveSource, "async function queryPublicCharacters", "function isMissingColumnError") +
    extractBetween(archiveSource, "function isMissingColumnError", "function populateFilters");
  const columns = extractBetween(archiveSource, "const FULL_CHARACTER_COLUMNS", "const ALLOWED_PAGE_SIZES");
  const factory = new Function("supabase", `${columns}\n${body}\nreturn queryPublicCharacters;`);
  return factory(supabase);
}

test("archive.js retries with the compatible column set when image_thumbnail_url is not yet in the live schema", async () => {
  const supabase = fakeSupabase(true);
  const queryPublicCharacters = loadQueryPublicCharacters(supabase);

  const result = await queryPublicCharacters();
  assert.equal(result.error, null, "should have transparently retried instead of surfacing the missing-column error");
  assert.deepEqual(result.data, [{ id: "ok", from: "characters" }]);
  assert.equal(supabase.calls.length, 2, "should have tried the full column set once, then the fallback once");
  assert.match(supabase.calls[0], /image_thumbnail_url/);
  assert.doesNotMatch(supabase.calls[1], /image_thumbnail_url/);
});

test("archive.js does not retry when the full column set already succeeds", async () => {
  const supabase = fakeSupabase(false);
  const queryPublicCharacters = loadQueryPublicCharacters(supabase);

  const result = await queryPublicCharacters();
  assert.equal(result.error, null);
  assert.equal(supabase.calls.length, 1, "should not retry when the first query already succeeds");
});

test("sheet-image.js retries with the compatible column set when image_thumbnail_url is not yet in the live schema", async () => {
  const body = extractBetween(sheetImageSource, "async function queryOwnedCharacter", "function isMissingColumnError") +
    extractBetween(sheetImageSource, "function isMissingColumnError", "async function handleFileSelection");
  const supabase = fakeSupabase(true);
  const currentUser = { id: "owner-1" };
  const factory = new Function("supabase", "currentUser", `${body}\nreturn queryOwnedCharacter;`);
  const queryOwnedCharacter = factory(supabase, currentUser);

  const result = await queryOwnedCharacter("public-id-1");
  assert.equal(result.error, null, "should have transparently retried instead of surfacing the missing-column error");
  assert.deepEqual(result.data, { id: "ok", from: "characters" });
  assert.equal(supabase.calls.length, 2);
  assert.match(supabase.calls[0], /image_thumbnail_url/);
  assert.doesNotMatch(supabase.calls[1], /image_thumbnail_url/);
});
