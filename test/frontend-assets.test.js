const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("CSS preserves hidden attribute behavior for custom display classes", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "public", "styles.css"), "utf8");

  assert.match(css, /\[hidden\]\s*\{[^}]*display:\s*none\s*!important;/s);
});

test("converter view starts with status and download controls hidden", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");

  assert.match(html, /id="statusBox"[^>]*hidden/);
  assert.match(html, /id="downloadLink"[^>]*hidden/);
});
