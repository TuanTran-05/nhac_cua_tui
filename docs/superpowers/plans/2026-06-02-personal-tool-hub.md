# Personal Tool Hub V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the existing password-protected MP3 converter into a private personal tool hub with dashboard navigation, QR generation, JSON formatting, and password generation.

**Architecture:** Keep the current Express + static frontend + Docker structure. Add one authenticated backend endpoint for QR SVG generation, then split the frontend into small browser modules for app shell state, MP3 conversion, QR, JSON, and password tools. JSON and password tools run fully client-side; QR text is sent to the backend only long enough to generate SVG and is not persisted.

**Tech Stack:** Node.js 20, Express, cookie-parser, dotenv, node:test, supertest, qrcode, browser ES modules, Docker.

---

## File Structure

- Modify: `package.json` and `package-lock.json`
  - Add `qrcode` runtime dependency.
- Create: `src/tools/qr.js`
  - Validate QR text and generate SVG.
- Modify: `src/app.js`
  - Inject QR tool and mount `POST /api/tools/qr`.
- Create: `test/qr.test.js`
  - Unit tests for QR validation and SVG generation.
- Modify: `test/api.test.js`
  - API tests for authenticated QR endpoint.
- Replace: `public/index.html`
  - Login screen, app shell, dashboard, and four tool views.
- Replace: `public/styles.css`
  - Full responsive layout for tool hub and tool forms.
- Delete: `public/app.js`
  - Replaced by browser modules.
- Create: `public/js/api.js`
  - Shared `requestJson`.
- Create: `public/js/state.js`
  - Shared DOM helpers, view switching, status helper.
- Create: `public/js/tools/mp3.js`
  - Current MP3 converter behavior moved out of monolithic app.
- Create: `public/js/tools/qr.js`
  - QR form, preview rendering, SVG download.
- Create: `public/js/tools/json.js`
  - JSON validate, format, minify, copy.
- Create: `public/js/tools/password.js`
  - Crypto-backed password generator and copy.
- Create: `public/js/app.js`
  - Login/logout, app initialization, tool navigation.
- Modify: `test/frontend-assets.test.js`
  - Static checks for tool hub markup and hidden behavior.
- Modify: `README.md`
  - Document new tools and deployment/update commands.

## Task 1: Add QR Dependency

**Files:**
- Modify: `package.json`
- Generate: `package-lock.json`

- [ ] **Step 1: Install the QR package**

Run:

```powershell
npm.cmd install qrcode
```

Expected: `package.json` contains `qrcode` under `dependencies`, and `package-lock.json` is updated.

- [ ] **Step 2: Run the existing tests**

Run:

```powershell
npm.cmd test
```

Expected: existing test suite still passes.

- [ ] **Step 3: Commit dependency change**

Run:

```powershell
git add package.json package-lock.json
git commit -m "chore: add qr generation dependency"
```

Expected: commit succeeds.

## Task 2: QR Tool Backend Module

**Files:**
- Create: `src/tools/qr.js`
- Create: `test/qr.test.js`

- [ ] **Step 1: Write failing QR unit tests**

Create `test/qr.test.js`:

```js
const assert = require("node:assert/strict");
const test = require("node:test");
const { generateQrSvg, validateQrText } = require("../src/tools/qr");

test("validateQrText rejects empty input", () => {
  assert.throws(() => validateQrText(""), /QR_TEXT_REQUIRED/);
  assert.throws(() => validateQrText("   "), /QR_TEXT_REQUIRED/);
});

test("validateQrText rejects input longer than 2048 chars", () => {
  assert.throws(() => validateQrText("x".repeat(2049)), /QR_TEXT_TOO_LONG/);
});

test("validateQrText trims valid input", () => {
  assert.equal(validateQrText("  https://example.com  "), "https://example.com");
});

test("generateQrSvg returns SVG and filename", async () => {
  const fakeQr = {
    async toString(text, options) {
      assert.equal(text, "hello");
      assert.equal(options.type, "svg");
      return "<svg><path d=\"M0 0h1v1z\"/></svg>";
    }
  };

  const result = await generateQrSvg("hello", fakeQr);

  assert.equal(result.filename, "qr-code.svg");
  assert.match(result.svg, /^<svg/);
});

test("generateQrSvg maps generator failures to QR_GENERATION_FAILED", async () => {
  const fakeQr = {
    async toString() {
      throw new Error("library failed");
    }
  };

  await assert.rejects(() => generateQrSvg("hello", fakeQr), /QR_GENERATION_FAILED/);
});
```

