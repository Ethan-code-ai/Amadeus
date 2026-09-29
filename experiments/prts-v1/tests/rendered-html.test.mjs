import assert from "node:assert/strict";
import test from "node:test";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
const { default: runtime } = await import(workerUrl.href);

const env = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
};

const context = {
  waitUntil() {},
  passThroughOnException() {},
};

function handleRequest(request) {
  return typeof runtime === "function"
    ? runtime(request, context)
    : runtime.fetch(request, env, context);
}

test("renders the local PRTS interface with the supplied Rhodes Island logo", async () => {
  const response = await handleRequest(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>PRTS · Amadeus Archive<\/title>/);
  assert.match(html, /rhodes-island-user-supplied\.png/);
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  assert.match(html, /WORLD LINE OBSERVATION CLIENT/);
  assert.match(html, /REV\. 01\.04/);
  assert.match(html, /WORLD LINE/);
  assert.match(html, /PHONE/);
  assert.match(html, /CLICK TO REACT/);
  assert.match(html, /SECURE ACCESS NODE · 01/);
  assert.match(html, /PRTS ACCESS PROTOCOL \/ ARCHIVE REV\. 01/);
  assert.doesNotMatch(html, /amadeus-kurisu-assistant\.amber-camel-9796\.chatgpt\.site/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("returns a demo reply when no DeepSeek key is configured", async () => {
  const response = await handleRequest(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "hello" }],
      }),
    }),
  );

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.demo, true);
  assert.equal(typeof data.reply, "string");
  assert.ok(data.reply.length > 20);
});

test("reconstructs the requested world line without calling the answer provider", async () => {
  const alphaResponse = await handleRequest(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        worldLine: "beta",
        messages: [{ role: "user", content: "WORLD LINE ALPHA" }],
      }),
    }),
  );

  assert.equal(alphaResponse.status, 200);
  assert.deepEqual(
    await alphaResponse.json(),
    {
      reply: "观测目标已切换至 α 世界线。人物档案已卸载，接下来的回答使用原始模型通道。",
      demo: false,
      worldLine: "alpha",
      transition: true,
    },
  );

  const betaResponse = await handleRequest(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        worldLine: "alpha",
        messages: [{ role: "user", content: "EL PSY KONGROO" }],
      }),
    }),
  );

  assert.equal(betaResponse.status, 200);
  const beta = await betaResponse.json();
  assert.equal(beta.worldLine, "beta");
  assert.equal(beta.transition, true);
});
