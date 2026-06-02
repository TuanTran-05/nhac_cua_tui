# YouTube MP3 Hosted App

Small password-protected web app for converting a YouTube video URL to an MP3 download. Use it only for videos you own or have permission to download and convert.

## Tools

- MP3 Converter: convert permitted YouTube videos to temporary MP3 downloads.
- QR Generator: create an SVG QR code from text or a URL.
- JSON Formatter: format, minify, validate, and copy JSON locally in the browser.
- Password Generator: generate and copy browser-crypto passwords locally.


## Requirements

- Node.js 20+
- `yt-dlp`
- `ffmpeg`

Docker installs the media tools inside the image. Local non-Docker runs need those tools available on `PATH`.

## Local Run

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

Edit `.env` and set `APP_PASSWORD` and `SESSION_SECRET` before using the app.

Open `http://localhost:3000`.

## Test

```powershell
npm.cmd test
```

## Docker

```powershell
docker build -t youtube-mp3-app .
docker run --rm -p 3000:3000 --env-file .env youtube-mp3-app
```

## Deployment

Deploy to a VPS or Docker-capable host. Serverless/static hosts are not suitable because conversion requires long-running processes, `yt-dlp`, `ffmpeg`, and temporary disk space.

The QR, JSON, and password tools do not require extra system packages. The MP3 converter still requires `yt-dlp` and `ffmpeg`, which are installed by the Dockerfile.

## Configuration

- `APP_PASSWORD`: shared password for the web UI.
- `SESSION_SECRET`: secret used to sign the auth cookie.
- `PORT`: HTTP port, default `3000`.
- `MAX_DURATION_SECONDS`: maximum accepted video duration, default `900`.
- `MAX_CONCURRENT_JOBS`: maximum active conversions, default `1`.
- `JOB_TTL_MS`: temporary job retention window, default `600000`.
- `COOKIE_SECURE`: set `true` only when the app is served over HTTPS, default `false`.

## Production Environment Example

```dotenv
APP_PASSWORD=use-a-long-private-password
SESSION_SECRET=use-a-long-random-secret
PORT=3000
MAX_DURATION_SECONDS=900
MAX_CONCURRENT_JOBS=1
JOB_TTL_MS=600000
COOKIE_SECURE=true
```

Use HTTPS at the reverse proxy or hosting layer. Keep the app behind the password screen and do not expose temp directories.

For direct HTTP testing on a VM external IP, keep `COOKIE_SECURE=false`; otherwise the browser will not send the auth cookie after login.
