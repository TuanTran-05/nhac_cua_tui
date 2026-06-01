const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createJobStore } = require("../src/jobs/store");

test("createJobStore creates and updates jobs", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mp3-store-"));
  const store = createJobStore({ tempRoot, ttlMs: 1000 });
  const job = await store.create("https://youtu.be/dQw4w9WgXcQ");

  assert.equal(job.status, "queued");
  assert.equal(job.url, "https://youtu.be/dQw4w9WgXcQ");
  assert.equal(job.dir.startsWith(tempRoot), true);

  store.update(job.id, { status: "ready", title: "Song", filePath: path.join(job.dir, "audio.mp3") });

  assert.equal(store.get(job.id).status, "ready");
  assert.equal(store.get(job.id).title, "Song");

  await fs.rm(tempRoot, { recursive: true, force: true });
});

test("cleanupJob removes job directory and map entry", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mp3-store-"));
  const store = createJobStore({ tempRoot, ttlMs: 1000 });
  const job = await store.create("https://youtu.be/dQw4w9WgXcQ");
  await fs.writeFile(path.join(job.dir, "audio.mp3"), "data");

  await store.cleanupJob(job.id);

  assert.equal(store.get(job.id), null);
  await assert.rejects(fs.stat(job.dir), /ENOENT/);
});

test("cleanupExpired removes jobs older than ttl", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mp3-store-"));
  const store = createJobStore({ tempRoot, ttlMs: 1 });
  const job = await store.create("https://youtu.be/dQw4w9WgXcQ");

  store.update(job.id, { createdAt: Date.now() - 1000 });
  await store.cleanupExpired();

  assert.equal(store.get(job.id), null);
});
