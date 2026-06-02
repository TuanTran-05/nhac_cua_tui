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

test("HTML contains PDF suite navigation and action forms", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");

  assert.match(html, /data-tool="pdf"/);
  assert.match(html, /id="pdfToolView"/);
  assert.match(html, /data-pdf-action="merge"/);
  assert.match(html, /data-pdf-action="split"/);
  assert.match(html, /data-pdf-action="rotate"/);
  assert.match(html, /data-pdf-action="delete"/);
  assert.match(html, /data-pdf-action="extract"/);
  assert.match(html, /data-pdf-action="compress"/);
  assert.match(html, /data-pdf-action="info"/);
});

test("frontend entrypoint imports and initializes PDF tool", () => {
  const appJs = fs.readFileSync(path.join(__dirname, "..", "public", "js", "app.js"), "utf8");

  assert.match(appJs, /initPdfTool/);
  assert.match(appJs, /\.\/tools\/pdf\.js/);
});

test("PDF info renderer does not inject metadata through innerHTML", () => {
  const pdfJs = fs.readFileSync(
    path.join(__dirname, "..", "public", "js", "tools", "pdf.js"),
    "utf8"
  );

  assert.doesNotMatch(pdfJs, /innerHTML\s*=/);
  assert.match(pdfJs, /textContent/);
});

test("HTML contains copyright ownership mark", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");

  assert.match(html, /copyright@tuantran_05/);
});

