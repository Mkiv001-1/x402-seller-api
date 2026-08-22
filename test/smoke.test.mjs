// x402 seller smoke test: boots the server (testnet, ephemeral port),
// validates OpenAPI discovery contract + 402 payment flow on all routes.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4299;
const BASE = `http://127.0.0.1:${PORT}`;
const PAYTO = "0xD4D124D375775a146218dBD8243A2d17ba540596";

const EXPECTED = {
  "/v1/crypto/prices": ["20000", "0.02"],
  "/v1/funding/apy": ["50000", "0.05"],
  "/v1/testnet/status": ["30000", "0.03"],
  "/v1/defi/yields": ["30000", "0.03"],
  "/v1/github/trending": ["20000", "0.02"],
};

let server;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitReady(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/healthz`);
      if (r.ok) return;
    } catch { /* not up yet */ }
    await sleep(300);
  }
  throw new Error("server did not become ready");
}

async function expect402(p) {
  const res = await fetch(`${BASE}${p}`);
  assert.equal(res.status, 402, `${p} should return 402`);
  const hdr = res.headers.get("payment-required");
  assert.ok(hdr, `${p} missing PAYMENT-REQUIRED header`);
  const dec = JSON.parse(Buffer.from(hdr, "base64url").toString());
  const evm = dec.accepts.find((a) => a.network === "eip155:84532");
  assert.ok(evm, `${p} missing EVM accept entry`);
  return evm;
}

before(async () => {
  server = spawn(process.execPath, ["src/server.js"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, NODE_ENV: "test", PORT: String(PORT) },
    stdio: "ignore",
  });
  await waitReady();
});

after(() => {
  server?.kill();
});

test("healthz reports testnet mode", async () => {
  const d = await (await fetch(`${BASE}/healthz`)).json();
  assert.equal(d.ok, true);
  assert.equal(d.testnet, true);
});

test("openapi.json: 5 paid paths with x-payment-info", async () => {
  const d = await (await fetch(`${BASE}/openapi.json`)).json();
  assert.equal(d.info.title, "Money Agent RU Data API");
  assert.equal(Object.keys(d.paths).length, 5);
  for (const [p, [, price]] of Object.entries(EXPECTED)) {
    const op = d.paths[p].get;
    assert.ok(op["x-payment-info"], `${p} missing x-payment-info`);
    assert.equal(op["x-payment-info"].price.amount, price, `${p} price`);
    assert.ok(op.responses["402"], `${p} missing 402 response`);
  }
});

test("all routes return 402 with correct payTo + atomic-unit amounts", async () => {
  for (const [p, [amount]] of Object.entries(EXPECTED)) {
    const evm = await expect402(p);
    assert.equal(evm.payTo, PAYTO, `${p} payTo`);
    assert.equal(evm.amount, amount, `${p} amount`);
  }
});

test("root endpoint lists all paid endpoints", async () => {
  const d = await (await fetch(`${BASE}/`)).json();
  assert.equal(d.endpoints.length, 5);
});
