import assert from "node:assert/strict";
import test from "node:test";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);

const env = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
};

const context = {
  waitUntil() {},
  passThroughOnException() {},
};

test("renders the Amadeus intelligent assistant interface", async () => {
  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    env,
    context,
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Amadeus v1\.1 · 世界线观测终端<\/title>/);
  assert.match(html, /智能助手对话终端/);
  assert.match(html, /AMADEUS SYSTEM/);
  assert.match(html, /WORLD LINE/);
  assert.match(html, /PHONE/);
  assert.match(html, /CLICK TO REACT/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("returns a demo reply when no DeepSeek key is configured", async () => {
  const response = await worker.fetch(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "hello" }],
      }),
    }),
    env,
    context,
  );

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.demo, true);
  assert.equal(typeof data.reply, "string");
  assert.ok(data.reply.length > 20);
});
