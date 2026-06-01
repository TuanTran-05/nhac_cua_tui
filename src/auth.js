const crypto = require("node:crypto");

const COOKIE_NAME = "mp3_auth";
const COOKIE_VALUE = "authenticated";

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createAuth(config) {
  function sign(value) {
    return crypto
      .createHmac("sha256", config.sessionSecret)
      .update(value)
      .digest("hex");
  }

  function signAuthCookie() {
    return `v1.${COOKIE_VALUE}.${sign(COOKIE_VALUE)}`;
  }

  function verifyAuthCookie(cookieValue) {
    if (!cookieValue || typeof cookieValue !== "string") {
      return false;
    }

    const parts = cookieValue.split(".");
    if (parts.length !== 3 || parts[0] !== "v1" || parts[1] !== COOKIE_VALUE) {
      return false;
    }

    return safeEqual(parts[2], sign(COOKIE_VALUE));
  }

  function verifyPassword(password) {
    if (!password || typeof password !== "string") {
      return false;
    }

    return safeEqual(password, config.appPassword);
  }

  function setAuthCookie(res) {
    res.cookie(COOKIE_NAME, signAuthCookie(), {
      httpOnly: true,
      sameSite: "lax",
      secure: config.isProduction,
      maxAge: 1000 * 60 * 60 * 12
    });
  }

  function clearAuthCookie(res) {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.isProduction
    });
  }

  function requireAuth(req, res, next) {
    if (!verifyAuthCookie(req.cookies?.[COOKIE_NAME])) {
      res.status(401).json({ error: "UNAUTHORIZED" });
      return;
    }

    next();
  }

  return {
    cookieName: COOKIE_NAME,
    verifyPassword,
    signAuthCookie,
    verifyAuthCookie,
    setAuthCookie,
    clearAuthCookie,
    requireAuth
  };
}

module.exports = { createAuth };
