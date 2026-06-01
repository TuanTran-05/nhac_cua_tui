const path = require("node:path");
const { loadConfig } = require("./config");
const { createAuth } = require("./auth");
const { createApp } = require("./app");
const { createJobStore } = require("./jobs/store");
const { convertYoutubeToMp3 } = require("./jobs/converter");
const { createJobService } = require("./jobs/service");

const config = loadConfig();
const store = createJobStore({
  tempRoot: path.join(__dirname, "..", "tmp", "jobs"),
  ttlMs: config.jobTtlMs
});
const jobService = createJobService({
  store,
  converter: convertYoutubeToMp3,
  maxConcurrentJobs: config.maxConcurrentJobs,
  maxDurationSeconds: config.maxDurationSeconds
});
const auth = createAuth(config);
const app = createApp({ auth, jobService });

setInterval(() => {
  jobService.cleanupExpired().catch((error) => {
    console.error("cleanup failed", error);
  });
}, 60_000).unref();

app.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});
