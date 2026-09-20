#!/usr/bin/env python3
"""Keepalive for the Money Agent x402 seller (real USDC on Base, no accounts needed).

Stack (all free, zero-spend):
  node src/server.js                 -> paid x402 endpoints on 127.0.0.1:4021
  PayAI facilitator                  -> verifies+settles USDC on Base (eip155:8453), no API key
  tailscale funnel --https=10000     -> STABLE public origin https://mi-desktop.rainbow-dab.ts.net:10000
  x402 Arena (core.x402arena.gg)     -> discovery registry, probes the origin for a valid 402

This script:
  1. ensures the node server listens on :4021 (restarts it if dead)
  2. ensures the Tailscale Funnel mapping :10000 -> 4021 is configured (persists across reboots)
  3. loops forever; run it from Windows Task Scheduler at logon/startup

Usage:  python keepalive.py            # daemon loop
        python keepalive.py --register # one-shot: (re)register arena agents (only for a NEW url)
        python keepalive.py --check    # one-shot: print current health, exit
"""
import json, os, re, socket, subprocess, sys, time, urllib.request, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
LOG = os.path.join(ROOT, "logs", "x402_keepalive.log")
os.makedirs(os.path.dirname(LOG), exist_ok=True)

TS = r"C:\Program Files\Tailscale\tailscale.exe"
PORT = 4021
PUBLIC_HOST = "mi-desktop.rainbow-dab.ts.net"
FUNNEL_HTTPS_PORT = "10000"
PUBLIC_URL = f"https://{PUBLIC_HOST}:{FUNNEL_HTTPS_PORT}"
WALLET = "0xD4D124D375775a146218dBD8243A2d17ba540596"
ARENA = "https://core.x402arena.gg/register"

AGENTS = [
    ("moneyagentru-funding-apy", "/v1/funding/apy", "crypto-signals",
     "Live Bybit perpetual funding-rate APY snapshot (700+ perps): top positive/negative funding, open interest, 24h turnover. Refreshed every 60s."),
    ("moneyagentru-testnet-status", "/v1/testnet/status", "crypto-signals",
     "Curated verified testnet-airdrop landscape: which campaigns are live, confirmed, captcha-gated or dead. Updated daily."),
    ("moneyagentru-agent-pulse", "/v1/agent/pulse", "agent-infrastructure",
     "Live supply-vs-demand pulse across AI-agent marketplaces (dealwork.ai, ugig.net, toku.agency): listing counts, real buyer demand, supply-side flooding."),
    ("moneyagentru-crypto-prices", "/v1/crypto/prices", "crypto-signals",
     "Top-100 crypto prices with 24h change (CoinGecko)."),
    ("moneyagentru-defi-yields", "/v1/defi/yields", "crypto-signals",
     "Stablecoin DeFi yield pools on Base/Ethereum (DefiLlama): APY, TVL."),
    ("moneyagentru-github-trending", "/v1/github/trending", "developer-tools",
     "GitHub trending repositories, 7-day window."),
    ("moneyagentru-evm-preflight", "/v1/evm/preflight", "crypto-infrastructure",
     "Cheap runtime primitive for on-chain agents ($0.002): live gas price, block height, native-token USD price and the estimated USD cost of a native transfer / ERC-20 approve / swap on Base, Ethereum, Arbitrum, Optimism, Polygon and BSC - plus ERC-20 symbol/decimals/name resolution (?tokens=0x...)."),
    ("moneyagentru-prediction-markets", "/v1/prediction/markets", "crypto-signals",
     "Live prediction-market odds ($0.002): implied probability per outcome, executable bid/ask band, spread, liquidity and 24h/1w/1m drift across the whole Polymarket board. ?q=<text> searches the venue, ?min_liquidity=<usd> drops thin books. prediction.market is the single x402 capability with measured agent demand."),
]


def log(msg):
    line = f"[{datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')}] {msg}"
    print(line, flush=True)
    try:
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def port_open(host="127.0.0.1", port=PORT, timeout=2.0):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(timeout)
        return s.connect_ex((host, port)) == 0


def start_server():
    if port_open():
        return None
    log("server down -> starting node src/server.js")
    f = open(os.path.join(ROOT, "logs", "x402_server.out"), "a", encoding="utf-8")
    p = subprocess.Popen(["node", "src/server.js"], cwd=HERE, stdout=f, stderr=subprocess.STDOUT,
                         creationflags=getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0) | 0x00000008)
    for _ in range(30):
        time.sleep(0.5)
        if port_open():
            log(f"server up (pid {p.pid})")
            return p
    log("WARN: server did not open :%d" % PORT)
    return p


def funnel_ok():
    try:
        out = subprocess.run([TS, "funnel", "status"], capture_output=True, text=True, timeout=20)
        return (FUNNEL_HTTPS_PORT in out.stdout and f"127.0.0.1:{PORT}" in out.stdout)
    except Exception as e:
        log(f"funnel status error: {e!r}")
        return False


def ensure_funnel():
    if funnel_ok():
        return True
    log(f"configuring tailscale funnel {PUBLIC_URL} -> 127.0.0.1:{PORT}")
    try:
        r = subprocess.run([TS, "funnel", "--bg", f"--https={FUNNEL_HTTPS_PORT}", str(PORT)],
                           capture_output=True, text=True, timeout=40)
        log("funnel set rc=%s" % r.returncode)
        return r.returncode == 0
    except Exception as e:
        log(f"funnel set error: {e!r}")
        return False


def register():
    ok = 0
    for name, path, niche, desc in AGENTS:
        body = json.dumps({"name": name, "endpoint": PUBLIC_URL + path, "niche": niche,
                           "description": desc, "walletAddress": WALLET,
                           "method": "GET", "resourceType": "http"}).encode()
        req = urllib.request.Request(ARENA, data=body,
                                     headers={"Content-Type": "application/json",
                                              "User-Agent": "money-agent-ru/1.0"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                d = json.loads(r.read() or b"{}")
                if d.get("verified"):
                    ok += 1
                else:
                    log(f"register {name}: {d}")
        except Exception as e:
            log(f"register {name}: {e!r}")
    log(f"arena registration: {ok}/{len(AGENTS)} verified @ {PUBLIC_URL}")
    return ok


def health():
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/healthz", timeout=8) as r:
            log("local healthz: " + r.read().decode())
    except Exception as e:
        log(f"local healthz error: {e!r}")
    log("funnel mapped: %s" % funnel_ok())


def main():
    if "--register" in sys.argv:
        return 0 if register() else 1
    if "--check" in sys.argv:
        health(); return 0
    if "--ensure" in sys.argv:
        start_server(); ensure_funnel(); health(); return 0
    # singleton guard: only one daemon at a time (bind a lock port)
    lock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        lock.bind(("127.0.0.1", 4029))
        lock.listen(1)
    except OSError:
        log("another keepalive instance is already running; exiting")
        return 0
    srv = start_server()
    ensure_funnel()
    log("keepalive started (public %s)" % PUBLIC_URL)
    while True:
        if not port_open():
            log("server died; restarting")
            srv = start_server()
        if not funnel_ok():
            ensure_funnel()
        time.sleep(60)


if __name__ == "__main__":
    sys.exit(main())
