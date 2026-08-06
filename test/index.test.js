const test = require("node:test");
const assert = require("node:assert/strict");
const { extractImageUrl, parseSeed } = require("../index.js");

test("parseSeed returns undefined when no seed is provided", () => {
  assert.equal(parseSeed(""), undefined);
  assert.equal(parseSeed("   "), undefined);
});

test("parseSeed returns safe integer values", () => {
  assert.equal(parseSeed("42"), 42);
  assert.equal(parseSeed("-7"), -7);
});

test("parseSeed rejects non-integer and unsafe values", () => {
  for (const seed of ["1.5", "nexus-v2", "1e3", "9007199254740992"]) {
    assert.throws(() => parseSeed(seed));
  }
});

test("extractImageUrl supports FAL response shapes", () => {
  assert.equal(extractImageUrl({ images: [{ url: "https://example.test/image.png" }] }), "https://example.test/image.png");
  assert.equal(extractImageUrl({ image: { url: "https://example.test/image.png" } }), "https://example.test/image.png");
  assert.equal(extractImageUrl({}), "");
});
