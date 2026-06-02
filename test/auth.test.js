const assert = require("node:assert/strict");
const test = require("node:test");
const { createAuth } = require("../src/auth");

const config = {
  appPassword: "secret",
  sessionSecret: "session-secret",
  cookieSecure: false
};

test("verifyPassword accepts only the configured password", () => {
  const auth = createAuth(config);

  assert.equal(auth.verifyPassword("secret"), true);
  assert.equal(auth.verifyPassword("wrong"), false);
  assert.equal(auth.verifyPassword(""), false);
});

test("signAuthCookie and verifyAuthCookie round-trip", () => {
  const auth = createAuth(config);
  const cookieValue = auth.signAuthCookie();

  assert.equal(auth.verifyAuthCookie(cookieValue), true);
  assert.equal(auth.verifyAuthCookie(`${cookieValue}x`), false);
});

test("requireAuth rejects requests without a valid cookie", async () => {
  const auth = createAuth(config);
  const req = { cookies: {} };
  let statusCode = 0;
  let body = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
    }
  };

  auth.requireAuth(req, res, () => {
    throw new Error("next should not be called");
  });

  assert.equal(statusCode, 401);
  assert.deepEqual(body, { error: "UNAUTHORIZED" });
});

test("setAuthCookie uses configured secure flag", () => {
  const auth = createAuth({ ...config, cookieSecure: true });
  let options = null;
  const res = {
    cookie(_name, _value, cookieOptions) {
      options = cookieOptions;
    }
  };

  auth.setAuthCookie(res);

  assert.equal(options.secure, true);
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, "lax");
});
