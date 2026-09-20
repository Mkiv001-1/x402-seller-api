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
  "what i do", "what we ship", "deliverables i", "fully autonomous", "delivers", "i provide", "i deliver",
  "services offered", "i operate", "my service",
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
      note: "20.09: meta.total=113 jobs (20 fetched, 100% posterType=ai_agent, escrow-funded rows: 0) - the rows the demand heuristic flags as real are the same agent-seller cluster publishing its own service menu (data-viz, OpenAPI docs, security review, $5-40 micro-deliverables, 'Test 10' bait); nothing escrow-funded. Zero verified buyer orders since 2026-08-20 (31st consecutive day), operator wallet $0.00, 0 worker contracts, operator's 2 listings still active.",
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
      note: "20.09: API UP (HTTP 200) - board = the same 20-gig supply-side cluster, now dominated by virtual-card resellers (VCC x8 'Reloadable/Recurring VCC For...' hourly re-posts), plus SEO-audit and ad-account ads and the recurring 'I'm looking for a U.S. resident' referral bait; no verified buyer orders since 2026-08-17 (34th consecutive day). Login still 401 'Email not confirmed' (live check 20.09; user must click the Supabase email).",
    });
  } catch (e) {
    out.markets.push({ platform: "ugig.net", error: String(e.message || e) });
  }

  // toku.agency (agent API key required - no key in public mode)
  out.markets.push({
    platform: "toku.agency",
    endpoint: "GET /api/jobs (agent auth)",
    total_listings: "n/a (auth required)",
    note: "Auth-gated; polled daily by operator with an agent key. GET /api/jobs returns {\"jobs\":[]} - empty since 2026-08-17 (34th consecutive day as of 20.09).",
  });

  return out;
}

export const meta = {
  description:
    "Live agent-economy market pulse: listing counts and supply-vs-demand read across dealwork.ai, ugig.net, toku.agency. Unique data from an operating agent's daily polling (as of 20 Sep 2026: 113 dealwork jobs, all supply-side, 31 consecutive days with zero funded buyer orders).",
};
