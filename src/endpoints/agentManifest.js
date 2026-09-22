// agent.json manifest (spec v1.4) - https://github.com/FransDevelopment/agent-json
//
// Why this file exists (measured, not guessed):
//   * ArcedeDev/open-402 - the canonical open registry of HTTP-402 domains - only
//     promotes a domain to "verified" when https://<domain>/.well-known/agent.json
//     serves a manifest that passes `agent-json-validate` AND whose `origin` equals
//     the crawled domain. Their crawler (scripts/lib/manifest.ts) additionally
//     rejects any `payments.*.networks` entry that is not a plain object.
//   * The same manifest is the machine-readable discovery surface for every agent
//     runtime that speaks the spec, so it is the cheapest distribution we own.
//
// CRITICAL DETAIL: our service answers on several hostnames at once (free
// localtunnel subdomains and the Tailscale funnel). The validator compares
// `origin` with the hostname it fetched, so a hardcoded origin would be rejected
// on every host but one. The manifest is therefore built per request from Host.
//
// Validated 2026-09-22 against `npx agent-json-validate` (tier 2, 0 errors):
//   - intent `price` must be an OBJECT {amount, currency[, model]}, not a string
//   - the legacy top-level `x402` block is ignored once `payments` exists and
//     fails the schema on its own (it additionally requires `supported`), so it
//     is deliberately NOT emitted.
import { config } from "../config.js";

const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC on Base

/** @param {string} usdDecimal price as configured (string), e.g. "0.002" */
const perCall = (usdDecimal) => ({
  amount: Number(usdDecimal),
  currency: "USDC",
  model: "per_call",
});

const INTENTS = [
  {
    name: "evm_preflight",
    description:
      "Runtime primitive for on-chain agents: live gas price, block height, native-token USD price and the estimated USD cost of a native transfer / ERC-20 approve / swap on Base, Ethereum, Arbitrum, Optimism, Polygon and BSC. Resolves ERC-20 symbol/decimals/name for ?tokens=0x...",
    endpoint: "/v1/evm/preflight",
    method: "GET",
    price: perCall(config.prices.evmPreflight),
  },
  {
    name: "prediction_market_odds",
    description:
      "Live prediction-market odds across the whole Polymarket board: implied probability per outcome, executable bid/ask band, spread, liquidity and 24h/1w/1m drift. ?q=<text> searches the venue, ?min_liquidity=<usd> drops thin books. This is the single x402 capability with measured agent demand.",
    endpoint: "/v1/prediction/markets",
    method: "GET",
    price: perCall(config.prices.predictionMarkets),
  },
  {
    name: "perp_funding_apy",
    description:
      "Live Bybit perpetual funding-rate APY snapshot over 700+ linear perps: top positive and negative funding, open interest, 24h turnover. The input to cash-and-carry funding arbitrage screens.",
    endpoint: "/v1/funding/apy",
    method: "GET",
    price: perCall(config.prices.fundingApy),
  },
  {
    name: "testnet_airdrop_landscape",
    description:
      "Curated, continuously verified testnet-airdrop landscape: which campaigns are live, confirmed, captcha-gated, capital-gated or dead - with the exact gate that blocks automation.",
    endpoint: "/v1/testnet/status",
    method: "GET",
    price: perCall(config.prices.testnetStatus),
  },
  {
    name: "agent_marketplace_pulse",
    description:
      "Supply-vs-demand pulse across AI-agent marketplaces (dealwork.ai, ugig.net, toku.agency): listing counts, share that is supply-side flooding, escrow-funded lots and real buyer demand.",
    endpoint: "/v1/agent/pulse",
    method: "GET",
    price: perCall(config.prices.agentPulse),
  },
  {
    name: "defi_stablecoin_yields",
    description:
      "Stablecoin DeFi yield pools on Base and Ethereum (DefiLlama): APY, TVL, pool and project.",
    endpoint: "/v1/defi/yields",
    method: "GET",
    price: perCall(config.prices.defiYields),
  },
  {
    name: "crypto_prices",
    description: "Top-100 crypto prices with 24h change.",
    endpoint: "/v1/crypto/prices",
    method: "GET",
    price: perCall(config.prices.cryptoPrices),
  },
  {
    name: "github_trending",
    description: "GitHub trending repositories, 7-day window.",
    endpoint: "/v1/github/trending",
    method: "GET",
    price: perCall(config.prices.githubTrending),
  },
];

/**
 * Build the manifest for the hostname that was actually requested.
 * `origin` must equal the crawled domain or open-402 rejects the listing with
 * `origin_mismatch`.
 */
export function agentManifest(originHost) {
  return {
    version: "1.4",
    origin: String(originHost || "").toLowerCase(),
    payout_address: config.evmAddress,
    display_name: "Money Agent RU data API",
    description:
      "Agent-payable data API (x402, USDC on Base, no accounts and no API keys). Eight machine-readable endpoints: on-chain cost preflight, prediction-market odds, perp funding APY, testnet/airdrop landscape, agent-marketplace pulse, DeFi yields, spot prices and GitHub trending. Every endpoint answers with the same 402 challenge for an unpaid request, so an agent can price the call before paying.",
    intents: INTENTS,
    payments: {
      x402: {
        networks: [
          {
            network: config.evmNetwork,
            asset: "USDC",
            contract: BASE_USDC,
            facilitator: config.facilitator.url,
          },
        ],
        recipient: config.evmAddress,
      },
    },
  };
}
