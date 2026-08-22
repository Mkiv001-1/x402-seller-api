// Endpoint: top-100 crypto prices (CoinGecko free API, no key)
import { fetchJson } from "../util.js";
import { config } from "../config.js";

const URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&sparkline=false";

export async function cryptoPrices() {
  const data = await fetchJson(URL);
  return {
    generated_at: new Date().toISOString(),
    source: "coingecko.com free API",
    count: data.length,
    coins: data.map((c) => ({
      id: c.id,
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      price_usd: c.current_price,
      market_cap: c.market_cap,
      change_24h_pct: c.price_change_percentage_24h,
      volume_24h: c.total_volume,
    })),
  };
}

export const meta = {
  description:
    "Top-100 cryptocurrency prices with 24h change, market cap and volume. Live from CoinGecko, refreshed every 60s.",
};
