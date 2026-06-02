const messages = {
  URL_REQUIRED: "Vui long nhap link YouTube.",
  URL_INVALID: "Link khong hop le.",
  URL_MUST_BE_YOUTUBE: "Chi ho tro link YouTube.",
  YOUTUBE_VIDEO_ID_REQUIRED: "Link YouTube phai tro den mot video.",
  TOO_MANY_ACTIVE_JOBS: "May chu dang xu ly yeu cau khac. Hay thu lai sau.",
  VIDEO_TOO_LONG: "Video vuot qua thoi luong cho phep.",
  JOB_NOT_FOUND: "Khong tim thay yeu cau.",
  JOB_NOT_READY: "File MP3 chua san sang.",
  CONVERSION_FAILED: "Khong the trich xuat MP3 tu video nay."
};

function readableError(code) {
  return messages[code] || "Co loi xay ra. Hay thu lai.";
}

export function initMp3Tool({ requestJson }) {
  const jobForm = document.querySelector("#jobForm");
  const submitButton = document.querySelector("#submitButton");
  const jobMessage = document.querySelector("#jobMessage");
  const statusBox = document.querySelector("#statusBox");
  const statusTitle = document.querySelector("#statusTitle");
  const statusMessage = document.querySelector("#statusMessage");
  const downloadLink = document.querySelector("#downloadLink");
  let pollTimer = null;

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function setStatus(title, message) {
    statusBox.hidden = false;
    statusTitle.textContent = title;
    statusMessage.textContent = message || "";
  }

  function clearStatus() {
    statusBox.hidden = true;
    statusTitle.textContent = "";
    statusMessage.textContent = "";
  }

  function reset() {
    stopPolling();
    clearStatus();
    downloadLink.hidden = true;
    downloadLink.removeAttribute("href");
    downloadLink.removeAttribute("download");
    jobMessage.textContent = "";
    submitButton.disabled = false;
  }

  async function pollJob(id) {
    pollTimer = setInterval(async () => {
      try {
        const job = await requestJson(`/api/jobs/${id}`);

        if (job.status === "queued" || job.status === "processing") {
          setStatus("Dang xu ly", job.message);
          return;
        }

        if (job.status === "ready") {
          stopPolling();
          submitButton.disabled = false;
          setStatus("Hoan tat", job.title || "File MP3 da san sang.");
          downloadLink.href = `/api/jobs/${id}/download`;
          downloadLink.download = job.filename || "audio.mp3";
          downloadLink.hidden = false;
          return;
        }

        if (job.status === "failed") {
          stopPolling();
          submitButton.disabled = false;
          clearStatus();
          jobMessage.textContent = readableError(job.error || "CONVERSION_FAILED");
        }
      } catch (error) {
        stopPolling();
        submitButton.disabled = false;
        clearStatus();
        jobMessage.textContent = readableError(error.message);
      }
    }, 1500);
  }

  jobForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    reset();
    submitButton.disabled = true;
    setStatus("Dang gui yeu cau", "May chu dang kiem tra link YouTube.");

    const url = new FormData(jobForm).get("youtubeUrl");

    try {
      const job = await requestJson("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ url })
      });
      pollJob(job.id);
    } catch (error) {
      submitButton.disabled = false;
      clearStatus();
      jobMessage.textContent = readableError(error.message);
    }
  });

  reset();
}
