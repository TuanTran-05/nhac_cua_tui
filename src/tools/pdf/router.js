const express = require("express");
const multer = require("multer");
const { createPdfError } = require("./errors");

const allowedActions = new Set([
  "merge",
  "split",
  "rotate",
  "delete",
  "extract",
  "compress",
  "info"
]);

function fileFilter(_req, file, cb) {
  if (file.mimetype !== "application/pdf" && !file.originalname.toLowerCase().endsWith(".pdf")) {
    cb(createPdfError("PDF_ONLY_ALLOWED", 400));
    return;
  }
  cb(null, true);
}

function sendPdfError(res, error) {
  res.status(error.statusCode || 500).json({
    error: error.message || "PDF_PROCESSING_FAILED"
  });
}

function createPdfRouter({ auth, pdfTool }) {
  const router = express.Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: pdfTool.routerOptions.limits,
    fileFilter
  });

  router.post(
    "/api/tools/pdf/:action",
    auth.requireAuth,
    upload.array("files", pdfTool.routerOptions.maxFiles),
    async (req, res) => {
      try {
        const action = req.params.action;
        if (!allowedActions.has(action)) {
          throw createPdfError("PDF_ACTION_UNKNOWN", 400);
        }

        const files = (req.files || []).map((file) => ({
          buffer: file.buffer,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        }));
        const result = await pdfTool.handleAction(action, files, req.body || {});

        if (result.type === "json") {
          res.json(result.body);
          return;
        }

        res.setHeader("Content-Type", result.contentType);
        res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
        res.send(result.buffer);
      } catch (error) {
        sendPdfError(res, error);
      }
    }
  );

  return router;
}

module.exports = { createPdfRouter, allowedActions };
