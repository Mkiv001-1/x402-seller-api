#!/usr/bin/env python3
"""PayAPI Market (payapi.market) listing submitter.

Reverse-engineered 2026-09-19 from www.payapi.market/assets/index-*.js:
the /list form POSTs to /api/submit-listing with

  {"provider": {name, email, company_name, wallet_address},
   "api":      {name, description, category, base_url, mcp_endpoint,
                paid_route_url, paid_route_method, paid_route_example_body,
                paid_route_quote_usdc, endpoints_count, tools_count,
                price_min, price_max},
   "tier": "free"}

Preflight (server-side, at submit time): calls paid_route_url unpaid, requires a
Base x402 challenge whose payTo == wallet_address and extra.name == "USD Coin".
Then a human review. Listing is free; ephemeral tunnel hosts are rejected.
"""
import argparse
import json
import urllib.error
import urllib.request

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36"
SITE = "https://payapi.market"  # apex, not www (www 301-redirects and drops POST)
ORIGIN = "https://mi-desktop.rainbow-dab.ts.net:10000"
WALLET = "0xD4D124D375775a146218dBD8243A2d17ba540596"

PAYLOAD = {
    "provider": {
        "name": "Money Agent RU",
        "email": "michael.ivanov.tm@gmail.com",
        "company_name": "Money Agent RU",
        "wallet_address": WALLET,
    },
    "api": {
        "name": "Money Agent RU - agent-economy data suite (7 endpoints)",
        "description": (
            "Seven pay-per-call x402 data endpoints for autonomous agents, operated by a live agent: "
            "Bybit perpetual funding-rate APY snapshot (700+ perps), top-100 crypto prices, stablecoin DeFi "
            "yields on Base/Ethereum, EVM transaction preflight (gas, USD cost of transfer/approve/swap on 6 "
            "chains + ERC-20 metadata), verified testnet-airdrop landscape, GitHub trending repos, and a live "
            "agent-economy market pulse across dealwork.ai/ugig.net/toku.agency. USDC on Base."
        ),
        "category": "Data",
        "base_url": ORIGIN,
        "mcp_endpoint": "",
        "paid_route_url": ORIGIN + "/v1/evm/preflight",
        "paid_route_method": "GET",
        "paid_route_example_body": "",
        "paid_route_quote_usdc": "0.002",
        "endpoints_count": "7",
        "tools_count": "0",
        "price_min": "0.002",
        "price_max": "0.05",
    },
    "tier": "free",
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry", action="store_true")
    a = ap.parse_args()
    if a.dry:
        print(json.dumps(PAYLOAD, indent=2))
        return
    req = urllib.request.Request(
        SITE + "/api/submit-listing",
        data=json.dumps(PAYLOAD).encode(),
        headers={"Content-Type": "application/json", "User-Agent": UA, "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            print("HTTP", r.status)
            print(r.read().decode()[:2500])
    except urllib.error.HTTPError as e:
        print("HTTP", e.code)
        print(e.read().decode(errors="ignore")[:2500])


if __name__ == "__main__":
    main()
