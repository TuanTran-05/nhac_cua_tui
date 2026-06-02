import { requestJson } from "./api.js";
import { byId, createToolNavigator, setMessage } from "./state.js";
import { initMp3Tool } from "./tools/mp3.js";
import { initQrTool } from "./tools/qr.js";
import { initJsonTool } from "./tools/json.js";
import { initPasswordTool } from "./tools/password.js";

const loginView = byId("loginView");
const appView = byId("appView");
const loginForm = byId("loginForm");
const loginMessage = byId("loginMessage");
const logoutButton = byId("logoutButton");
const titleElement = byId("activeToolTitle");
const navButtons = Array.from(document.querySelectorAll("[data-tool]")).filter((button) =>
  button.classList.contains("tool-nav-item")
);
const cardButtons = Array.from(document.querySelectorAll(".tool-card[data-tool]"));
const viewElements = Array.from(document.querySelectorAll("[data-tool-view]"));

const navigator = createToolNavigator({ titleElement, navButtons, viewElements });

function showLogin() {
  loginView.hidden = false;
  appView.hidden = true;
}

function showApp() {
  loginView.hidden = true;
  appView.hidden = false;
  navigator.showTool("dashboard");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(loginMessage);

  const password = new FormData(loginForm).get("password");

  try {
    await requestJson("/api/login", {
      method: "POST",
      body: JSON.stringify({ password })
    });
    loginForm.reset();
    showApp();
  } catch {
    setMessage(loginMessage, "Mat khau khong dung.");
  }
});

logoutButton.addEventListener("click", async () => {
  await requestJson("/api/logout", { method: "POST", body: "{}" }).catch(() => null);
  showLogin();
});

for (const button of [...navButtons, ...cardButtons]) {
  button.addEventListener("click", () => {
    navigator.showTool(button.dataset.tool);
  });
}

initMp3Tool({ requestJson });
initQrTool({ requestJson });
initJsonTool();
initPasswordTool();
showLogin();
