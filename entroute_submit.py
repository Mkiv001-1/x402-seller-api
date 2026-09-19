#!/usr/bin/env python3
"""EntRoute (entroute.com) x402 directory submitter + hourly queue driver.

Source of the protocol (reverse-engineered 2026-09-19 from entroute.com/providers,
the "submit.sh" card):
  curl -X POST https://api.entroute.com/submit \
    -H "Content-Type: application/json" \
    -d '{"endpoint_url":"...","capability_id":"web.search","contact_email":"..."}'

Behaviour learned the hard way on 2026-09-19:
  * POST /submit is rate-limited to **1 submission per hour per IP**. A second
    call inside the hour answers HTTP 500 {"internal_error"} (and only once the
    window is genuinely exhausted, HTTP 429 {"rate_limited","retry_after":...}).
    So one route per invocation, driven by a scheduler, is the only workable shape.
  * GET /submit/<submission_id> reports status + claim_status.
  * The 201 body asks for a DNS TXT record at _entroute.<host>. That is the
    *claim* step (claim_status pending) and is NOT required for probing:
    endpoint status goes received -> probed -> verified independently.
  * EntRoute is agent-facing (MCP server + @entroute/sdk-agent-ts) and re-probes
    every 10 minutes; unverified endpoints are held out of /discover.

Usage:
  python entroute_submit.py next      # submit ONE pending endpoint, then exit
  python entroute_submit.py status    # list queue + submission statuses
  python entroute_submit.py reset     # rebuild the queue from SUBMISSIONS
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
QUEUE = os.path.join(HERE, "entroute_queue.json")
LOG = os.path.join(HERE, "entroute_submit.log")

UA = "money-agent-ru/1.0 (+https://mkiv001-1.github.io/airdrop-guides/)"
API = "https://api.entroute.com"
ORIGIN = "https://mi-desktop.rainbow-dab.ts.net:10000"
EMAIL = "michael.ivanov.tm@gmail.com"

SUBMISSIONS = [
    ("/v1/crypto/prices", "finance.crypto_price"),
    ("/v1/funding/apy", "finance.perpetuals"),
    ("/v1/defi/yields", "defi.yield_opportunities"),
    ("/v1/evm/preflight", "crypto.gas_price"),
    ("/v1/github/trending", "web.search"),
    ("/v1/testnet/status", "news.search"),
    ("/v1/agent/pulse", "web.search"),
]


def log(msg):
    line = f"[{time.strftime('%Y-%m-%dT%H:%M:%S%z')}] {msg}"
    print(line)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def load():
    if os.path.exists(QUEUE):
        return json.load(open(QUEUE, encoding="utf-8"))
    return {"pending": [{"route": r, "cap": c} for r, c in SUBMISSIONS], "done": []}


def save(q):
    json.dump(q, open(QUEUE, "w", encoding="utf-8"), indent=1)


def post(path, payload, timeout=60):
    req = urllib.request.Request(
        API + path,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "User-Agent": UA, "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="ignore")


def get(path, timeout=30):
    req = urllib.request.Request(API + path, headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="ignore")


def cmd_next():
    q = load()
    if not q["pending"]:
        log("queue empty - nothing to submit")
        return 0
    item = q["pending"][0]
    route, cap = item["route"], item["cap"]
    payload = {"endpoint_url": ORIGIN + route, "capability_id": cap, "contact_email": EMAIL}
    st, body = post("/submit", payload)
    try:
        d = json.loads(body)
    except Exception:
        d = {"raw": body[:300]}
    if st in (200, 201):
        q["pending"].pop(0)
        sid = d.get("submission_id")
        q["done"].append({"route": route, "cap": cap, "status": d.get("status"), "sid": sid,
                          "claim_status": d.get("claim_status"), "at": time.strftime("%Y-%m-%dT%H:%M:%S")})
        save(q)
        log(f"OK {st} {route} cap={cap} sid={sid} status={d.get('status')} claim={d.get('claim_status')}")
        v = d.get("verification") or {}
        if v.get("instructions"):
            log("   verify: " + v["instructions"].replace("\n", " ")[:220])
        return 0
    if st == 429:
        log(f"RATE LIMITED {route} retry_after={d.get('retry_after')} - keeping at head of queue")
        return 0
    log(f"FAIL {st} {route} {json.dumps(d)[:200]} - dropped from queue")
    q["pending"].pop(0)
    q["done"].append({"route": route, "cap": cap, "status": f"http_{st}", "at": time.strftime("%Y-%m-%dT%H:%M:%S")})
    save(q)
    return 1


def cmd_status():
    q = load()
    print(f"pending: {len(q['pending'])}  done: {len(q['done'])}")
    for d in q["done"]:
        extra = ""
        if d.get("sid"):
            st, body = get("/submit/" + d["sid"])
            try:
                j = json.loads(body)
                extra = f" | live status={j.get('status')} claim={j.get('claim_status')}"
            except Exception:
                extra = f" | {body[:80]}"
        print(f"  {d['route']:<22} {d.get('status')}{extra}")
    for p in q["pending"]:
        print(f"  PENDING {p['route']:<22} {p['cap']}")
    return 0


def cmd_reset():
    save({"pending": [{"route": r, "cap": c} for r, c in SUBMISSIONS], "done": []})
    print("queue reset")
    return 0


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "status"
    sys.exit({"next": cmd_next, "status": cmd_status, "reset": cmd_reset}[mode]())
