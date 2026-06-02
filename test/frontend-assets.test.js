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

test("HTML contains personal tool hub navigation and views", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");

  assert.match(html, /id="dashboardView"/);
  assert.match(html, /id="mp3ToolView"/);
  assert.match(html, /id="qrToolView"/);
  assert.match(html, /id="jsonToolView"/);
  assert.match(html, /id="passwordToolView"/);
  assert.match(html, /data-tool="mp3"/);
  assert.match(html, /data-tool="qr"/);
  assert.match(html, /data-tool="json"/);
  assert.match(html, /data-tool="password"/);
});

