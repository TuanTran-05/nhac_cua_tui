export function byId(id) {
  return document.getElementById(id);
}

export function setMessage(element, message = "") {
  element.textContent = message;
}

export function createToolNavigator({ titleElement, navButtons, viewElements }) {
  const titles = {
    dashboard: "Dashboard",
    mp3: "MP3 Converter",
    qr: "QR Generator",
    json: "JSON Formatter",
    password: "Password Generator",
    pdf: "PDF Tools"
  };

  function showTool(tool) {
    for (const view of viewElements) {
      view.hidden = view.dataset.toolView !== tool;
    }

    for (const button of navButtons) {
      button.classList.toggle("is-active", button.dataset.tool === tool);
    }

    titleElement.textContent = titles[tool] || "Dashboard";
  }

  return { showTool };
}
