const dotenv = require("dotenv");

dotenv.config();

function readPositiveInteger(env, name, defaultValue) {
  const raw = env[name] ?? String(defaultValue);
  const value = Number(raw);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

function readRequired(env, name) {
  const value = env[name];

  if (!value || !String(value).trim()) {
    throw new Error(`${name} is required`);
  }

  return String(value);
}

function loadConfig(env = process.env) {
  const appPassword = readRequired(env, "APP_PASSWORD");
  const sessionSecret = readRequired(env, "SESSION_SECRET");

  return {
    appPassword,
    sessionSecret,
    port: readPositiveInteger(env, "PORT", 3000),
    maxDurationSeconds: readPositiveInteger(env, "MAX_DURATION_SECONDS", 900),
    maxConcurrentJobs: readPositiveInteger(env, "MAX_CONCURRENT_JOBS", 1),
    jobTtlMs: readPositiveInteger(env, "JOB_TTL_MS", 600000),
    isProduction: env.NODE_ENV === "production"
  };
}

module.exports = { loadConfig };
