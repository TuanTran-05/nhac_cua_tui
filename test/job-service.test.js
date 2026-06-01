const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createJobStore } = require("../src/jobs/store");
const { createJobService } = require("../src/jobs/service");

async function waitForStatus(service, id, status) {
  for (let index = 0; index < 50; index += 1) {
    const job = service.getJob(id);
    if (job?.status === status) {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`status ${status} not reached`);
}

test("createJobService starts and completes a conversion job", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mp3-service-"));
  const store = createJobStore({ tempRoot, ttlMs: 60000 });
  const converter = async ({ outputDir }) => {
    const filePath = path.join(outputDir, "audio.mp3");
    await fs.writeFile(filePath, "mp3");
    return { title: "Example Song", filename: "Example Song.mp3", filePath };
  };
  const service = createJobService({
    store,
    converter,
    maxConcurrentJobs: 1,
    maxDurationSeconds: 120
  });

  const job = await service.createJob("https://youtu.be/dQw4w9WgXcQ");
  const complete = await waitForStatus(service, job.id, "ready");

  assert.equal(complete.title, "Example Song");
  assert.equal(complete.filename, "Example Song.mp3");
});

test("createJobService rejects invalid URLs", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mp3-service-"));
  const store = createJobStore({ tempRoot, ttlMs: 60000 });
  const service = createJobService({
    store,
    converter: async () => {
      throw new Error("not called");
    },
    maxConcurrentJobs: 1,
    maxDurationSeconds: 120
  });

  await assert.rejects(
    () => service.createJob("https://example.com/video"),
    /URL_MUST_BE_YOUTUBE/
  );
});

test("createJobService enforces concurrent job limit", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mp3-service-"));
  const store = createJobStore({ tempRoot, ttlMs: 60000 });
  let release;
  const converter = () => new Promise((resolve) => {
    release = resolve;
  });
  const service = createJobService({
    store,
    converter,
    maxConcurrentJobs: 1,
    maxDurationSeconds: 120
  });

  await service.createJob("https://youtu.be/dQw4w9WgXcQ");

  await assert.rejects(
    () => service.createJob("https://youtu.be/dQw4w9WgXcQ"),
    /TOO_MANY_ACTIVE_JOBS/
  );

  release({ title: "Done", filename: "Done.mp3", filePath: path.join(tempRoot, "missing.mp3") });
});
