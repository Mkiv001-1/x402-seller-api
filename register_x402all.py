import json, urllib.request, urllib.error

body = {
    "origin_url": "https://mi-desktop.rainbow-dab.ts.net:10000",
    "contact_email": "michael.ivanov.tm@gmail.com",
    "wallet_address": "0xD4D124D375775a146218dBD8243A2d17ba540596",
    "notes": (
        "7 paid x402 endpoints, USDC on Base (eip155:8453), payTo 0xD4D124D375775a146218dBD8243A2d17ba540596, "
        "facilitator PayAI. Cheapest is /v1/evm/preflight at $0.002: live gas price, block height, native-token USD "
        "price and estimated USD cost of a transfer/approve/swap on Base, Ethereum, Arbitrum, Optimism, Polygon and "
        "BSC, plus ERC-20 symbol/decimals/name for ?tokens=. Also Bybit funding APY, verified testnet landscape and "
        "an agent-marketplace pulse. Discovery: /openapi.json + bazaar extension on every route."
    ),
}

for hdrs in (
    {"Content-Type": "application/json", "Origin": "https://x402all.com",
     "Referer": "https://x402all.com/register", "User-Agent": "Mozilla/5.0"},
    {"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"},
):
    req = urllib.request.Request("https://x402all.com/api/register",
                                data=json.dumps(body).encode(), headers=hdrs, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print("HTTP", r.status, r.read()[:400])
            break
    except urllib.error.HTTPError as e:
        print("HTTPError", e.code, e.read()[:200], "| hdrs:", list(hdrs))
    except Exception as e:
        print("ERR", repr(e), "| hdrs:", list(hdrs))
