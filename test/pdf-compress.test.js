const assert = require("node:assert/strict");
const test = require("node:test");
const { buildGhostscriptArgs, compressPdf } = require("../src/tools/pdf/compress");

test("buildGhostscriptArgs maps compression profile to PDF settings", () => {
  const args = buildGhostscriptArgs({
    inputPath: "input.pdf",
    outputPath: "output.pdf",
    profile: "ebook"
  });

  assert.equal(args.includes("-sDEVICE=pdfwrite"), true);
  assert.equal(args.includes("-dPDFSETTINGS=/ebook"), true);
  assert.equal(args.includes("-sOutputFile=output.pdf"), true);
  assert.equal(args.at(-1), "input.pdf");
});

test("buildGhostscriptArgs rejects invalid profile", () => {
  assert.throws(
    () => buildGhostscriptArgs({ inputPath: "a.pdf", outputPath: "b.pdf", profile: "tiny" }),
    /PDF_PROFILE_INVALID/
  );
});

test("compressPdf calls runner and returns output descriptor", async () => {
  const calls = [];
  const runner = async (command, args) => {
    calls.push({ command, args });
    return { stdout: "", stderr: "" };
  };

  const result = await compressPdf({
    inputPath: "input.pdf",
    outputPath: "output.pdf",
    profile: "screen",
    runner
  });

  assert.equal(calls[0].command, "gs");
  assert.equal(result.filename, "compressed.pdf");
  assert.equal(result.filePath, "output.pdf");
});

test("compressPdf maps missing binary to PDF_GHOSTSCRIPT_UNAVAILABLE", async () => {
  const runner = async () => {
    const error = new Error("spawn gs ENOENT");
    error.code = "ENOENT";
    throw error;
  };

  await assert.rejects(
    () =>
      compressPdf({
        inputPath: "input.pdf",
        outputPath: "output.pdf",
        profile: "screen",
        runner
      }),
    /PDF_GHOSTSCRIPT_UNAVAILABLE/
  );
});
