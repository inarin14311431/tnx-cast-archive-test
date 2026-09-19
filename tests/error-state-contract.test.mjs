import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const errorState = await read("js/error-state.js");
const archive = await read("js/archive.js");
const cast = await read("js/cast.js");
const castHtml = await read("cast.html");
const archiveEntryCss = await read("css-next/pages/archive-entry.css");
const castEntryCss = await read("css-next/pages/cast-entry.css");

test("error-state module exposes a message classifier, a retry renderer, and a safe-message marker", () => {
  assert.match(errorState, /export class AppError extends Error/);
  assert.match(errorState, /export function toUserFacingErrorMessage\(/);
  assert.match(errorState, /export function renderErrorState\(container,\s*\{\s*message,\s*onRetry\s*\}/);
  assert.match(errorState, /if \(error instanceof AppError\) return error\.message;/);
});

test("error-state renderer never interpolates a container without an explicit fallback message", () => {
  assert.match(errorState, /const FALLBACK_MESSAGE = /);
  assert.match(errorState, /message \|\| FALLBACK_MESSAGE/);
});

test("archive.js routes its DB-failure catch through the shared error-state helpers", () => {
  assert.match(archive, /from "\.\/error-state\.js\?v=1"/);
  assert.match(archive, /const message = toUserFacingErrorMessage\(error\);/);
  assert.match(archive, /renderErrorState\(castGrid,\s*\{\s*message,\s*onRetry:\s*loadCharacters\s*\}\)/);
  assert.doesNotMatch(archive, /データベースへの接続に失敗しました。/);
});

test("cast.js never forwards a raw Supabase/PostgREST error.message to the UI", () => {
  assert.match(cast, /from "\.\/error-state\.js\?v=1"/);
  assert.match(cast, /showError\(toUserFacingErrorMessage\(error\), loadCharacter\)/);
  assert.doesNotMatch(cast, /error instanceof Error\s*\n?\s*\?\s*error\.message/);
  assert.match(cast, /throw new AppError\("キャストIDが指定されていません。"\);/);
  assert.match(cast, /throw new AppError\("指定されたキャストは存在しません。"\);/);
});

test("cast.js retry renders into a container that can host the retry button markup", () => {
  assert.match(cast, /renderErrorState\(errorBody,\s*\{\s*message,\s*onRetry\s*\}\)/);
  assert.match(castHtml, /<div id="cast-error-message"><\/div>/);
});

test("the error-state component stylesheet is wired into both the archive and cast entries", () => {
  assert.match(archiveEntryCss, /@import url\("\.\.\/components\/error-state\.css\?v=1"\) layer\(archive-components\);/);
  assert.match(castEntryCss, /@import url\("\.\.\/components\/error-state\.css\?v=1"\) layer\(cast-components\);/);
});
