const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be"
]);

function normalizeHost(hostname) {
  return String(hostname).toLowerCase();
}

function hasVideoId(url) {
  if (url.hostname === "youtu.be") {
    return url.pathname.split("/").filter(Boolean).length >= 1;
  }

  if (url.pathname === "/watch") {
    return Boolean(url.searchParams.get("v"));
  }

  if (url.pathname.startsWith("/shorts/")) {
    return url.pathname.split("/").filter(Boolean).length >= 2;
  }

  if (url.pathname.startsWith("/embed/")) {
    return url.pathname.split("/").filter(Boolean).length >= 2;
  }

  return false;
}

function validateYoutubeUrl(input) {
  if (!input || !String(input).trim()) {
    return { ok: false, error: "URL_REQUIRED" };
  }

  let url;
  try {
    url = new URL(String(input).trim());
  } catch {
    return { ok: false, error: "URL_INVALID" };
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return { ok: false, error: "URL_INVALID" };
  }

  url.protocol = "https:";
  url.hostname = normalizeHost(url.hostname);

  if (!YOUTUBE_HOSTS.has(url.hostname)) {
    return { ok: false, error: "URL_MUST_BE_YOUTUBE" };
  }

  if (!hasVideoId(url)) {
    return { ok: false, error: "YOUTUBE_VIDEO_ID_REQUIRED" };
  }

  url.hash = "";

  return {
    ok: true,
    url: url.toString()
  };
}

module.exports = { validateYoutubeUrl };
