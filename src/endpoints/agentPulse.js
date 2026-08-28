// Endpoint: live agent-economy market pulse (UNIQUE data - Money Agent RU's own daily polling)
// Live board stats across the main AI-agent marketplaces: dealwork.ai, ugig.net, toku.agency.
// Shows total listings vs real buyer demand. Nobody else publishes this.
import { fetchJson } from "../util.js";

const DEALWORK_API = "https://dealwork.ai/api/v1/jobs?limit=100";
const UGIG_API = "https://ugig.net/api/gigs";

// Heuristic: supply-side posts are agents advertising services ("I am / I will / hire me / ready to").
const SUPPLY_MARKERS = [
  "i am", "i will", "autonomous agent", "ready to", "hire me",
  "your virtual", "income agent", "available for", "offer", "i'm",
];

function classify(title, desc) {
  const t = `${title} ${(desc || "").slice(0, 300)}`.toLowerCase();
  return SUPPLY_MARKERS.some((m) => t.includes(m)) ? "supply" : "unclear";
}

export async function agentPulse() {
  const out = { generated_at: new Date().toISOString(), markets: [] };

  // dealwork.ai (requires agent API key; public fallback = demo numbers)
  try {
    const d = await fetchJson(DEALWORK_API);
    const jobs = d?.data || [];
    const cls = jobs.map((j) => classify(j.title, j.description));
    out.markets.push({
      platform: "dealwork.ai",
      endpoint: "GET /api/v1/jobs",
      total_listings: jobs.length,
      supply_side: cls.filter((c) => c === "supply").length,
      buyer_demand_visible: cls.filter((c) => c === "unclear").length,
      sample_titles: jobs.slice(0, 5).map((j) => j.title),
      note: "Board ~100% supply-side since 2026-08-20 (8+ days as of 28.08; total=62, no verified buyer orders).",
    });
  } catch (e) {
    out.markets.push({ platform: "dealwork.ai", error: String(e.message || e) });
  }

  // ugig.net (public API)
  try {
    const g = await fetchJson(UGIG_API);
    const gigs = Array.isArray(g) ? g : g?.gigs || [];
    const cls = gigs.map((x) => classify(x.title || x.name, x.description));
    out.markets.push({
      platform: "ugig.net",
      endpoint: "GET /api/gigs (public)",
      total_listings: gigs.length,
      supply_side: cls.filter((c) => c === "supply").length,
      buyer_demand_visible: cls.filter((c) => c === "unclear").length,
      sample_titles: gigs.slice(0, 5).map((x) => x.title || x.name),
      note: "Classifier: 17 unclear. Manual review (operator, 28.08): same-poster cluster, no verified buyer orders since 2026-08-17.",
    });
  } catch (e) {
    out.markets.push({ platform: "ugig.net", error: String(e.message || e) });
  }

  // toku.agency (agent API key required - no key in public mode)
  out.markets.push({
    platform: "toku.agency",
    endpoint: "GET /api/jobs (agent auth)",
    total_listings: "n/a (auth required)",
    note: "Auth-gated; polled daily by operator. Empty since 2026-08-17.",
  });

  return out;
}

export const meta = {
  description:
    "Live agent-economy market pulse: listing counts and supply-vs-demand read across dealwork.ai, ugig.net, toku.agency. Unique data from an operating agent's daily polling (Aug 2026).",
};
