const assert = require("node:assert/strict");
const test = require("node:test");
const {
  parsePageRanges,
  parseRangeGroups,
  pageNumbersToIndexes
} = require("../src/tools/pdf/pageRanges");

test("parsePageRanges accepts comma separated pages and ranges", () => {
  assert.deepEqual(parsePageRanges("1,3-5,7", 10), [1, 3, 4, 5, 7]);
});

test("parsePageRanges trims whitespace and removes duplicates", () => {
  assert.deepEqual(parsePageRanges(" 1, 2,2, 3-4 ", 5), [1, 2, 3, 4]);
});

test("parsePageRanges rejects empty input", () => {
  assert.throws(() => parsePageRanges("", 5), /PDF_RANGE_REQUIRED/);
});

test("parsePageRanges rejects malformed ranges", () => {
  assert.throws(() => parsePageRanges("1--3", 5), /PDF_RANGE_INVALID/);
  assert.throws(() => parsePageRanges("3-1", 5), /PDF_RANGE_INVALID/);
  assert.throws(() => parsePageRanges("abc", 5), /PDF_RANGE_INVALID/);
});

test("parsePageRanges rejects pages outside document bounds", () => {
  assert.throws(() => parsePageRanges("0", 5), /PDF_RANGE_OUT_OF_BOUNDS/);
  assert.throws(() => parsePageRanges("6", 5), /PDF_RANGE_OUT_OF_BOUNDS/);
});

test("parseRangeGroups accepts semicolon separated split groups", () => {
  assert.deepEqual(parseRangeGroups("1-2;3;4-5", 5), [
    [1, 2],
    [3],
    [4, 5]
  ]);
});

test("pageNumbersToIndexes converts 1-based pages to 0-based indexes", () => {
  assert.deepEqual(pageNumbersToIndexes([1, 3, 5]), [0, 2, 4]);
});
