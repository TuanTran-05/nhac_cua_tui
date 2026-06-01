const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      windowsHide: true
    });

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
        const error = new Error(`${command} exited with code ${code}`);
        error.code = "COMMAND_FAILED";
        error.stderr = stderr;
        reject(error);
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

function safeFilename(title) {
  const cleaned = String(title || "audio")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  return `${cleaned || "audio"}.mp3`;
}

async function convertYoutubeToMp3({ url, outputDir, maxDurationSeconds, runner = runCommand }) {
  const metadataResult = await runner("yt-dlp", [
    "--dump-json",
    "--no-playlist",
    "--skip-download",
    url
  ]);

  const metadata = JSON.parse(metadataResult.stdout);
  const duration = Number(metadata.duration || 0);

  if (duration > maxDurationSeconds) {
    const error = new Error("VIDEO_TOO_LONG");
    error.code = "VIDEO_TOO_LONG";
    throw error;
  }

  const outputTemplate = path.join(outputDir, "audio.%(ext)s");

  await runner("yt-dlp", [
    "--no-playlist",
    "--extract-audio",
    "--audio-format",
    "mp3",
    "--audio-quality",
    "0",
    "--output",
    outputTemplate,
    url
  ]);

  const filePath = path.join(outputDir, "audio.mp3");
  await fs.access(filePath);

  return {
    title: metadata.title || "audio",
    filename: safeFilename(metadata.title),
    filePath
  };
}

module.exports = {
  runCommand,
  convertYoutubeToMp3,
  safeFilename
};
