// Endpoint: Bybit perpetual funding-rate APY snapshot (unique data, live)
import { fetchJson } from "../util.js";
import { config } from "../config.js";

const URL = "https://api.bybit.com/v5/market/tickers?category=linear";

// funding rate is per 8h; APY = rate * 3 * 365
export async function fundingApy() {
  const data = await fetchJson(URL);
  const list = data?.result?.list || [];
  const rows = list
    .filter((t) => t.fundingRate && t.fundingRate !== "0")
    .map((t) => ({
      symbol: t.symbol,
      price: t.lastPrice,
      funding_rate_8h: parseFloat(t.fundingRate),
      funding_apy_pct: +(parseFloat(t.fundingRate) * 3 * 365 * 100).toFixed(2),
      open_interest_usd: t.openInterestValue ? +parseFloat(t.openInterestValue).toFixed(0) : null,
      turnover_24h_usd: t.turnover24h ? +parseFloat(t.turnover24h).toFixed(0) : null,
    }))
    .sort((a, b) => b.funding_apy_pct - a.funding_apy_pct);

  return {
    generated_at: new Date().toISOString(),
    source: "api.bybit.com v5 (public, no auth)",
    perp_count: rows.length,
    top_positive_apy: rows.filter((r) => r.funding_apy_pct > 0).slice(0, 25),
    top_negative_apy: rows.filter((r) => r.funding_apy_pct < 0).slice(-10).reverse(),
    note: "APY = 8h funding rate * 3 * 365. Thin books and perps without a spot leg are traps - check turnover and spot pair before trading.",
  };
}

export const meta = {
  description:
    "Live Bybit perpetual funding-rate APY snapshot (700+ perps): top positive and negative funding, open interest, 24h turnover. Unique data, refreshed every 60s.",
};
