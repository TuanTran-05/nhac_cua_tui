const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("node:path");

function sendError(res, error) {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    error: error.message || "INTERNAL_ERROR"
  });
}

function createApp({ auth, jobService }) {
  const app = express();

  app.use(express.json({ limit: "16kb" }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, "..", "public")));

  app.post("/api/login", (req, res) => {
    if (!auth.verifyPassword(req.body?.password)) {
      res.status(401).json({ error: "BAD_PASSWORD" });
      return;
    }

    auth.setAuthCookie(res);
    res.json({ ok: true });
  });

  app.post("/api/logout", (req, res) => {
    auth.clearAuthCookie(res);
    res.json({ ok: true });
  });

  app.post("/api/jobs", auth.requireAuth, async (req, res) => {
    try {
      const job = await jobService.createJob(req.body?.url);
      res.status(202).json(job);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/jobs/:id", auth.requireAuth, (req, res) => {
    const job = jobService.getJob(req.params.id);
    if (!job) {
      res.status(404).json({ error: "JOB_NOT_FOUND" });
      return;
    }

    res.json(job);
  });

  app.get("/api/jobs/:id/download", auth.requireAuth, (req, res) => {
    try {
      const download = jobService.getDownload(req.params.id);
      res.download(download.filePath, download.filename, async () => {
        await jobService.cleanupJob(req.params.id);
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "index.html"));
  });

  return app;
}

module.exports = { createApp };
