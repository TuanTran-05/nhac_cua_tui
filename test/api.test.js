const assert = require("node:assert/strict");
const test = require("node:test");
const request = require("supertest");
const { createApp } = require("../src/app");
const { createAuth } = require("../src/auth");

const config = {
  appPassword: "secret",
  sessionSecret: "session-secret",
  isProduction: false
};

function makeApp(jobService) {
  const auth = createAuth(config);
  return createApp({ auth, jobService });
}

test("POST /api/login rejects a bad password", async () => {
  const app = makeApp({});

  const response = await request(app)
    .post("/api/login")
    .send({ password: "wrong" });

  assert.equal(response.status, 401);
  assert.deepEqual(response.body, { error: "BAD_PASSWORD" });
});

test("POST /api/login accepts the configured password", async () => {
  const app = makeApp({});

  const response = await request(app)
    .post("/api/login")
    .send({ password: "secret" });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { ok: true });
  assert.match(response.headers["set-cookie"][0], /mp3_auth=/);
});

test("authenticated job lifecycle routes call the job service", async () => {
  const jobService = {
    async createJob(url) {
      assert.equal(url, "https://youtu.be/dQw4w9WgXcQ");
      return { id: "job-1", status: "queued", message: "Dang cho xu ly" };
    },
    getJob(id) {
      assert.equal(id, "job-1");
      return { id: "job-1", status: "ready", filename: "audio.mp3" };
    }
  };
  const app = makeApp(jobService);
  const agent = request.agent(app);

  await agent.post("/api/login").send({ password: "secret" }).expect(200);

  const created = await agent
    .post("/api/jobs")
    .send({ url: "https://youtu.be/dQw4w9WgXcQ" })
    .expect(202);

  assert.equal(created.body.id, "job-1");

  const status = await agent.get("/api/jobs/job-1").expect(200);
  assert.equal(status.body.status, "ready");
});

test("protected routes reject anonymous requests", async () => {
  const app = makeApp({});

  const response = await request(app)
    .post("/api/jobs")
    .send({ url: "https://youtu.be/dQw4w9WgXcQ" });

  assert.equal(response.status, 401);
});
