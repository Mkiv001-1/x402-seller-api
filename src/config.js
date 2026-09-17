// x402 seller config - Money Agent RU
// Testnet mode: NODE_ENV=test (Base Sepolia, x402.org/facilitator, no real money)
// Mainnet mode: NODE_ENV=production (Base eip155:8453, real USDC)

const TESTNET = process.env.NODE_ENV === "test";

// Port precedence: --port=<n> / --port <n>  >  PORT env  >  4021.
// The CLI form exists so a verifier harness can boot the app on its own port
// (.hermes/environment.json uses 4022) without colliding with the live server.
function cliPort() {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const eq = argv[i].match(/^--port=(\d+)$/);
    if (eq) return parseInt(eq[1], 10);
    if (argv[i] === "--port" && argv[i + 1] && /^\d+$/.test(argv[i + 1])) return parseInt(argv[i + 1], 10);
  }
  return null;
}

export const config = {
  testnet: TESTNET,
  port: cliPort() ?? parseInt(process.env.PORT || "4021", 10),

  // Receiving wallet addresses (same keys as airdrop farm wallets)
  evmAddress: process.env.PAYTO_EVM || "0xD4D124D375775a146218dBD8243A2d17ba540596",
  svmAddress: process.env.PAYTO_SOL || "3DNVJvjEx5pjiy7hJb3QanLm4N3kWN2nLQVLTryXpQNx",

  // Facilitator = the service that verifies+settles x402 payments on our behalf.
  // PayAI (https://facilitator.payai.network) supports Base MAINNET (eip155:8453) and
  // Solana mainnet with NO API keys, covers network fees (gasless), and auto-lists the
  // merchant in the x402 Bazaar (https://facilitator.payai.network -> Auto-Discovery).
  // This replaces x402.org/facilitator, which serves TESTNETS ONLY (no eip155:8453),
  // so real-USDC mainnet was previously impossible without a Coinbase CDP API key.
  facilitator: {
    url: process.env.FACILITATOR_URL || "https://facilitator.payai.network",
  },

  // CAIP-2 network identifiers
  evmNetwork: TESTNET ? "eip155:84532" : "eip155:8453", // Base Sepolia / Base
  svmNetwork: TESTNET ? "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1" : "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",

  // Per-endpoint pricing (USD).
  // 17.09 repricing after market recon: x402scan volume (BlockRun 22.15M tx,
  // stateless utility server 243K tx @ ~$0.001/call) shows buyers pay for CHEAP
  // primitives needed INSIDE the runtime loop, not for curated reports. So:
  //  - added evmPreflight at $0.002 (runtime primitive, called per tx decision)
  //  - repriced commodity endpoints down toward the competitive band
  //  - kept our two genuinely-unique datasets at the top of our range
  prices: {
    cryptoPrices: "0.01",   // commodity price list (competing with free/freemium)
    fundingApy: "0.05",     // unique: our own Bybit perp funding sweep
    testnetStatus: "0.03",  // unique: curated verified airdrop landscape
    defiYields: "0.02",     // stablecoin yields on Base/Ethereum
    githubTrending: "0.01", // commodity
    agentPulse: "0.03",     // unique: live agent-marketplace supply/demand pulse
    evmPreflight: "0.002",  // NEW cheap runtime primitive: gas/USD/token metadata
  },

  upstreamTimeoutMs: 12000,
  cacheTtlMs: 60000, // cache upstream data 60s
};
