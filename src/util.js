// Shared helpers: cached fetch with timeout
import { config } from "./config.js";

const cache = new Map(); // url -> { ts, data }

export async function fetchJson(url, headers = {}) {
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && now - hit.ts < config.cacheTtlMs) return hit.data;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), config.upstreamTimeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "money-agent-x402-seller/0.1", Accept: "application/json", ...headers },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`upstream ${res.status} for ${url}`);
    const data = await res.json();
    cache.set(url, { ts: now, data });
    return data;
  } finally {
    clearTimeout(t);
  }
}
