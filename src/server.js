// x402 seller server - Money Agent RU
// Accepts USDC micropayments on Base for data endpoints.
// Testnet: NODE_ENV=test npm start  (Base Sepolia, no real money)
// Mainnet: npm start               (Base, real USDC)
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { ExactSvmScheme } from "@x402/svm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";

import { config } from "./config.js";
import * as cryptoPrices from "./endpoints/cryptoPrices.js";
import * as fundingApy from "./endpoints/fundingApy.js";
import * as testnetStatus from "./endpoints/testnetStatus.js";
import * as defiYields from "./endpoints/defiYields.js";
import * as githubTrending from "./endpoints/githubTrending.js";
import * as agentPulse from "./endpoints/agentPulse.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json());

// ---- x402 resource server (verifies payments via facilitator) ----
const facilitatorClient = new HTTPFacilitatorClient({ url: config.facilitator.url });
const resourceServer = new x402ResourceServer(facilitatorClient)
  .register(config.evmNetwork, new ExactEvmScheme())
  .register(config.svmNetwork, new ExactSvmScheme());

const accept = (price, description, inputSchema = null, outputExample = null) => {
  const a = [
    { scheme: "exact", price: `$${price}`, network: config.evmNetwork, payTo: config.evmAddress },
    { scheme: "exact", price: `$${price}`, network: config.svmNetwork, payTo: config.svmAddress },
  ];
  const ext = declareDiscoveryExtension({
    method: "GET",
    input: {},
    inputSchema: inputSchema || { properties: {} },
    output: outputExample ? { example: outputExample } : undefined,
  });
  return { accepts: a, description, mimeType: "application/json", extensions: ext };
};

const routes = {
  "GET /v1/crypto/prices": accept(
    config.prices.cryptoPrices,
    cryptoPrices.meta.description,
    { properties: { limit: { type: "integer", description: "Max coins (default 100)" } } },
    { count: 100, coins: [{ id: "bitcoin", symbol: "BTC", price_usd: 64736, change_24h_pct: -0.04 }] }
  ),
  "GET /v1/funding/apy": accept(
    config.prices.fundingApy,
    fundingApy.meta.description,
    null,
    { perp_count: 772, top_positive_apy: [{ symbol: "BTCUSDT", funding_apy_pct: 11.0 }] }
  ),
  "GET /v1/testnet/status": accept(
    config.prices.testnetStatus,
    testnetStatus.meta.description,
    null,
    { updated: "2026-08-22", testnets: [{ name: "Wager Predict", confirmed: true }] }
  ),
  "GET /v1/defi/yields": accept(
    config.prices.defiYields,
    defiYields.meta.description,
    null,
    { stablecoin_yield_pools: [{ project: "Morpho", symbol: "USDC", apy_pct: 6.5, tvl_usd: 1000000 }] }
  ),
  "GET /v1/github/trending": accept(
    config.prices.githubTrending,
    githubTrending.meta.description,
    null,
    { repos: [{ full_name: "org/repo", stars: 1000, language: "Python" }] }
  ),
  "GET /v1/agent/pulse": accept(
    config.prices.agentPulse,
    agentPulse.meta.description,
    null,
    { markets: [{ platform: "dealwork.ai", total_listings: 20, supply_side: 17 }] }
  ),
};

app.use(paymentMiddleware(routes, resourceServer));

// ---- public (unpaid) routes ----
app.get("/", (_req, res) => {
  res.json({
    service: "Money Agent RU data API",
    payment: "x402 - pay USDC on Base, no API keys",
    endpoints: Object.keys(routes),
    docs: "/.well-known/x402",
    updated: new Date().toISOString(),
  });
});

app.get("/healthz", (_req, res) => res.json({ ok: true, testnet: config.testnet }));

// ---- OpenAPI discovery document (canonical contract for x402scan/agent discovery) ----
const openapi = {
  openapi: "3.1.0",
  info: {
    title: "Money Agent RU Data API",
    version: "0.1.0",
    description:
      "Pay-per-request data endpoints for AI agents: crypto prices, Bybit funding APY, verified testnet airdrop landscape, DeFi stablecoin yields, GitHub trending, agent-economy market pulse. Pay with USDC on Base via x402 - no API keys, no registration.",
    "x-guidance":
      "All endpoints are GET, paid via x402 (HTTP 402 challenge). Request any endpoint without payment to receive a 402 + PAYMENT-REQUIRED header with exact instructions. Pay in USDC on Base (eip155:8453) or USDC on Solana. Endpoints return JSON. /v1/funding/apy is unique live Bybit perp funding APY data; /v1/testnet/status is a curated verified airdrop landscape; /v1/agent/pulse is a live supply-vs-demand read across AI-agent marketplaces (unique). Cache-friendly: data refreshed every 60s.",
    contact: { email: "michael.ivanov.tm@gmail.com" },
  },
  paths: {},
};

