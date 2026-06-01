const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { convertYoutubeToMp3 } = require("../src/jobs/converter");

test("convertYoutubeToMp3 checks metadata, runs yt-dlp, and returns file info", async () => {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "mp3-converter-"));
  const calls = [];
  const runner = async (command, args) => {
    calls.push({ command, args });

    if (args.includes("--dump-json")) {
      return {
        stdout: JSON.stringify({ title: "Example Song", duration: 60 }),
        stderr: ""
      };
    }

    await fs.writeFile(path.join(outputDir, "audio.mp3"), "mp3");
    return { stdout: "", stderr: "" };
  };

  const result = await convertYoutubeToMp3({
    url: "https://youtu.be/dQw4w9WgXcQ",
    outputDir,
    maxDurationSeconds: 120,
    runner
  });

  assert.equal(result.title, "Example Song");
  assert.equal(result.filename, "Example Song.mp3");
  assert.equal(result.filePath, path.join(outputDir, "audio.mp3"));
  assert.equal(calls.length, 2);
  assert.equal(calls[0].command, "yt-dlp");
  assert.equal(calls[1].args.includes("--extract-audio"), true);
});

test("convertYoutubeToMp3 rejects videos over max duration", async () => {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "mp3-converter-"));
  const runner = async () => ({
    stdout: JSON.stringify({ title: "Long Video", duration: 999 }),
    stderr: ""
  });

  await assert.rejects(
    () =>
      convertYoutubeToMp3({
        url: "https://youtu.be/dQw4w9WgXcQ",
        outputDir,
        maxDurationSeconds: 120,
        runner
      }),
    /VIDEO_TOO_LONG/
  );
});
