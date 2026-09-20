// Endpoint: live prediction-market odds (Polymarket public Gamma API, no key).
//
// WHY THIS EXISTS (2026-09-20): EntRoute's public stats page was measured directly and
// it is the only place in the x402 ecosystem that publishes per-capability DISCOVERY
// demand. Result: of 32 capabilities with verified endpoints, exactly one gets real
// agent traffic - `prediction.market` (1,313 discovery requests / 7d, more than every
// other capability combined; finance.crypto_price got 4, web.serp 1). The same page
// reports "fulfillment verified: 0" across all 2,553 endpoints, so predictions are not
// paying yet either - but if any x402 capability is going to be asked for by a runtime
// agent, this is the shape to be present in.
//
// Data source: gamma-api.polymarket.com (public, no auth).
//   GET /markets?closed=false&active=true&order=volume24hr   -> the live board
//   GET /public-search?q=<text>                              -> text search fallback
// We return what an agent actually needs to decide: implied probability per outcome,
// the live bid/ask band (execution cost), liquidity, and 24h/1w/1m price drift.
import { fetchJson } from "../util.js";

const MARKETS = "https://gamma-api.polymarket.com/markets";
const SEARCH = "https://gamma-api.polymarket.com/public-search";

function parseMaybeJson(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

const num = (v) => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

function mapMarket(m) {
  const outcomes = parseMaybeJson(m.outcomes);
  const prices = parseMaybeJson(m.outcomePrices).map((p) => num(p));
  const bid = num(m.bestBid);
  const ask = num(m.bestAsk);
  return {
    question: m.question,
    slug: m.slug,
    condition_id: m.conditionId,
    end_date: m.endDate,
    outcomes: outcomes.map((name, i) => ({ outcome: name, implied_probability: prices[i] ?? null })),
    // midpoint + spread in probability points: what it costs to actually trade
    mid_probability: bid != null && ask != null ? Number(((bid + ask) / 2).toFixed(4)) : null,
    bid,
    ask,
    spread: num(m.spread),
    liquidity_usd: num(m.liquidity),
    volume_24h_usd: num(m.volume24hr),
    volume_total_usd: num(m.volume),
    price_change_1d: num(m.oneDayPriceChange),
    price_change_1w: num(m.oneWeekPriceChange),
    price_change_1m: num(m.oneMonthPriceChange),
    accepting_orders: m.acceptingOrders ?? null,
    neg_risk: m.negRisk ?? null,
    restricted: m.restricted ?? null,
    event: Array.isArray(m.events) && m.events[0] ? m.events[0].title || m.events[0].ticker : null,
  };
}

const isLive = (m) => m && !m.closed && m.active !== false;

export async function predictionMarkets({ limit = 20, q = "", minLiquidity = 0 } = {}) {
  const lim = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const minLiq = num(minLiquidity) || 0;
  const needle = String(q || "").trim();

  let rows;
  let source_mode;
  if (needle) {
    // Text search: the volume-ordered board would miss niche queries entirely.
    const s = await fetchJson(
      `${SEARCH}?q=${encodeURIComponent(needle)}&limit_per_type=${Math.max(5, Math.min(20, lim))}`
    );
    rows = (s.events || []).flatMap((e) => (e.markets || []).map((m) => ({ ...m, eventTitle: e.title })));
    source_mode = "public-search";
  } else {
    const want = lim;
    rows = await fetchJson(`${MARKETS}?closed=false&active=true&limit=${want}&order=volume24hr&ascending=false`);
    source_mode = "board-by-24h-volume";
  }

  const markets = rows
    .filter(isLive)
    .filter((m) => {
      const liq = num(m.liquidity) ?? 0;
      return liq >= minLiq;
    })
    .sort((a, b) => (num(b.volume24hr) ?? num(b.volume) ?? 0) - (num(a.volume24hr) ?? num(a.volume) ?? 0))
    .slice(0, lim)
    .map(mapMarket);

  return {
    generated_at: new Date().toISOString(),
    source: "polymarket gamma-api (public, no key)",
    venue: "polymarket",
    mode: source_mode,
    sort: "volume desc",
    filter: { q: needle || null, min_liquidity_usd: minLiq || null },
    returned: markets.length,
    markets,
    usage_note:
      "implied_probability is the venue's current odds (0-1). Executable band = mid_probability +/- spread/2. liquidity_usd and volume_24h_usd say whether size can fill. ?q=<text> searches the whole venue; ?min_liquidity=<usd> drops thin books.",
  };
}

export const meta = {
  description:
    "Live prediction-market odds with implied probabilities, executable bid/ask spread, liquidity and 24h volume, across the whole Polymarket board ordered by 24h volume. Filter with ?q=text or ?min_liquidity=USD. This is the capability class with by far the most measured x402 agent demand (prediction.market: 1,313 discovery requests/7d vs 4 for crypto price).",
};
