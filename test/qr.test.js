const assert = require("node:assert/strict");
const test = require("node:test");
const { generateQrSvg, validateQrText } = require("../src/tools/qr");

test("validateQrText rejects empty input", () => {
  assert.throws(() => validateQrText(""), /QR_TEXT_REQUIRED/);
  assert.throws(() => validateQrText("   "), /QR_TEXT_REQUIRED/);
});

test("validateQrText rejects input longer than 2048 chars", () => {
  assert.throws(() => validateQrText("x".repeat(2049)), /QR_TEXT_TOO_LONG/);
});

test("validateQrText trims valid input", () => {
  assert.equal(validateQrText("  https://example.com  "), "https://example.com");
});

test("generateQrSvg returns SVG and filename", async () => {
  const fakeQr = {
    async toString(text, options) {
      assert.equal(text, "hello");
      assert.equal(options.type, "svg");
      return "<svg><path d=\"M0 0h1v1z\"/></svg>";
    }
  };

  const result = await generateQrSvg("hello", fakeQr);

  assert.equal(result.filename, "qr-code.svg");
  assert.match(result.svg, /^<svg/);
});

test("generateQrSvg maps generator failures to QR_GENERATION_FAILED", async () => {
  const fakeQr = {
    async toString() {
      throw new Error("library failed");
    }
  };

  await assert.rejects(() => generateQrSvg("hello", fakeQr), /QR_GENERATION_FAILED/);
});
