const qrMessages = {
  QR_TEXT_REQUIRED: "Vui long nhap text hoac link.",
  QR_TEXT_TOO_LONG: "Noi dung QR toi da 2048 ky tu.",
  QR_GENERATION_FAILED: "Khong the tao QR."
};

function readableError(code) {
  return qrMessages[code] || "Co loi khi tao QR.";
}

export function initQrTool({ requestJson }) {
  const form = document.querySelector("#qrForm");
  const textInput = document.querySelector("#qrText");
  const button = document.querySelector("#qrButton");
  const preview = document.querySelector("#qrPreview");
  const downloadButton = document.querySelector("#qrDownloadButton");
  const message = document.querySelector("#qrMessage");
  let currentSvg = "";
  let currentFilename = "qr-code.svg";

  function resetPreview() {
    currentSvg = "";
    preview.hidden = true;
    preview.innerHTML = "";
    downloadButton.hidden = true;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    resetPreview();
    message.textContent = "";
    button.disabled = true;

    try {
      const result = await requestJson("/api/tools/qr", {
        method: "POST",
        body: JSON.stringify({ text: textInput.value })
      });

      currentSvg = result.svg;
      currentFilename = result.filename || "qr-code.svg";
      preview.innerHTML = currentSvg;
      preview.hidden = false;
      downloadButton.hidden = false;
      message.textContent = "Da tao QR.";
    } catch (error) {
      message.textContent = readableError(error.message);
    } finally {
      button.disabled = false;
    }
  });

  downloadButton.addEventListener("click", () => {
    if (!currentSvg) {
      message.textContent = "Chua co QR de tai.";
      return;
    }

    const blob = new Blob([currentSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = currentFilename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  resetPreview();
}
