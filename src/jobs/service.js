const { validateYoutubeUrl } = require("../validators");

function createServiceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function activeJobCount(store) {
  return store
    .list()
    .filter((job) => ["queued", "processing"].includes(job.status)).length;
}

function createJobService({ store, converter, maxConcurrentJobs, maxDurationSeconds }) {
  async function createJob(inputUrl) {
    const validation = validateYoutubeUrl(inputUrl);
    if (!validation.ok) {
      throw createServiceError(validation.error, 400);
    }

    if (activeJobCount(store) >= maxConcurrentJobs) {
      throw createServiceError("TOO_MANY_ACTIVE_JOBS", 429);
    }

    const job = await store.create(validation.url);
    processJob(job.id);
    return store.publicJob(job);
  }

  async function processJob(id) {
    const job = store.get(id);
    if (!job) {
      return;
    }

    store.update(id, {
      status: "processing",
      message: "Dang tai va chuyen doi audio"
    });

    try {
      const result = await converter({
        url: job.url,
        outputDir: job.dir,
        maxDurationSeconds
      });

      store.update(id, {
        status: "ready",
        message: "MP3 da san sang de tai",
        title: result.title,
        filename: result.filename,
        filePath: result.filePath
      });
    } catch (error) {
      store.update(id, {
        status: "failed",
        message: "Khong the trich xuat MP3",
        error: error.code || error.message || "CONVERSION_FAILED"
      });
    }
  }

  function getJob(id) {
    return store.publicJob(store.get(id));
  }

  function getDownload(id) {
    const job = store.get(id);

    if (!job) {
      throw createServiceError("JOB_NOT_FOUND", 404);
    }

    if (job.status !== "ready" || !job.filePath) {
      throw createServiceError("JOB_NOT_READY", 409);
    }

    return {
      filePath: job.filePath,
      filename: job.filename || "audio.mp3"
    };
  }

  async function cleanupJob(id) {
    await store.cleanupJob(id);
  }

  async function cleanupExpired() {
    await store.cleanupExpired();
  }

  return {
    createJob,
    getJob,
    getDownload,
    cleanupJob,
    cleanupExpired
  };
}

module.exports = { createJobService };
