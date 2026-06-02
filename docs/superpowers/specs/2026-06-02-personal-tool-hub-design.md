# Personal Tool Hub V1 Design

## Goal

Expand the current password-protected YouTube MP3 app into a small personal web tool hub. The first version should add a home dashboard and three lightweight tools while preserving the current MP3 converter behavior.

The app remains a private utility for one owner or a small trusted group. It should not become a public SaaS product in this phase.

## Selected Scope

V1 includes four tools:

1. YouTube MP3 converter
   - Existing feature.
   - Keep the current job flow, password protection, duration limit, temporary cleanup, and Docker deployment.

2. QR generator
   - User enters text or a URL.
   - App generates a QR code preview.
   - User can download the QR code as SVG.
   - QR generation is handled by a protected backend endpoint so the frontend stays simple and the implementation can be tested through API tests.

3. JSON formatter
   - User pastes JSON.
   - App validates and pretty-prints JSON.
   - App can minify JSON.
   - App shows clear validation errors.
   - This runs client-side because it does not need server resources.

4. Password generator
   - User chooses length and character groups.
   - App generates a password using browser crypto.
   - App supports copy-to-clipboard.
   - This runs client-side because it is simple, fast, and avoids storing secrets.

## Product Shape

The current single converter screen becomes a private app shell:

- Header area with app name, current tool title, and logout button.
- Sidebar or compact tab navigation for tools.
- Main area that shows the selected tool.
- Mobile layout collapses navigation into a horizontal tool list above the active tool.

The first screen after login should be a dashboard/home view with short tool tiles:

- MP3 Converter
- QR Generator
- JSON Formatter
- Password Generator

Clicking a tile opens the tool in the same page without a full page reload.

## Architecture

Keep the existing Express + static frontend architecture.

Backend responsibilities:

- Existing auth and MP3 job APIs.
- New authenticated QR API endpoint:
  - `POST /api/tools/qr`
  - Request: `{ "text": "..." }`
  - Response: `{ "svg": "...", "filename": "qr-code.svg" }`
- No database.
- No persistence for generated QR, JSON, or passwords.

Frontend responsibilities:

- App shell and navigation.
- MP3 converter UI extracted into a reusable view.
- QR form, preview, and SVG download.
- JSON formatter/minifier.
- Password generator and clipboard handling.

## File Organization

The current `public/app.js` is large enough that adding multiple tools into it would make future work harder. V1 should split frontend code into small files:

- `public/js/api.js`: shared JSON request helper.
- `public/js/state.js`: view switching and shared DOM helpers.
- `public/js/tools/mp3.js`: existing MP3 converter behavior.
- `public/js/tools/qr.js`: QR form, preview, download.
- `public/js/tools/json.js`: JSON formatter/minifier.
- `public/js/tools/password.js`: password generation and clipboard.
- `public/js/app.js`: bootstraps login, logout, navigation, and tool modules.

Backend QR code logic should live in:

- `src/tools/qr.js`: validates text and generates SVG using the `qrcode` npm package.

## Error Handling

MP3 converter keeps existing error messages.

QR generator:

- Empty input returns `QR_TEXT_REQUIRED`.
- Input longer than 2048 characters returns `QR_TEXT_TOO_LONG`.
- Backend generation failure returns `QR_GENERATION_FAILED`.

JSON formatter:

- Empty input shows a local message.
- Invalid JSON shows the parser error message.

Password generator:

- Length must be between 8 and 128.
- At least one character group must be selected.
- Copy button shows success or fallback message.

## Security And Privacy

- All tool APIs remain behind the existing auth cookie.
- Passwords are generated in the browser and never sent to the server.
- JSON formatting is local and never sent to the server.
- QR text is sent to the server only for QR SVG generation and is not stored.
- No history feature in V1.
- No file persistence beyond the existing MP3 temporary jobs.

## Testing And Verification

Backend tests:

- QR generator rejects empty text.
- QR generator rejects too-long text.
- QR generator returns SVG for valid text.
- `/api/tools/qr` requires auth.
- `/api/tools/qr` returns SVG after login.

Frontend static tests:

- HTML contains the app shell, tool navigation, and each tool view.
- Hidden tool views stay hidden through the `[hidden]` CSS rule.
- Frontend JS modules export expected initializers where practical.

Manual verification:

- Login opens the tool hub.
- Navigation switches between dashboard and all tools.
- MP3 converter still shows idle state correctly.
- JSON formatter formats, minifies, and reports invalid JSON.
- Password generator creates and copies a password.
- QR generator creates a visible QR preview and downloadable SVG.
- Docker image builds and serves the expanded app.

## Out Of Scope

- User accounts.
- Database-backed history.
- Public anonymous access.
- Batch jobs.
- File upload tools.
- PDF/image conversion tools.
- Cloud storage.
- Admin panel.
- Analytics.

These can be added in later specs after V1 is stable.
