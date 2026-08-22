// Endpoint: stablecoin DeFi yields on Base (DefiLlama yields API, free, no key)
import { fetchJson } from "../util.js";

const URL = "https://yields.llama.fi/pools";

export async function defiYields() {
  const data = await fetchJson(URL);
  const pools = (data?.data || []).filter((p) => {
    const chain = (p.chain || "").toLowerCase();
    const symbol = (p.symbol || "").toUpperCase();
    const stable = ["USDC", "USDT", "DAI", "USDS", "PYUSD", "USD1", "GHO"].some((s) => symbol.includes(s));
    return (chain === "Base" || chain === "Ethereum") && stable && p.apy != null;
  });
  const rows = pools
    .map((p) => ({
      project: p.project,
      symbol: p.symbol,
      chain: p.chain,
      apy_pct: +p.apy.toFixed(2),
      tvl_usd: +p.tvlUsd.toFixed(0),
    }))
    .sort((a, b) => b.apy_pct - a.apy_pct)
    .slice(0, 40);

  return {
    generated_at: new Date().toISOString(),
    source: "yields.llama.fi (DefiLlama)",
    stablecoin_yield_pools: rows,
    warning: "APY changes constantly; check TVL and protocol risk before depositing. Not financial advice.",
  };
}

export const meta = {
  description:
    "Stablecoin lending yields (USDC/USDT/DAI etc.) on Base and Ethereum from DefiLlama: top 40 pools by APY with TVL.",
};
