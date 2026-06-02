export function initJsonTool() {
  const input = document.querySelector("#jsonInput");
  const output = document.querySelector("#jsonOutput");
  const formatButton = document.querySelector("#formatJsonButton");
  const minifyButton = document.querySelector("#minifyJsonButton");
  const copyButton = document.querySelector("#copyJsonButton");
  const message = document.querySelector("#jsonMessage");

  function parseInput() {
    const raw = input.value.trim();
    if (!raw) {
      throw new Error("Vui long nhap JSON.");
    }
    return JSON.parse(raw);
  }

  function showError(error) {
    message.textContent = error.message || "JSON khong hop le.";
  }

  formatButton.addEventListener("click", () => {
    try {
      output.value = JSON.stringify(parseInput(), null, 2);
      message.textContent = "Da format JSON.";
    } catch (error) {
      showError(error);
    }
  });

  minifyButton.addEventListener("click", () => {
    try {
      output.value = JSON.stringify(parseInput());
      message.textContent = "Da minify JSON.";
    } catch (error) {
      showError(error);
    }
  });

  copyButton.addEventListener("click", async () => {
    if (!output.value) {
      message.textContent = "Chua co output de copy.";
      return;
    }

    try {
      await navigator.clipboard.writeText(output.value);
      message.textContent = "Da copy output.";
    } catch {
      message.textContent = "Khong the copy tu dong. Hay copy thu cong.";
    }
  });
}
