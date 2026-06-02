const actionConfig = {
  merge: { multiple: true, ranges: false, degrees: false, profile: false, button: "Gop PDF" },
  split: { multiple: false, ranges: true, degrees: false, profile: false, button: "Tach PDF" },
  rotate: { multiple: false, ranges: true, degrees: true, profile: false, button: "Xoay PDF" },
  delete: { multiple: false, ranges: true, degrees: false, profile: false, button: "Xoa trang" },
  extract: { multiple: false, ranges: true, degrees: false, profile: false, button: "Trich trang" },
  compress: { multiple: false, ranges: false, degrees: false, profile: true, button: "Nen PDF" },
  info: { multiple: false, ranges: false, degrees: false, profile: false, button: "Xem thong tin" }
};

const messages = {
  PDF_ACTION_UNKNOWN: "Cong cu PDF khong hop le.",
  PDF_FILE_REQUIRED: "Vui long chon file PDF.",
  PDF_FILES_REQUIRED: "Can it nhat 2 file PDF.",
  PDF_TOO_MANY_FILES: "Qua nhieu file PDF.",
  PDF_ONLY_ALLOWED: "Chi chap nhan file PDF.",
  PDF_RANGE_REQUIRED: "Vui long nhap trang hoac range.",
  PDF_RANGE_INVALID: "Range trang khong hop le.",
  PDF_RANGE_OUT_OF_BOUNDS: "Range vuot qua so trang cua file.",
  PDF_ROTATION_INVALID: "Do xoay khong hop le.",
  PDF_PROFILE_INVALID: "Muc nen khong hop le.",
  PDF_GHOSTSCRIPT_UNAVAILABLE: "Server chua co Ghostscript de nen PDF.",
  PDF_PROCESSING_FAILED: "Khong the xu ly PDF."
};

function readableError(code) {
  return messages[code] || "Co loi khi xu ly PDF.";
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function filenameFromDisposition(header, fallback) {
  const match = String(header || "").match(/filename="([^"]+)"/);
  return match ? match[1] : fallback;
}

function renderInfo(panel, info) {
  const rows = [
    ["File", info.filename],
    ["So trang", info.pageCount],
    ["Dung luong", `${Math.round((info.sizeBytes || 0) / 1024)} KB`],
    ["Title", info.title],
    ["Author", info.author],
    ["Subject", info.subject],
    ["Creator", info.creator],
    ["Producer", info.producer],
    ["Created", info.creationDate],
    ["Modified", info.modificationDate]
  ];

  panel.innerHTML = rows
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([label, value]) => `<div class="info-row"><span>${label}</span><span>${value}</span></div>`)
    .join("");
  panel.hidden = false;
}

export function initPdfTool() {
  const actionButtons = Array.from(document.querySelectorAll("[data-pdf-action]"));
  const form = document.querySelector("#pdfForm");
  const filesInput = document.querySelector("#pdfFiles");
  const rangesInput = document.querySelector("#pdfRanges");
  const degreesInput = document.querySelector("#pdfDegrees");
  const profileInput = document.querySelector("#pdfProfile");
  const rangesLabel = document.querySelector("#pdfRangesLabel");
  const degreesLabel = document.querySelector("#pdfDegreesLabel");
  const profileLabel = document.querySelector("#pdfProfileLabel");
  const submitButton = document.querySelector("#pdfSubmitButton");
  const infoPanel = document.querySelector("#pdfInfoPanel");
  const message = document.querySelector("#pdfMessage");
  let activeAction = "merge";

  function setAction(action) {
    activeAction = action;
    const config = actionConfig[action];

    for (const button of actionButtons) {
      button.classList.toggle("is-active", button.dataset.pdfAction === action);
    }

    filesInput.multiple = config.multiple;
    rangesInput.hidden = !config.ranges;
    rangesLabel.hidden = !config.ranges;
    degreesInput.hidden = !config.degrees;
    degreesLabel.hidden = !config.degrees;
    profileInput.hidden = !config.profile;
    profileLabel.hidden = !config.profile;
    submitButton.textContent = config.button;
    infoPanel.hidden = true;
    message.textContent = "";
  }

  for (const button of actionButtons) {
    button.addEventListener("click", () => setAction(button.dataset.pdfAction));
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";
    infoPanel.hidden = true;
    submitButton.disabled = true;

    try {
      const body = new FormData(form);
      const response = await fetch(`/api/tools/pdf/${activeAction}`, {
        method: "POST",
        body
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "PDF_PROCESSING_FAILED");
      }

      if (activeAction === "info") {
        renderInfo(infoPanel, await response.json());
        message.textContent = "Da doc thong tin PDF.";
        return;
      }

      const blob = await response.blob();
      const filename = filenameFromDisposition(
        response.headers.get("content-disposition"),
        activeAction === "split" ? "split-pdf.zip" : `${activeAction}.pdf`
      );
      downloadBlob(blob, filename);
      message.textContent = "Da xu ly xong PDF.";
    } catch (error) {
      message.textContent = readableError(error.message);
    } finally {
      submitButton.disabled = false;
    }
  });

  setAction(activeAction);
}
