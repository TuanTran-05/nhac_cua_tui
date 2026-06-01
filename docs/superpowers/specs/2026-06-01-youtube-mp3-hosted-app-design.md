# YouTube MP3 Hosted App Design

## Goal

Build a small hosted web app where an authorized user can paste a YouTube URL, convert the video's audio to MP3, download the resulting file immediately, and have the server clean up temporary files automatically.

The app is intended for content the user owns or has permission to download and convert. It should not be positioned as a public, anonymous YouTube download service.

## Selected Approach

Use a simple Node.js Express application with static HTML, CSS, and client-side JavaScript. The server runs `yt-dlp` to fetch audio metadata/media and `ffmpeg` to produce an MP3. The whole app ships with a Dockerfile so it can be deployed on a VPS or Docker-capable hosting provider.

This is preferred over a queue/database architecture because the requested product is a simple hosted tool, not a multi-user media platform.

## User Experience

The app has two screens:

1. Password screen
   - User enters a shared password.
   - The server verifies it against `APP_PASSWORD`.
   - On success, the browser receives a session cookie.

2. Converter screen
   - User pastes a YouTube URL.
   - User clicks `Trich xuat MP3`.
   - The UI shows progress/status text such as validating, downloading, converting, ready, or failed.
   - When conversion succeeds, the UI shows a download button.
   - After download or expiry, the server deletes temporary files.

The UI should be Vietnamese, minimal, responsive, and work well on desktop and mobile.

## Backend Design

Express endpoints:

- `GET /` serves the app shell.
- `POST /api/login` checks `APP_PASSWORD` and sets an HTTP-only session cookie.
- `POST /api/jobs` validates the YouTube URL, starts a conversion job, and returns a job id.
- `GET /api/jobs/:id` returns job status.
- `GET /api/jobs/:id/download` streams the MP3 when ready.
- `POST /api/logout` clears the session cookie.

Jobs are kept in memory for the first version. Each job owns a temporary working directory under `tmp/jobs/<jobId>`.

## Conversion Flow

1. Validate the submitted URL hostname and basic shape.
2. Run `yt-dlp` with safe output paths and a maximum duration policy.
3. Extract/convert audio to MP3 using `ffmpeg` or `yt-dlp` post-processing.
4. Store the MP3 in the job directory.
5. Mark the job as ready.
6. Stream the file on download.
7. Delete job files after download or after a short TTL.

## Safety And Limits

The first version should include:

- Password protection through `APP_PASSWORD`.
- Session cookie with HTTP-only and same-site settings.
- One or two concurrent jobs at most.
- URL validation for YouTube domains.
- Configurable maximum video duration through `MAX_DURATION_SECONDS`.
- Temporary file cleanup on success, failure, and expiry.
- No public file listing.
- No permanent storage.

## Deployment

The app should include:

- `package.json` scripts for start and development.
- `Dockerfile` that installs Node.js runtime dependencies plus `yt-dlp` and `ffmpeg`.
- `.dockerignore`.
- `.env.example` documenting `APP_PASSWORD`, `PORT`, `MAX_DURATION_SECONDS`, and optional cleanup settings.
- README with local and Docker run instructions.

The expected hosting target is a VPS or Docker-capable platform. Serverless/static hosting such as Vercel or Netlify is out of scope for this implementation.

## Testing And Verification

Implementation should verify:

- App starts locally.
- Login rejects incorrect password and accepts the configured password.
- YouTube URL validation rejects non-YouTube URLs.
- Job lifecycle endpoints return expected states.
- Temporary cleanup runs without leaving completed job files behind.
- Frontend handles loading, success, error, and mobile layout states.

Full end-to-end conversion may require network access and working `yt-dlp`/`ffmpeg` binaries, so local verification should separate API behavior from real media conversion where needed.

## Out Of Scope

- Public anonymous access.
- User accounts or database-backed auth.
- Search by keyword.
- Batch downloads.
- Playlists.
- Permanent media library.
- Cloud object storage.
- Queue workers or horizontal scaling.
