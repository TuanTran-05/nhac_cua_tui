const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { PDFDocument, degrees } = require("pdf-lib");
const {
  mergePdfs,
  extractPages,
  deletePages,
  rotatePages,
  splitPdf,
  getPdfInfo
} = require("../src/tools/pdf/operations");

async function makePdf(pageCount, label) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(label);
  for (let index = 0; index < pageCount; index += 1) {
    pdf.addPage([200, 200]);
  }
  return Buffer.from(await pdf.save());
}

async function loadPageCount(buffer) {
  const pdf = await PDFDocument.load(buffer);
  return pdf.getPageCount();
}

test("mergePdfs combines pages from multiple files", async () => {
  const one = await makePdf(2, "one");
  const two = await makePdf(3, "two");
  const result = await mergePdfs([
    { buffer: one, originalName: "one.pdf" },
    { buffer: two, originalName: "two.pdf" }
  ]);

  assert.equal(result.filename, "merged.pdf");
  assert.equal(await loadPageCount(result.buffer), 5);
});

test("extractPages keeps selected pages", async () => {
  const input = await makePdf(5, "extract");
  const result = await extractPages({ buffer: input, ranges: "2,4-5" });

  assert.equal(result.filename, "extracted.pdf");
  assert.equal(await loadPageCount(result.buffer), 3);
});

test("deletePages removes selected pages", async () => {
  const input = await makePdf(5, "delete");
  const result = await deletePages({ buffer: input, ranges: "2,5" });

  assert.equal(result.filename, "deleted-pages.pdf");
  assert.equal(await loadPageCount(result.buffer), 3);
});

test("rotatePages rotates all pages when ranges is empty", async () => {
  const input = await makePdf(2, "rotate");
  const result = await rotatePages({ buffer: input, degreesValue: "90", ranges: "" });
  const pdf = await PDFDocument.load(result.buffer);

  assert.equal(result.filename, "rotated.pdf");
  assert.equal(pdf.getPages()[0].getRotation().angle, degrees(90).angle);
});

test("splitPdf returns one pdf buffer per range group", async () => {
  const input = await makePdf(5, "split");
  const result = await splitPdf({ buffer: input, ranges: "1-2;3;4-5" });

  assert.equal(result.files.length, 3);
  assert.equal(await loadPageCount(result.files[0].buffer), 2);
  assert.equal(await loadPageCount(result.files[1].buffer), 1);
  assert.equal(await loadPageCount(result.files[2].buffer), 2);
});

test("getPdfInfo returns page count, size, and metadata", async () => {
  const input = await makePdf(4, "Info Title");
  const info = await getPdfInfo({ buffer: input, originalName: "info.pdf" });

  assert.equal(info.filename, "info.pdf");
  assert.equal(info.pageCount, 4);
  assert.equal(info.sizeBytes, input.length);
  assert.equal(info.title, "Info Title");
});
