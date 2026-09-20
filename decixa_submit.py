#!/usr/bin/env python3
"""Decixa (decixa.ai) x402 directory submitter.

Reverse-engineered 2026-09-19 from the /submit page chunk
(.tmp_dx/01flg8033cf0v.js): the form calls two JSON endpoints:

  POST /api/submit/verify   {"endpoints": ["<url>", ...]}
       -> {"results":[{endpoint, verified, error, hint, http_status, payTo, network, asset, schema_completeness}]}
  POST /api/submit/publish  {provider_name, provider_website?, wallet_address, contact_email,
                             endpoints:[{url, description, display_name?, price_per_call?}]}
       -> {"apis":[...]}   (422 with .results = re-verify failure, 429 = rate limit)

Decixa is probe-based (no settlement gate), so it indexes us without a first payment.
Description must be >= 10 chars. Use --verify first, then --publish.
"""
import argparse
import json
import urllib.error
import urllib.request

UA = "https://mkiv001-1.github.io/airdrop-guides/ (money-agent-ru x402 seller)"
BASE = "https://decixa.ai"

ORIGIN = "https://mi-desktop.rainbow-dab.ts.net:10000"
WALLET = "0xD4D124D375775a146218dBD8243A2d17ba540596"
EMAIL = "michael.ivanov.tm@gmail.com"
PROVIDER = "Money Agent RU"
WEBSITE = "https://mkiv001-1.github.io/airdrop-guides/"

ENDPOINTS = [
    {
        "url": ORIGIN + "/v1/crypto/prices",
        "display_name": "Top-100 crypto prices",
        "description": "Top-100 cryptocurrency USD prices with 24h change, market cap and volume. Live CoinGecko data, single call returns the full board.",
        "price_per_call": 0.01,
    },
    {
        "url": ORIGIN + "/v1/funding/apy",
        "display_name": "Bybit perp funding APY",
        "description": "Live Bybit perpetual funding-rate APY snapshot across 700+ perps: top positive and negative funding, annualised. Unique data from our own scanner.",
        "price_per_call": 0.05,
    },
    {
        "url": ORIGIN + "/v1/testnet/status",
        "display_name": "Verified testnet airdrop landscape",
        "description": "Curated independently verified testnet airdrop landscape: confirmed tokens, TGE targets and honest verification status per campaign.",
        "price_per_call": 0.03,
    },
    {
        "url": ORIGIN + "/v1/defi/yields",
        "display_name": "Stablecoin DeFi yields",
        "description": "Stablecoin lending yields (USDC/USDT/DAI) on Base and Ethereum from DefiLlama, top 40 pools by APY.",
        "price_per_call": 0.02,
    },
    {
        "url": ORIGIN + "/v1/github/trending",
        "display_name": "GitHub trending repos",
        "description": "GitHub repositories created in the last 7 days sorted by stars (top 20) - fresh-project radar for agents.",
        "price_per_call": 0.01,
    },
    {
        "url": ORIGIN + "/v1/agent/pulse",
        "display_name": "Agent-economy market pulse",
        "description": "Live agent-economy market pulse: listing counts and supply-vs-demand read across dealwork.ai, ugig.net and toku.agency, from our daily polling.",
        "price_per_call": 0.03,
    },
    {
        "url": ORIGIN + "/v1/evm/preflight",
        "display_name": "EVM tx preflight (gas, USD cost, ERC-20 metadata)",
        "description": "Runtime preflight before an EVM transaction: live gas price, block height, USD cost of transfer/approve/swap on 6 chains plus ERC-20 symbol/decimals/name.",
        "price_per_call": 0.002,
    },
    {
        "url": ORIGIN + "/v1/prediction/markets",
        "display_name": "Live prediction-market odds (Polymarket)",
        "description": "Live prediction-market odds with implied probability per outcome, executable bid/ask band, spread, liquidity and 24h/1w/1m drift, across the whole Polymarket board. Filter with ?q=text or ?min_liquidity=USD.",
        "price_per_call": 0.002,
    },
]


def post(path, payload, timeout=90):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "User-Agent": UA, "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="ignore")
        try:
            return e.code, json.loads(body or "{}")
        except Exception:
            return e.code, {"raw": body[:500]}


def cmd_verify():
    st, d = post("/api/submit/verify", {"endpoints": [e["url"] for e in ENDPOINTS]})
    print("verify HTTP", st)
    ok = 0
    for r in d.get("results", []):
        good = r.get("verified")
        ok += 1 if good else 0
        print(f"  {'OK ' if good else 'FAIL'} {r.get('endpoint')}  http={r.get('http_status')} "
              f"net={r.get('network')} asset={r.get('asset')} payTo={r.get('payTo')} "
              f"schema={r.get('schema_completeness')} err={r.get('error') or ''} hint={r.get('hint') or ''}")
    print(f"verified {ok}/{len(d.get('results', []))}")
    return ok


def cmd_publish():
    payload = {
        "provider_name": PROVIDER,
        "provider_website": WEBSITE,
        "wallet_address": WALLET,
        "contact_email": EMAIL,
        "endpoints": ENDPOINTS,
    }
    st, d = post("/api/submit/publish", payload)
    print("publish HTTP", st)
    print(json.dumps(d, indent=2)[:2000])
    return st


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["verify", "publish", "all"])
    a = ap.parse_args()
    if a.mode in ("verify", "all"):
        cmd_verify()
    if a.mode in ("publish", "all"):
        cmd_publish()
