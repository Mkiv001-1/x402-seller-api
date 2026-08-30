// Endpoint: verified testnet airdrop landscape (unique curated data from Money Agent RU research)
// Sources: airdrops.io, project docs, on-chain recon. Updated 2026-08-30.

export async function testnetStatus() {
  return {
    generated_at: new Date().toISOString(),
    updated: "2026-08-30",
    note: "Independently verified by Money Agent RU (airdrops.io + official docs + on-chain RPC checks). Not financial advice.",
    testnets: [
      {
        name: "Amadeus Protocol",
        chain: "own L1 (confidential AI agents)",
        token: "AMA (1B hard cap, no premine)",
        confirmed: true,
        status: "New verified 30.08 (usethebitcoin + amahub.ama.one + cryptorank). PRIME points Season 1 -> $AMA airdrop, TGE targeted September 2026. Every quest requires linking a chain wallet + Amadeus wallet (browser ext) by signature - not API-automatable. Social quests close Aug 31, board Sep 9, season Oct 12. Free parts: check-in +5/day, +100/day post, wallet creation +50, @username +50.",
        bot_able: "NO (2-wallet browser link required); free quests are user tasks",
      },
      {
        name: "Flop Labs (Arthur Hayes)",
        chain: "TBA (own chain)",
        token: "FLOP (~20% of supply to testnet participants, 10y vest)",
        confirmed: true,
        status: "Confirmed. 100% fair launch (no presale, no VCs - Hayes 08.2026). Testnet opens Q4 2026, airdrop Q4 2026, genesis Q1 2027. Faucet will require decentralized identity (DID) keys - only DID-holding agents access it. Rating eased 268 -> 213 deg on airdrops.io (30.08, still top confirmed listing; engagement noise both directions). Creator/KOL track pays $FLOP from audience-generated network activity; Substack counts. Tip: register multiple role forms (free, separate).",
        bot_able: "testnet farm once live (Q4); DID key prep = key differentiator; role forms = Google Forms (human)",
      },
      {
        name: "Omega / Olympus",
        chain: "Solana + Base + Ethereum (+Aptos)",
        token: "pOmega -> token at TGE (not announced)",
        confirmed: true,
        status: "Pre-claim LIVE: 0.003 SOL or ~0.0000957 ETH -> 100 pOmega, no captcha, no claim cap. airdrops.io rating stable 30-35 deg (30.08), Ongoing+Confirmed, 4th campaign on latest list. Live API check 30.08: all 5 farm wallets enabled, claimed=false, SOL balance still 0 - the only blocker is ~$3 of gas. DEX pOmega/mUSDC live.",
        bot_able: "YES - fully scriptable (omega_claim.py), needs gas",
      },
      {
        name: "Wager Predict",
        chain: "BSC testnet",
        token: "WP (10% of 30B supply)",
        confirmed: true,
        status: "Official site (28.08): TGE lands WITH mainnet, not before - 'August 2026' target from third parties is not confirmed by the team. Farming window still open; snapshot at TGE.",
        bot_able: "trades/claim via API, faucets need captcha",
      },
      {
        name: "Canopy",
        chain: "own testnet L1",
        token: "CNPY (50% of 504M supply)",
        confirmed: true,
        status: "testnet live, mainnet 2026, $8.5M seed (cryptorank shows a Snapshot status since Feb 2026 - check rewards hub activity still counts)",
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
