const assert = require("node:assert/strict");
const test = require("node:test");
const { loadConfig } = require("../src/config");

test("loadConfig parses required and numeric values", () => {
  const config = loadConfig({
    APP_PASSWORD: "secret",
    SESSION_SECRET: "session-secret",
    PORT: "4444",
    MAX_DURATION_SECONDS: "120",
    MAX_CONCURRENT_JOBS: "2",
    JOB_TTL_MS: "5000",
    NODE_ENV: "production"
  });

  assert.equal(config.appPassword, "secret");
  assert.equal(config.sessionSecret, "session-secret");
  assert.equal(config.port, 4444);
  assert.equal(config.maxDurationSeconds, 120);
  assert.equal(config.maxConcurrentJobs, 2);
  assert.equal(config.jobTtlMs, 5000);
  assert.equal(config.isProduction, true);
});

test("loadConfig requires APP_PASSWORD", () => {
  assert.throws(
    () => loadConfig({ SESSION_SECRET: "session-secret" }),
    /APP_PASSWORD is required/
  );
});

test("loadConfig requires SESSION_SECRET", () => {
  assert.throws(
    () => loadConfig({ APP_PASSWORD: "secret" }),
    /SESSION_SECRET is required/
  );
});

test("loadConfig rejects invalid numeric values", () => {
  assert.throws(
    () =>
      loadConfig({
        APP_PASSWORD: "secret",
        SESSION_SECRET: "session-secret",
        PORT: "abc"
      }),
    /PORT must be a positive integer/
  );
});
