const { createPdfError } = require("./errors");

function assertPageInBounds(page, totalPages) {
  if (!Number.isInteger(page) || page < 1 || page > totalPages) {
    throw createPdfError("PDF_RANGE_OUT_OF_BOUNDS", 400);
  }
}

function parsePart(part, totalPages) {
  const value = part.trim();

  if (!value) {
    throw createPdfError("PDF_RANGE_INVALID", 400);
  }

  if (/^\d+$/.test(value)) {
    const page = Number(value);
    assertPageInBounds(page, totalPages);
    return [page];
  }

  const match = value.match(/^(\d+)-(\d+)$/);
  if (!match) {
    throw createPdfError("PDF_RANGE_INVALID", 400);
  }

  const start = Number(match[1]);
  const end = Number(match[2]);

  if (start > end) {
    throw createPdfError("PDF_RANGE_INVALID", 400);
  }

  assertPageInBounds(start, totalPages);
  assertPageInBounds(end, totalPages);

  const pages = [];
  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  return pages;
}

function parsePageRanges(input, totalPages) {
  const raw = String(input || "").trim();

  if (!raw) {
    throw createPdfError("PDF_RANGE_REQUIRED", 400);
  }

  const pages = [];

  for (const part of raw.split(",")) {
    pages.push(...parsePart(part, totalPages));
  }

  return Array.from(new Set(pages)).sort((a, b) => a - b);
}

function parseRangeGroups(input, totalPages) {
  const raw = String(input || "").trim();

  if (!raw) {
    throw createPdfError("PDF_RANGE_REQUIRED", 400);
  }

  return raw.split(";").map((group) => parsePageRanges(group, totalPages));
}

function pageNumbersToIndexes(pages) {
  return pages.map((page) => page - 1);
}

module.exports = {
  parsePageRanges,
  parseRangeGroups,
  pageNumbersToIndexes
};
