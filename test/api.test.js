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

function makeApp(jobService, qrTool, pdfTool) {
  const auth = createAuth(config);
  return createApp({ auth, jobService, qrTool, pdfTool });
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

test("POST /api/tools/pdf/info rejects anonymous requests", async () => {
  const app = makeApp({});

  const response = await request(app)
    .post("/api/tools/pdf/info")
    .attach("files", Buffer.from("%PDF-1.4"), "sample.pdf");

  assert.equal(response.status, 401);
});

test("POST /api/tools/pdf/unknown returns PDF_ACTION_UNKNOWN", async () => {
  const pdfTool = {
    routerOptions: {
      limits: { fileSize: 1024 },
      maxFiles: 10
    },
    async handleAction() {
      throw new Error("not called");
    }
  };
  const app = makeApp({}, undefined, pdfTool);
  const agent = request.agent(app);

  await agent.post("/api/login").send({ password: "secret" }).expect(200);

  const response = await agent
    .post("/api/tools/pdf/unknown")
    .attach("files", Buffer.from("%PDF-1.4"), "sample.pdf")
    .expect(400);

  assert.equal(response.body.error, "PDF_ACTION_UNKNOWN");
});

test("POST /api/tools/pdf/info returns JSON for rejected upload files", async () => {
  const app = makeApp({});
  const agent = request.agent(app);

  await agent.post("/api/login").send({ password: "secret" }).expect(200);

  const response = await agent
    .post("/api/tools/pdf/info")
    .attach("files", Buffer.from("not a pdf"), "notes.txt")
    .expect(400);

  assert.match(response.headers["content-type"], /^application\/json/);
  assert.equal(response.body.error, "PDF_ONLY_ALLOWED");
});

test("POST /api/tools/pdf/info returns JSON after login", async () => {
  const pdfTool = {
    routerOptions: {
      limits: { fileSize: 1024 },
      maxFiles: 10
    },
    async handleAction(action, files) {
      assert.equal(action, "info");
      assert.equal(files[0].originalName, "sample.pdf");
      return {
        type: "json",
        body: { pageCount: 2, filename: "sample.pdf" }
      };
    }
  };
  const app = makeApp({}, undefined, pdfTool);
  const agent = request.agent(app);

  await agent.post("/api/login").send({ password: "secret" }).expect(200);

  const response = await agent
    .post("/api/tools/pdf/info")
    .attach("files", Buffer.from("%PDF-1.4"), "sample.pdf")
    .expect(200);

  assert.equal(response.body.pageCount, 2);
});

test("POST /api/tools/pdf/merge returns a file download after login", async () => {
  const pdfTool = {
    routerOptions: {
      limits: { fileSize: 1024 },
      maxFiles: 10
    },
    async handleAction(action) {
      assert.equal(action, "merge");
      return {
        type: "buffer",
        filename: "merged.pdf",
        contentType: "application/pdf",
        buffer: Buffer.from("merged")
      };
    }
  };
  const app = makeApp({}, undefined, pdfTool);
  const agent = request.agent(app);

  await agent.post("/api/login").send({ password: "secret" }).expect(200);

  const response = await agent
    .post("/api/tools/pdf/merge")
    .attach("files", Buffer.from("%PDF-1.4"), "one.pdf")
    .attach("files", Buffer.from("%PDF-1.4"), "two.pdf")
    .expect(200);

  assert.equal(response.headers["content-type"], "application/pdf");
  assert.match(response.headers["content-disposition"], /merged\.pdf/);
  assert.equal(response.body.toString(), "merged");
});

