#!/usr/bin/env python3
"""Primary-source census of the x402 seller market (v2).

Pulls every listing from the public, unauthenticated x402-list.com API
(CC BY 4.0, attribution: "Data: x402-list.com") and then, per listing,
the daily settlement series at /api/v1/services/<slug>/volume and the
buyer series at .../buyers, summing the last 30 days.

Motivation: a peer's 2026-08-28 census (dev.to, agent 'selfagent') reported
$516.96 settled by ALL 575 listed x402 services in 30 days / $17.23 a day,
with 79% of it in one service. We re-run the measurement ourselves rather
than citing them, so the strategy is based on primary evidence.

Usage: python census_x402list.py [--days 30] [--save out.json]
"""
import json
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta

BASE = "https://x402-list.com/api/v1"
UA = "money-agent-ru-census/2.0 (+https://mkiv001-1.github.io/airdrop-guides/)"
DAYS = 30


def get(url, timeout=45):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def all_listings():
    out, page = [], 1
    while True:
        d = get(f"{BASE}/services?per_page=100&page={page}")
        batch = d.get("data") or []
        out.extend(batch)
        tp = (d.get("meta") or {}).get("total_pages")
        if not batch or not tp or page >= tp:
            break
        page += 1
        time.sleep(0.2)
    return out


def series(slug, kind):
    try:
        d = get(f"{BASE}/services/{slug}/{kind}")
        return d.get("data") or []
    except Exception:
        return []


def main():
    days = DAYS
    if "--days" in sys.argv:
        days = int(sys.argv[sys.argv.index("--days") + 1])
    cutoff = (date.today() - timedelta(days=days)).isoformat()

    listings = all_listings()
    print(f"listings: {len(listings)}")

    rows = []

    def work(s):
        slug = s["slug"]
        vol = [r for r in series(slug, "volume") if r.get("date", "") >= cutoff]
        buy = [r for r in series(slug, "buyers") if r.get("date", "") >= cutoff]
        v = sum(float(r.get("volume_usd") or 0) for r in vol)
        tx = sum(int(r.get("tx_count") or 0) for r in vol)
        b = max((int(r.get("unique_buyers") or 0) for r in buy), default=0)
        return {"slug": slug, "name": s.get("name"), "price": s.get("min_price_usd"),
                "verified": s.get("verified"), "payment_ready": s.get("payment_ready"),
                "usd": round(v, 4), "tx": tx, "buyers_peak_day": b,
                "days_active": len(vol)}

    with ThreadPoolExecutor(max_workers=16) as ex:
        for i, r in enumerate(ex.map(work, listings), 1):
            rows.append(r)
            if i % 100 == 0:
                print(f"  measured {i}/{len(listings)}", flush=True)

    earners = sorted([r for r in rows if r["usd"] > 0], key=lambda r: -r["usd"])
    total = sum(r["usd"] for r in earners)
    measured = [r for r in rows if r["days_active"] > 0]

    print(f"\n{'='*66}")
    print(f"x402-LIST CENSUS  {time.strftime('%Y-%m-%d %H:%M UTC', time.gmtime())}")
    print(f"{'='*66}")
    print(f"listed services            : {len(rows)}")
    print(f"with a measured series     : {len(measured)}")
    print(f"settled anything ({days}d)   : {len(earners)}")
    print(f"TOTAL SETTLED              : ${total:.2f}   (${total/days:.2f}/day)")
    if earners:
        print(f"top earner share           : {100*earners[0]['usd']/total:.1f}%")
        print(f"top-3 share                : {100*sum(r['usd'] for r in earners[:3])/total:.1f}%")
        print(f"top-5 share                : {100*sum(r['usd'] for r in earners[:5])/total:.1f}%")
        rest = total - sum(r["usd"] for r in earners[:3])
        print(f"all but top-3              : ${rest:.2f} over {days}d "
              f"across {max(len(earners)-3,0)} services")
        print(f"\nTOP 20:")
        for r in earners[:20]:
            print(f"  ${r['usd']:>9.2f}  tx={r['tx']:>6}  buyers={r['buyers_peak_day']:>3}  "
                  f"${r['price']:<8} {str(r['name'])[:44]}")
        # price comparison earners vs non-earners
        for label, group in (("EARNERS", earners), ("NON-EARNERS", [r for r in rows if r["usd"] == 0])):
            ps = [r["price"] for r in group if r["price"] is not None]
            if ps:
                ps.sort()
                print(f"median list price {label:12}: ${ps[len(ps)//2]}  (n={len(ps)})")
        pr = len([r for r in rows if r["payment_ready"]])
        print(f"\npayment_ready badge        : {pr}/{len(rows)} "
              f"({100*pr/max(len(rows),1):.1f}%) -> "
              f"{100*(len(rows)-len(earners))/max(len(rows),1):.1f}% not paid")

    print("\n--- OUR ORIGIN ---")
    mine = [r for r in rows if "rainbow-dab" in json.dumps(r).lower()
            or "0xd4d124d375775a146218dbd8243a2d17ba540596" in json.dumps(r).lower()]
    print(json.dumps(mine, ensure_ascii=False) if mine else
          "NOT PRESENT in x402-list (our origin is not listed)")

    if "--save" in sys.argv:
        path = sys.argv[sys.argv.index("--save") + 1]
        json.dump({"fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                   "days": days, "listings": len(rows), "earners": len(earners),
                   "total_usd": round(total, 2), "attribution": "Data: x402-list.com (CC BY 4.0)",
                   "top": earners[:25]}, open(path, "w"), ensure_ascii=False, indent=1)
        print(f"\nsaved -> {path}")


if __name__ == "__main__":
    main()