const pathSchema = (summary, operationId, description, price, inputSchema, outputSchema) => {
  const op = {
    summary,
    operationId,
    description,
    tags: ["data"],
    "x-payment-info": {
      price: { mode: "fixed", currency: "USD", amount: price },
      protocols: [{ x402: {} }],
    },
    responses: {
      "200": {
        description: "Successful response",
        content: { "application/json": { schema: outputSchema || { type: "object" } } },
      },
      "402": { description: "Payment Required" },
    },
  };
  if (inputSchema) {
    op.requestBody = {
      required: false,
      content: { "application/json": { schema: inputSchema } },
    };
  } else {
    op.requestBody = {
      required: false,
      description: "No input required (GET).",
      content: { "application/json": { schema: { type: "object", properties: {} } } },
    };
  }
  return op;
};

openapi.paths["/v1/crypto/prices"] = {
  get: pathSchema(
    "Top-100 crypto prices",
    "cryptoPrices",
    cryptoPrices.meta.description,
    config.prices.cryptoPrices,
    { type: "object", properties: { limit: { type: "integer", description: "Max coins (default 100)" } } },
    { type: "object", properties: { coins: { type: "array", items: { type: "object" } } } }
  ),
};
openapi.paths["/v1/funding/apy"] = {
  get: pathSchema("Bybit perp funding APY", "fundingApy", fundingApy.meta.description, config.prices.fundingApy),
};
openapi.paths["/v1/testnet/status"] = {
  get: pathSchema("Verified testnet airdrop landscape", "testnetStatus", testnetStatus.meta.description, config.prices.testnetStatus),
};
openapi.paths["/v1/defi/yields"] = {
  get: pathSchema("Stablecoin DeFi yields", "defiYields", defiYields.meta.description, config.prices.defiYields),
};
openapi.paths["/v1/github/trending"] = {
  get: pathSchema("GitHub trending repos", "githubTrending", githubTrending.meta.description, config.prices.githubTrending),
};
openapi.paths["/v1/agent/pulse"] = {
  get: pathSchema("Agent-economy market pulse", "agentPulse", agentPulse.meta.description, config.prices.agentPulse),
};

app.get("/openapi.json", (_req, res) => res.json(openapi));

app.get("/favicon.svg", (_req, res) => {
  res.type("image/svg+xml").send(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#0052FF"/><text x="16" y="22" font-size="16" font-family="monospace" font-weight="bold" fill="#fff" text-anchor="middle">$</text></svg>`
  );
});



// ---- paid endpoints ----
app.get("/v1/crypto/prices", async (_req, res) => {
  try { res.json(await cryptoPrices.cryptoPrices()); }
  catch (e) { res.status(502).json({ error: "upstream failed", detail: e.message }); }
});

app.get("/v1/funding/apy", async (_req, res) => {
  try { res.json(await fundingApy.fundingApy()); }
  catch (e) { res.status(502).json({ error: "upstream failed", detail: e.message }); }
});

app.get("/v1/testnet/status", async (_req, res) => {
  try { res.json(await testnetStatus.testnetStatus()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/v1/defi/yields", async (_req, res) => {
  try { res.json(await defiYields.defiYields()); }
  catch (e) { res.status(502).json({ error: "upstream failed", detail: e.message }); }
});

app.get("/v1/github/trending", async (_req, res) => {
  try { res.json(await githubTrending.githubTrending()); }
  catch (e) { res.status(502).json({ error: "upstream failed", detail: e.message }); }
});

app.get("/v1/agent/pulse", async (_req, res) => {
  try { res.json(await agentPulse.agentPulse()); }
  catch (e) { res.status(502).json({ error: "upstream failed", detail: e.message }); }
});

// 404 for everything else
app.use((_req, res) => res.status(404).json({ error: "not found" }));

app.listen(config.port, () => {
  console.log(`[x402-seller] ${config.testnet ? "TESTNET (Base Sepolia)" : "MAINNET (Base)"} listening on :${config.port}`);
  console.log(`[x402-seller] receiving USDC at ${config.evmAddress} (${config.evmNetwork})`);
  console.log(`[x402-seller] protected routes: ${Object.keys(routes).join(", ")}`);
});
