const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

function publicJob(job) {
  if (!job) {
    return null;
  }

  return {
    id: job.id,
    url: job.url,
    status: job.status,
    message: job.message,
    title: job.title,
    filename: job.filename,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt
  };
}

function createJobStore({ tempRoot, ttlMs }) {
  const jobs = new Map();

  async function create(url) {
    const id = crypto.randomUUID();
    const dir = path.join(tempRoot, id);
    const now = Date.now();

    await fs.mkdir(dir, { recursive: true });

    const job = {
      id,
      url,
      dir,
      status: "queued",
      message: "Dang cho xu ly",
      title: null,
      filename: null,
      filePath: null,
      error: null,
      createdAt: now,
      updatedAt: now
    };

    jobs.set(id, job);
    return job;
  }

  function get(id) {
    return jobs.get(id) ?? null;
  }

  function list() {
    return Array.from(jobs.values());
  }

  function update(id, patch) {
    const job = get(id);
    if (!job) {
      return null;
    }

    Object.assign(job, patch, { updatedAt: Date.now() });
    return job;
  }

  async function cleanupJob(id) {
    const job = get(id);
    if (!job) {
      return;
    }

    jobs.delete(id);
    await fs.rm(job.dir, { recursive: true, force: true });
  }

  async function cleanupExpired() {
    const now = Date.now();
    const expired = list().filter((job) => now - job.createdAt > ttlMs);

    for (const job of expired) {
      await cleanupJob(job.id);
    }
  }

  return {
    create,
    get,
    list,
    update,
    cleanupJob,
    cleanupExpired,
    publicJob
  };
}

module.exports = { createJobStore };