- [ ] **Step 2: Run QR unit tests and verify failure**

Run:

```powershell
npm.cmd test -- test/qr.test.js
```

Expected: FAIL because `src/tools/qr.js` does not exist.

- [ ] **Step 3: Implement `src/tools/qr.js`**

Create `src/tools/qr.js`:

```js
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
```

- [ ] **Step 4: Run QR unit tests and verify pass**

Run:

```powershell
npm.cmd test -- test/qr.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit QR backend module**

Run:

```powershell
git add src/tools/qr.js test/qr.test.js
git commit -m "feat: add qr svg generator"
```

Expected: commit succeeds.

## Task 3: Authenticated QR API Route

**Files:**
- Modify: `src/app.js`
- Modify: `test/api.test.js`

- [ ] **Step 1: Add failing API tests**

Append these tests to `test/api.test.js`:

```js
test("POST /api/tools/qr rejects anonymous requests", async () => {
  const app = makeApp({});

  const response = await request(app)
    .post("/api/tools/qr")
    .send({ text: "hello" });

  assert.equal(response.status, 401);
});

test("POST /api/tools/qr returns SVG after login", async () => {
  const qrTool = {
    async generateQrSvg(text) {
      assert.equal(text, "hello");
      return {
        svg: "<svg><path d=\"M0 0h1v1z\"/></svg>",
        filename: "qr-code.svg"
      };
    }
  };
  const app = makeApp({}, qrTool);
  const agent = request.agent(app);

  await agent.post("/api/login").send({ password: "secret" }).expect(200);

  const response = await agent
    .post("/api/tools/qr")
    .send({ text: "hello" })
    .expect(200);

  assert.equal(response.body.filename, "qr-code.svg");
  assert.match(response.body.svg, /^<svg/);
});
```

Modify the `makeApp` helper near the top of `test/api.test.js`:

```js
function makeApp(jobService, qrTool) {
  const auth = createAuth(config);
  return createApp({ auth, jobService, qrTool });
}
```

- [ ] **Step 2: Run API tests and verify failure**

Run:

```powershell
npm.cmd test -- test/api.test.js
```

Expected: FAIL because `createApp` does not mount `/api/tools/qr`.

- [ ] **Step 3: Update `src/app.js`**

Add this import near the top:

```js
const defaultQrTool = require("./tools/qr");
```

Change the function signature:

```js
function createApp({ auth, jobService, qrTool = defaultQrTool }) {
```

Add this route after the logout route and before `/api/jobs`:

```js
  app.post("/api/tools/qr", auth.requireAuth, async (req, res) => {
    try {
      const result = await qrTool.generateQrSvg(req.body?.text);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });
```

- [ ] **Step 4: Run API tests and verify pass**

Run:

```powershell
npm.cmd test -- test/api.test.js
```

Expected: PASS.

- [ ] **Step 5: Run complete tests**

Run:

```powershell
npm.cmd test
```

Expected: all tests pass.

- [ ] **Step 6: Commit QR route**

Run:

```powershell
git add src/app.js test/api.test.js
git commit -m "feat: expose authenticated qr api"
```

Expected: commit succeeds.

## Task 4: Tool Hub Markup

**Files:**
- Replace: `public/index.html`
- Modify: `test/frontend-assets.test.js`

- [ ] **Step 1: Add failing static markup tests**

Append to `test/frontend-assets.test.js`:

```js
test("HTML contains personal tool hub navigation and views", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");

  assert.match(html, /id="dashboardView"/);
  assert.match(html, /id="mp3ToolView"/);
  assert.match(html, /id="qrToolView"/);
  assert.match(html, /id="jsonToolView"/);
  assert.match(html, /id="passwordToolView"/);
  assert.match(html, /data-tool="mp3"/);
  assert.match(html, /data-tool="qr"/);
  assert.match(html, /data-tool="json"/);
  assert.match(html, /data-tool="password"/);
});
```

- [ ] **Step 2: Run frontend static tests and verify failure**

Run:

```powershell
npm.cmd test -- test/frontend-assets.test.js
```

Expected: FAIL because the current HTML only contains the MP3 converter view.

- [ ] **Step 3: Replace `public/index.html`**

Replace the file with:

```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Personal Tool Hub</title>
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body>
    <main class="app-shell">
      <section id="loginView" class="login-panel">
        <div class="brand-mark" aria-hidden="true">TH</div>
        <h1>Dang nhap</h1>
        <p class="muted">Nhap mat khau de mo bo cong cu ca nhan.</p>
        <form id="loginForm" class="form">
          <label for="password">Mat khau</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required>
          <button type="submit">Vao tool hub</button>
          <p id="loginMessage" class="message" role="status"></p>
        </form>
      </section>

      <section id="appView" class="tool-shell" hidden>
        <header class="topbar">
          <div>
            <p class="app-label">Private Tools</p>
            <h1 id="activeToolTitle">Dashboard</h1>
          </div>
          <button id="logoutButton" class="ghost-button" type="button">Dang xuat</button>
        </header>

        <div class="workspace">
          <nav class="tool-nav" aria-label="Tool navigation">
            <button class="tool-nav-item is-active" type="button" data-tool="dashboard">Dashboard</button>
            <button class="tool-nav-item" type="button" data-tool="mp3">MP3</button>
            <button class="tool-nav-item" type="button" data-tool="qr">QR</button>
            <button class="tool-nav-item" type="button" data-tool="json">JSON</button>
            <button class="tool-nav-item" type="button" data-tool="password">Password</button>
          </nav>

          <section class="tool-content">
            <section id="dashboardView" class="tool-view" data-tool-view="dashboard">
              <div class="tool-grid">
                <button class="tool-card" type="button" data-tool="mp3">
                  <span>MP3 Converter</span>
                  <small>Trich audio MP3 tu link YouTube duoc phep su dung.</small>
                </button>
                <button class="tool-card" type="button" data-tool="qr">
                  <span>QR Generator</span>
                  <small>Tao QR SVG tu link hoac text.</small>
                </button>
                <button class="tool-card" type="button" data-tool="json">
                  <span>JSON Formatter</span>
                  <small>Format, minify va kiem tra JSON.</small>
                </button>
                <button class="tool-card" type="button" data-tool="password">
                  <span>Password Generator</span>
                  <small>Tao mat khau manh bang browser crypto.</small>
                </button>
              </div>
            </section>

            <section id="mp3ToolView" class="tool-view" data-tool-view="mp3" hidden>
              <form id="jobForm" class="form">
                <label for="youtubeUrl">Link YouTube</label>
                <input id="youtubeUrl" name="youtubeUrl" type="url" required>
                <button id="submitButton" type="submit">Trich xuat MP3</button>
              </form>
              <div id="statusBox" class="status-box" hidden>
                <div class="spinner" aria-hidden="true"></div>
                <div>
                  <p id="statusTitle" class="status-title">Dang xu ly</p>
                  <p id="statusMessage" class="muted"></p>
                </div>
              </div>
              <a id="downloadLink" class="download-button" hidden>Tai MP3</a>
              <p id="jobMessage" class="message" role="status"></p>
            </section>

            <section id="qrToolView" class="tool-view" data-tool-view="qr" hidden>
              <form id="qrForm" class="form">
                <label for="qrText">Text hoac link</label>
                <textarea id="qrText" name="qrText" rows="5" maxlength="2048" required></textarea>
                <button id="qrButton" type="submit">Tao QR</button>
              </form>
              <div id="qrPreview" class="qr-preview" hidden></div>
              <button id="qrDownloadButton" type="button" hidden>Tai SVG</button>
              <p id="qrMessage" class="message" role="status"></p>
            </section>

            <section id="jsonToolView" class="tool-view" data-tool-view="json" hidden>
              <div class="split-tool">
                <div class="form">
                  <label for="jsonInput">JSON input</label>
                  <textarea id="jsonInput" rows="14" spellcheck="false"></textarea>
                  <div class="button-row">
                    <button id="formatJsonButton" type="button">Format</button>
                    <button id="minifyJsonButton" class="secondary-button" type="button">Minify</button>
                    <button id="copyJsonButton" class="secondary-button" type="button">Copy</button>
                  </div>
                </div>
                <div class="form">
                  <label for="jsonOutput">Output</label>
                  <textarea id="jsonOutput" rows="14" spellcheck="false" readonly></textarea>
                </div>
              </div>
              <p id="jsonMessage" class="message" role="status"></p>
            </section>

            <section id="passwordToolView" class="tool-view" data-tool-view="password" hidden>
              <div class="form">
                <label for="passwordLength">Do dai</label>
                <input id="passwordLength" type="number" min="8" max="128" value="20">
                <label><input id="includeLowercase" type="checkbox" checked> Chu thuong</label>
                <label><input id="includeUppercase" type="checkbox" checked> Chu hoa</label>
                <label><input id="includeNumbers" type="checkbox" checked> So</label>
                <label><input id="includeSymbols" type="checkbox" checked> Ky tu dac biet</label>
                <button id="generatePasswordButton" type="button">Tao mat khau</button>
                <input id="generatedPassword" type="text" readonly>
                <button id="copyPasswordButton" class="secondary-button" type="button">Copy</button>
              </div>
              <p id="passwordMessage" class="message" role="status"></p>
            </section>
          </section>
        </div>
      </section>
    </main>
    <script type="module" src="/js/app.js"></script>
  </body>
</html>
```

- [ ] **Step 4: Run frontend static tests and verify pass**

Run:

```powershell
npm.cmd test -- test/frontend-assets.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit tool hub markup**

Run:

```powershell
git add public/index.html test/frontend-assets.test.js
git commit -m "feat: add tool hub markup"
```

Expected: commit succeeds.

## Task 5: Tool Hub Styling

**Files:**
- Replace: `public/styles.css`

- [ ] **Step 1: Replace `public/styles.css`**

Replace the file with a responsive style system that keeps `[hidden]` reliable:

```css
:root {
  color-scheme: light;
  --bg: #f5f7fb;
  --panel: #ffffff;
  --text: #172033;
  --muted: #667085;
  --border: #d9dfeb;
  --accent: #df2f35;
  --accent-dark: #bc2028;
  --surface: #fbfcff;
  --focus: #2c6bed;
  --shadow: 0 18px 50px rgba(23, 32, 51, 0.12);
}

* { box-sizing: border-box; }
[hidden] { display: none !important; }

body {
  margin: 0;
  min-height: 100vh;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: radial-gradient(circle at top left, #ffe8e9 0, transparent 32rem), var(--bg);
  color: var(--text);
}

.app-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 28px 16px;
}

.login-panel,
.tool-shell {
  width: min(100%, 1120px);
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: var(--shadow);
}

.login-panel {
  max-width: 520px;
  padding: 30px;
}

.brand-mark {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: var(--accent);
  color: #ffffff;
  font-weight: 800;
  font-size: 14px;
}

.topbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 24px 26px;
  border-bottom: 1px solid var(--border);
}

.topbar h1,
.login-panel h1 {
  margin: 8px 0 8px;
  font-size: 30px;
  line-height: 1.15;
}

.app-label {
  margin: 0;
  color: var(--accent);
  font-weight: 800;
  font-size: 13px;
}

.muted {
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}

.workspace {
  display: grid;
  grid-template-columns: 190px 1fr;
  min-height: 560px;
}

.tool-nav {
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 18px;
  border-right: 1px solid var(--border);
  background: #f8f9fd;
}

.tool-nav-item,
.tool-card,
button,
.download-button {
  border-radius: 8px;
  font: inherit;
  cursor: pointer;
}

.tool-nav-item {
  min-height: 42px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--muted);
  font-weight: 800;
  text-align: left;
  padding: 0 12px;
}

.tool-nav-item.is-active {
  background: #ffffff;
  border-color: var(--border);
  color: var(--text);
}

.tool-content {
  padding: 24px;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.tool-card {
  min-height: 130px;
  border: 1px solid var(--border);
  background: var(--surface);
  padding: 18px;
  text-align: left;
}

.tool-card span {
  display: block;
  margin-bottom: 8px;
  font-weight: 900;
  font-size: 18px;
}

.tool-card small {
  color: var(--muted);
  line-height: 1.45;
}

.form {
  display: grid;
  gap: 12px;
}

label {
  font-size: 14px;
  font-weight: 800;
}

input,
textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 14px;
  color: var(--text);
  font: inherit;
}

textarea {
  resize: vertical;
}

input:focus,
textarea:focus {
  border-color: var(--focus);
  box-shadow: 0 0 0 3px rgba(44, 107, 237, 0.16);
  outline: none;
}

button,
.download-button {
  min-height: 46px;
  border: 0;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--accent);
  color: #ffffff;
  font-weight: 900;
  text-decoration: none;
}

button:hover,
.download-button:hover {
  background: var(--accent-dark);
}

.secondary-button,
.ghost-button {
  background: #ffffff;
  color: var(--text);
  border: 1px solid var(--border);
}

.secondary-button:hover,
.ghost-button:hover {
  background: #f2f4f8;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.split-tool {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.status-box,
.qr-preview {
  margin-top: 18px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}

.status-box {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 14px;
  align-items: center;
}

.status-title {
  margin: 0 0 4px;
  font-weight: 900;
}

.spinner {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 3px solid #f0b4b7;
  border-top-color: var(--accent);
  animation: spin 0.9s linear infinite;
}

.download-button {
  margin-top: 18px;
  width: 100%;
}

.qr-preview svg {
  display: block;
  width: min(100%, 280px);
  height: auto;
  margin: 0 auto;
}

.message {
  min-height: 22px;
  margin: 14px 0 0;
  color: var(--accent-dark);
  line-height: 1.4;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 760px) {
  .workspace,
  .split-tool,
  .tool-grid {
    grid-template-columns: 1fr;
  }

  .tool-nav {
    grid-auto-flow: column;
    grid-auto-columns: max-content;
    overflow-x: auto;
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }

  .topbar {
    align-items: flex-start;
  }
}
```

- [ ] **Step 2: Run static frontend tests**

Run:

```powershell
npm.cmd test -- test/frontend-assets.test.js
```

Expected: PASS, including hidden attribute check.

- [ ] **Step 3: Commit styling**

Run:

```powershell
git add public/styles.css
git commit -m "feat: style personal tool hub"
```

Expected: commit succeeds.

## Task 6: Shared Frontend Modules And App Shell

**Files:**
- Delete: `public/app.js`
- Create: `public/js/api.js`
- Create: `public/js/state.js`
- Create: `public/js/app.js`

- [ ] **Step 1: Remove old frontend entrypoint**

Run:

```powershell
git rm public/app.js
```

Expected: `public/app.js` is staged for deletion.

- [ ] **Step 2: Create `public/js/api.js`**

Create:

```js
export async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "REQUEST_FAILED");
  }

  return data;
}
```

- [ ] **Step 3: Create `public/js/state.js`**

Create:

```js
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
    password: "Password Generator"
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
```

- [ ] **Step 4: Create `public/js/app.js`**

Create:

```js
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
```

- [ ] **Step 5: Run current tests and observe expected module failures**

Run:

```powershell
npm.cmd test
```

Expected: backend/static tests pass. Browser runtime is not tested yet; missing tool modules will be created in later tasks.

- [ ] **Step 6: Commit shared frontend shell**

Run:

```powershell
git add public/js/api.js public/js/state.js public/js/app.js public/app.js
git commit -m "feat: add modular app shell"
```

Expected: commit succeeds.

## Task 7: MP3 Frontend Module

**Files:**
- Create: `public/js/tools/mp3.js`

- [ ] **Step 1: Create `public/js/tools/mp3.js`**

Create:

```js
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
```

- [ ] **Step 2: Run tests**

Run:

```powershell
npm.cmd test
```

Expected: all automated tests pass.

- [ ] **Step 3: Commit MP3 frontend module**

Run:

```powershell
git add public/js/tools/mp3.js
git commit -m "feat: modularize mp3 tool"
```

Expected: commit succeeds.

## Task 8: JSON Formatter Module

**Files:**
- Create: `public/js/tools/json.js`

- [ ] **Step 1: Create `public/js/tools/json.js`**

Create:

```js
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
```

- [ ] **Step 2: Run tests**

Run:

```powershell
npm.cmd test
```

Expected: all automated tests pass.

- [ ] **Step 3: Commit JSON formatter**

Run:

```powershell
git add public/js/tools/json.js
git commit -m "feat: add json formatter tool"
```

Expected: commit succeeds.

## Task 9: Password Generator Module

**Files:**
- Create: `public/js/tools/password.js`

- [ ] **Step 1: Create `public/js/tools/password.js`**

Create:

```js
const groups = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?"
};

function randomIndex(max) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

function buildPassword(length, charset) {
  let password = "";
  for (let index = 0; index < length; index += 1) {
    password += charset[randomIndex(charset.length)];
  }
  return password;
}

export function initPasswordTool() {
  const lengthInput = document.querySelector("#passwordLength");
  const lowercase = document.querySelector("#includeLowercase");
  const uppercase = document.querySelector("#includeUppercase");
  const numbers = document.querySelector("#includeNumbers");
  const symbols = document.querySelector("#includeSymbols");
  const generateButton = document.querySelector("#generatePasswordButton");
  const copyButton = document.querySelector("#copyPasswordButton");
  const output = document.querySelector("#generatedPassword");
  const message = document.querySelector("#passwordMessage");

  generateButton.addEventListener("click", () => {
    const length = Number(lengthInput.value);
    let charset = "";

    if (!Number.isInteger(length) || length < 8 || length > 128) {
      message.textContent = "Do dai phai tu 8 den 128.";
      return;
    }

    if (lowercase.checked) charset += groups.lowercase;
    if (uppercase.checked) charset += groups.uppercase;
    if (numbers.checked) charset += groups.numbers;
    if (symbols.checked) charset += groups.symbols;

    if (!charset) {
      message.textContent = "Chon it nhat mot nhom ky tu.";
      return;
    }

    output.value = buildPassword(length, charset);
    message.textContent = "Da tao mat khau.";
  });

  copyButton.addEventListener("click", async () => {
    if (!output.value) {
      message.textContent = "Chua co mat khau de copy.";
      return;
    }

    try {
      await navigator.clipboard.writeText(output.value);
      message.textContent = "Da copy mat khau.";
    } catch {
      message.textContent = "Khong the copy tu dong. Hay copy thu cong.";
    }
  });
}
```

- [ ] **Step 2: Run tests**

Run:

```powershell
npm.cmd test
```

Expected: all automated tests pass.

- [ ] **Step 3: Commit password generator**

Run:

```powershell
git add public/js/tools/password.js
git commit -m "feat: add password generator tool"
```

Expected: commit succeeds.

## Task 10: QR Frontend Module

**Files:**
- Create: `public/js/tools/qr.js`

- [ ] **Step 1: Create `public/js/tools/qr.js`**

Create:

```js
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
```

- [ ] **Step 2: Run tests**

Run:

```powershell
npm.cmd test
```

Expected: all automated tests pass.

- [ ] **Step 3: Commit QR frontend**

Run:

```powershell
git add public/js/tools/qr.js
git commit -m "feat: add qr generator tool"
```

Expected: commit succeeds.

## Task 11: Documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README tool list**

Add this section after the intro:

```markdown
## Tools

- MP3 Converter: convert permitted YouTube videos to temporary MP3 downloads.
- QR Generator: create an SVG QR code from text or a URL.
- JSON Formatter: format, minify, validate, and copy JSON locally in the browser.
- Password Generator: generate and copy browser-crypto passwords locally.
```

- [ ] **Step 2: Update deployment note**

Add this sentence in the deployment section:

```markdown
The QR, JSON, and password tools do not require extra system packages. The MP3 converter still requires `yt-dlp` and `ffmpeg`, which are installed by the Dockerfile.
```

- [ ] **Step 3: Commit documentation**

Run:

```powershell
git add README.md
git commit -m "docs: describe personal tool hub"
```

Expected: commit succeeds.

## Task 12: Full Verification

**Files:**
- Read: all changed files
- Modify only if verification fails

- [ ] **Step 1: Run complete test suite**

Run:

```powershell
npm.cmd test
```

Expected: all tests pass.

- [ ] **Step 2: Start local server**

Run:

```powershell
$env:APP_PASSWORD='secret'; $env:SESSION_SECRET='session-secret'; $env:PORT='3100'; npm.cmd start
```

Expected: `Server listening on http://localhost:3100`.

- [ ] **Step 3: Manual browser verification**

Open:

```text
http://localhost:3100
```

Expected:

- Login with wrong password shows an error.
- Login with `secret` opens Dashboard.
- Dashboard cards switch to each tool.
- Sidebar navigation switches to each tool.
- MP3 tool starts idle with no status or download button visible.
- QR tool generates a visible SVG QR from `https://example.com` and downloads `qr-code.svg`.
- JSON tool formats `{"a":1}` to indented JSON.
- JSON tool minifies `{ "a": 1 }` to `{"a":1}`.
- Password tool generates a password of selected length and can copy it.

- [ ] **Step 4: Build Docker image**

Run:

```powershell
docker build -t youtube-mp3-app .
```

Expected: Docker image builds.

- [ ] **Step 5: Run Docker image**

Run:

```powershell
docker run --rm -p 3101:3000 -e APP_PASSWORD=secret -e SESSION_SECRET=session-secret youtube-mp3-app
```

Expected: `http://localhost:3101` serves the tool hub.

- [ ] **Step 6: Commit verification fixes if needed**

Run only if code changed during verification:

```powershell
git add .
git commit -m "fix: resolve tool hub verification issues"
```

Expected: commit succeeds when there are changes. Skip when `git status --short` is clean.

## Completeness Review

- Spec coverage: dashboard and navigation are implemented by Tasks 4-6; QR backend by Tasks 2-3; QR frontend by Task 10; JSON formatter by Task 8; password generator by Task 9; MP3 preservation by Task 7; docs and verification by Tasks 11-12.
- Scope control: no database, user accounts, upload tools, PDF tools, image tools, analytics, or public access are included in V1.
- Type and name consistency: endpoint is `POST /api/tools/qr`, frontend IDs match `public/index.html`, QR errors are `QR_TEXT_REQUIRED`, `QR_TEXT_TOO_LONG`, and `QR_GENERATION_FAILED`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-02-personal-tool-hub.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?
