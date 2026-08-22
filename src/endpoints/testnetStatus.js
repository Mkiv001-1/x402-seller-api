// Endpoint: verified testnet airdrop landscape (unique curated data from Money Agent RU research)
// Sources: airdrops.io, project docs, on-chain recon. Updated 2026-08-22.

export async function testnetStatus() {
  return {
    generated_at: new Date().toISOString(),
    updated: "2026-08-22",
    note: "Independently verified by Money Agent RU (airdrops.io + official docs + on-chain RPC checks). Not financial advice.",
    testnets: [
      {
        name: "Wager Predict",
        chain: "BSC testnet",
        token: "WP (10% of 30B supply)",
        confirmed: true,
        status: "TGE Aug 2026, snapshot at TGE - window OPEN",
        bot_able: "trades/claim via API, faucets need captcha",
      },
      {
        name: "Canopy",
        chain: "own testnet L1",
        token: "CNPY (50% of 504M supply)",
        confirmed: true,
        status: "testnet live, mainnet 2026, $8.5M seed",
        bot_able: "appchain deploy via GitHub",
      },
      {
        name: "Push Chain",
        chain: "Push testnet",
        token: "PC (10% of 10B supply)",
        confirmed: true,
        status: "Season 3 XP live, faucet 1 PC/6h",
        bot_able: "portal quests, captcha-gated",
      },
      {
        name: "Orbinum",
        chain: "chain 2700",
        token: "ORB (20M)",
        confirmed: true,
        status: "TGE Q4 2026, snapshot 14d before mainnet",
        bot_able: "faucet needs Discord + captcha",
      },
      {
        name: "Sweep Finance",
        chain: "BSC",
        token: "SWEEP (27% supply)",
        confirmed: true,
        status: "XP farming, TGE TBA, KYC required",
        bot_able: "user tasks",
      },
      {
        name: "Startale",
        chain: "Soneium",
        token: "STAR points (token NOT announced)",
        confirmed: false,
        status: "Sony/SBI backed ~$70M, daily GM check-in",
        bot_able: "user tasks",
      },
      {
        name: "Nowa",
        chain: "Nowa devnet",
        token: "NOWA 1:1 at TGE",
        confirmed: true,
        status: "500k NOWA/day + 10k USDT leaderboard",
        bot_able: "devnet tokens free, 5 buckets",
      },
      {
        name: "LitVM / LiteForge",
        chain: "chain 4441",
        token: "not confirmed",
        confirmed: false,
        status: "Litecoin VM, 51% supply community, testnet live",
        bot_able: "faucet needs residential IP",
      },
      {
        name: "GIWA",
        chain: "chain 91342",
        token: "not confirmed",
        confirmed: false,
        status: "Upbit L2, ~100M tx, Dunamu $1.22B",
        bot_able: "faucet behind Turnstile",
      },
    ],
  };
}

export const meta = {
  description:
    "Curated, independently verified testnet airdrop landscape (Aug 2026): confirmed tokens, TGE timing, bot-ability. Unique data from ongoing deep research.",
};
