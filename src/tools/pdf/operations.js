const { PDFDocument, degrees } = require("pdf-lib");
const { createPdfError } = require("./errors");
const {
  parsePageRanges,
  parseRangeGroups,
  pageNumbersToIndexes
} = require("./pageRanges");

async function loadPdf(buffer) {
  try {
    return await PDFDocument.load(buffer);
  } catch {
    throw createPdfError("PDF_PROCESSING_FAILED", 422);
  }
}

async function savePdf(pdf) {
  return Buffer.from(await pdf.save());
}

async function mergePdfs(files) {
  if (!files || files.length < 2) {
    throw createPdfError("PDF_FILES_REQUIRED", 400);
  }

  const output = await PDFDocument.create();

  for (const file of files) {
    const source = await loadPdf(file.buffer);
    const pages = await output.copyPages(source, source.getPageIndices());
    for (const page of pages) {
      output.addPage(page);
    }
  }

  return { filename: "merged.pdf", buffer: await savePdf(output) };
}

async function extractPages({ buffer, ranges }) {
  const source = await loadPdf(buffer);
  const pages = parsePageRanges(ranges, source.getPageCount());
  const output = await PDFDocument.create();
  const copied = await output.copyPages(source, pageNumbersToIndexes(pages));

  for (const page of copied) {
    output.addPage(page);
  }

  return { filename: "extracted.pdf", buffer: await savePdf(output) };
}

async function deletePages({ buffer, ranges }) {
  const source = await loadPdf(buffer);
  const removePages = new Set(parsePageRanges(ranges, source.getPageCount()));
  const keepPages = [];

  for (let page = 1; page <= source.getPageCount(); page += 1) {
    if (!removePages.has(page)) {
      keepPages.push(page);
    }
  }

  if (keepPages.length === 0) {
    throw createPdfError("PDF_RANGE_INVALID", 400);
  }

  const output = await PDFDocument.create();
  const copied = await output.copyPages(source, pageNumbersToIndexes(keepPages));

  for (const page of copied) {
    output.addPage(page);
  }

  return { filename: "deleted-pages.pdf", buffer: await savePdf(output) };
}

function parseRotation(input) {
  const value = Number(input);
  if (![90, 180, 270].includes(value)) {
    throw createPdfError("PDF_ROTATION_INVALID", 400);
  }
  return value;
}

async function rotatePages({ buffer, degreesValue, ranges }) {
  const pdf = await loadPdf(buffer);
  const rotation = parseRotation(degreesValue);
  const selected = String(ranges || "").trim()
    ? new Set(parsePageRanges(ranges, pdf.getPageCount()))
    : null;

  pdf.getPages().forEach((page, index) => {
    const pageNumber = index + 1;
    if (!selected || selected.has(pageNumber)) {
      page.setRotation(degrees(rotation));
    }
  });

  return { filename: "rotated.pdf", buffer: await savePdf(pdf) };
}

async function splitPdf({ buffer, ranges }) {
  const source = await loadPdf(buffer);
  const groups = parseRangeGroups(ranges, source.getPageCount());
  const files = [];

  for (let index = 0; index < groups.length; index += 1) {
    const output = await PDFDocument.create();
    const copied = await output.copyPages(source, pageNumbersToIndexes(groups[index]));
    for (const page of copied) {
      output.addPage(page);
    }
    files.push({
      filename: `split-${index + 1}.pdf`,
      buffer: await savePdf(output)
    });
  }

  return { filename: "split-pdf.zip", files };
}

async function getPdfInfo({ buffer, originalName }) {
  const pdf = await loadPdf(buffer);

  return {
    filename: originalName || "document.pdf",
    pageCount: pdf.getPageCount(),
    sizeBytes: buffer.length,
    title: pdf.getTitle() || "",
    author: pdf.getAuthor() || "",
    subject: pdf.getSubject() || "",
    creator: pdf.getCreator() || "",
    producer: pdf.getProducer() || "",
    creationDate: pdf.getCreationDate()?.toISOString() || "",
    modificationDate: pdf.getModificationDate()?.toISOString() || ""
  };
}

module.exports = {
  mergePdfs,
  extractPages,
  deletePages,
  rotatePages,
  splitPdf,
  getPdfInfo,
  parseRotation
};
