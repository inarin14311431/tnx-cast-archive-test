import test from "node:test";
import assert from "node:assert/strict";
import { getPublicIdParam } from "../js/public-id-param.js";

test("getPublicIdParam reads the id query parameter", () => {
  assert.equal(getPublicIdParam("?id=TNX-000060"), "TNX-000060");
});

test("getPublicIdParam trims surrounding whitespace", () => {
  assert.equal(getPublicIdParam("?id=%20%20TNX-000060%20%20"), "TNX-000060");
});

test("getPublicIdParam returns an empty string when the id parameter is missing", () => {
  assert.equal(getPublicIdParam("?other=1"), "");
  assert.equal(getPublicIdParam(""), "");
});

test("getPublicIdParam returns an empty string for a whitespace-only id", () => {
  assert.equal(getPublicIdParam("?id=%20%20%20"), "");
});

test("getPublicIdParam accepts an explicit search string instead of relying on the global location", () => {
  assert.equal(getPublicIdParam("?id=TNX-000091&mobile=1"), "TNX-000091");
});
