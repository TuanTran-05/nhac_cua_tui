const { spawn } = require("node:child_process");
const { createPdfError } = require("./errors");

const profiles = new Set(["screen", "ebook", "printer", "prepress"]);

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        const error = new Error(`Ghostscript exited with code ${code}`);
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function buildGhostscriptArgs({ inputPath, outputPath, profile }) {
  const selectedProfile = profile || "ebook";

  if (!profiles.has(selectedProfile)) {
    throw createPdfError("PDF_PROFILE_INVALID", 400);
  }

  return [
    "-sDEVICE=pdfwrite",
    "-dCompatibilityLevel=1.4",
    `-dPDFSETTINGS=/${selectedProfile}`,
    "-dNOPAUSE",
    "-dQUIET",
    "-dBATCH",
    `-sOutputFile=${outputPath}`,
    inputPath
  ];
}

async function compressPdf({ inputPath, outputPath, profile, runner = runCommand }) {
  try {
    await runner("gs", buildGhostscriptArgs({ inputPath, outputPath, profile }));
  } catch (error) {
    if (error.code === "ENOENT") {
      throw createPdfError("PDF_GHOSTSCRIPT_UNAVAILABLE", 500);
    }
    throw createPdfError("PDF_PROCESSING_FAILED", 500);
  }

  return {
    filename: "compressed.pdf",
    filePath: outputPath
  };
}

module.exports = {
  buildGhostscriptArgs,
  compressPdf,
  runCommand
};
