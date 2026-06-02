const QRCode = require("qrcode");

const MAX_QR_TEXT_LENGTH = 2048;

function createToolError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateQrText(input) {
  const text = String(input || "").trim();

  if (!text) {
    throw createToolError("QR_TEXT_REQUIRED", 400);
  }

  if (text.length > MAX_QR_TEXT_LENGTH) {
    throw createToolError("QR_TEXT_TOO_LONG", 413);
  }

  return text;
}

async function generateQrSvg(input, qrCode = QRCode) {
  const text = validateQrText(input);

  try {
    const svg = await qrCode.toString(text, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 2,
      width: 512
    });

    return {
      svg,
      filename: "qr-code.svg"
    };
  } catch {
    throw createToolError("QR_GENERATION_FAILED", 500);
  }
}

module.exports = {
  MAX_QR_TEXT_LENGTH,
  validateQrText,
  generateQrSvg
};
