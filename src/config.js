// x402 seller config - Money Agent RU
// Testnet mode: NODE_ENV=test (Base Sepolia, x402.org/facilitator, no real money)
// Mainnet mode: NODE_ENV=production (Base eip155:8453, real USDC)

const TESTNET = process.env.NODE_ENV === "test";

export const config = {
  testnet: TESTNET,
  port: parseInt(process.env.PORT || "4021", 10),

  // Receiving wallet addresses (same keys as airdrop farm wallets)
  evmAddress: process.env.PAYTO_EVM || "0xD4D124D375775a146218dBD8243A2d17ba540596",
  svmAddress: process.env.PAYTO_SOL || "3DNVJvjEx5pjiy7hJb3QanLm4N3kWN2nLQVLTryXpQNx",

  facilitator: TESTNET
    ? { url: "https://x402.org/facilitator" } // works on Base Sepolia + Solana devnet
    : { url: "https://x402.org/facilitator" }, // mainnet facilitator

  // CAIP-2 network identifiers
  evmNetwork: TESTNET ? "eip155:84532" : "eip155:8453", // Base Sepolia / Base
  svmNetwork: TESTNET ? "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1" : "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",

  // Per-endpoint pricing (USD). Sweet spot for volume: $0.01-0.05.
  prices: {
    cryptoPrices: "0.02",   // top-100 coin prices, 24h stats
    fundingApy: "0.05",     // Bybit perp funding APY snapshot (unique data)
    testnetStatus: "0.03",  // verified testnet airdrop landscape (unique curated data)
    defiYields: "0.03",     // Aave/Morpho stablecoin yield rates on Base
    githubTrending: "0.02", // GitHub trending repos
    agentPulse: "0.05",     // live agent-marketplace supply/demand pulse (unique data)
  },

  upstreamTimeoutMs: 12000,
  cacheTtlMs: 60000, // cache upstream data 60s
};
