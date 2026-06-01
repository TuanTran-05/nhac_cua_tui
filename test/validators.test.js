const assert = require("node:assert/strict");
const test = require("node:test");
const { validateYoutubeUrl } = require("../src/validators");

test("validateYoutubeUrl accepts common YouTube video URLs", () => {
  const urls = [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ"
  ];

  for (const url of urls) {
    const result = validateYoutubeUrl(url);
    assert.equal(result.ok, true, url);
    assert.equal(result.url.startsWith("https://"), true);
  }
});

test("validateYoutubeUrl rejects non-YouTube URLs", () => {
  const result = validateYoutubeUrl("https://example.com/watch?v=dQw4w9WgXcQ");

  assert.deepEqual(result, {
    ok: false,
    error: "URL_MUST_BE_YOUTUBE"
  });
});

test("validateYoutubeUrl rejects malformed and empty values", () => {
  assert.deepEqual(validateYoutubeUrl(""), {
    ok: false,
    error: "URL_REQUIRED"
  });

  assert.deepEqual(validateYoutubeUrl("not a url"), {
    ok: false,
    error: "URL_INVALID"
  });
});

test("validateYoutubeUrl rejects YouTube URLs without a video id", () => {
  const result = validateYoutubeUrl("https://www.youtube.com/feed/subscriptions");

  assert.deepEqual(result, {
    ok: false,
    error: "YOUTUBE_VIDEO_ID_REQUIRED"
  });
});
