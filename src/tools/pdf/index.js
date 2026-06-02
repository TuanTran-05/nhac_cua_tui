const archiver = require("archiver");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { Readable } = require("node:stream");
const { createPdfError } = require("./errors");
const {
  mergePdfs,
  extractPages,
  deletePages,
  rotatePages,
  splitPdf,
  getPdfInfo
} = require("./operations");
const { compressPdf } = require("./compress");

function firstFile(files) {
  if (!files || files.length < 1) {
    throw createPdfError("PDF_FILE_REQUIRED", 400);
  }
  return files[0];
}

function requireMergeFiles(files, maxFiles) {
  if (!files || files.length < 2) {
    throw createPdfError("PDF_FILES_REQUIRED", 400);
  }
  if (files.length > maxFiles) {
    throw createPdfError("PDF_TOO_MANY_FILES", 400);
  }
}

async function zipSplitFiles(splitResult) {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const chunks = [];

  const finished = new Promise((resolve, reject) => {
    archive.on("data", (chunk) => chunks.push(chunk));
    archive.on("error", reject);
    archive.on("end", resolve);
  });

  for (const file of splitResult.files) {
    archive.append(Readable.from(file.buffer), { name: file.filename });
  }

  archive.finalize();
  await finished;

  return Buffer.concat(chunks);
}

function createPdfTool(config = {}) {
  const maxFileMb = config.maxFileMb || Number(process.env.PDF_MAX_FILE_MB || 50);
  const maxFiles = config.maxFiles || Number(process.env.PDF_MAX_FILES || 10);

  async function handleAction(action, files, fields) {
    if (action === "merge") {
      requireMergeFiles(files, maxFiles);
      const result = await mergePdfs(files);
      return { type: "buffer", contentType: "application/pdf", ...result };
    }

    if (action === "split") {
      const result = await splitPdf({ buffer: firstFile(files).buffer, ranges: fields.ranges });
      return {
        type: "buffer",
        contentType: "application/zip",
        filename: result.filename,
        buffer: await zipSplitFiles(result)
      };
    }

    if (action === "rotate") {
      const result = await rotatePages({
        buffer: firstFile(files).buffer,
        degreesValue: fields.degrees,
        ranges: fields.ranges
      });
      return { type: "buffer", contentType: "application/pdf", ...result };
    }

    if (action === "delete") {
      const result = await deletePages({ buffer: firstFile(files).buffer, ranges: fields.ranges });
      return { type: "buffer", contentType: "application/pdf", ...result };
    }

    if (action === "extract") {
      const result = await extractPages({ buffer: firstFile(files).buffer, ranges: fields.ranges });
      return { type: "buffer", contentType: "application/pdf", ...result };
    }

    if (action === "info") {
      const file = firstFile(files);
      return {
        type: "json",
        body: await getPdfInfo({ buffer: file.buffer, originalName: file.originalName })
      };
    }

    if (action === "compress") {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pdf-compress-"));
      const inputPath = path.join(tempDir, "input.pdf");
      const outputPath = path.join(tempDir, "output.pdf");
      try {
        await fs.writeFile(inputPath, firstFile(files).buffer);
        const result = await compressPdf({ inputPath, outputPath, profile: fields.profile });
        const buffer = await fs.readFile(result.filePath);
        return {
          type: "buffer",
          contentType: "application/pdf",
          filename: result.filename,
          buffer
        };
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    }

    throw createPdfError("PDF_ACTION_UNKNOWN", 400);
  }

  return {
    routerOptions: {
      limits: { fileSize: maxFileMb * 1024 * 1024 },
      maxFiles
    },
    handleAction
  };
}

module.exports = { createPdfTool };
