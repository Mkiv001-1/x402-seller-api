import json, collections

d = json.load(open('/tmp/x402all.json'))
items = d if isinstance(d, list) else (d.get('resources') or d.get('items') or [])
if isinstance(items, dict):
    items = list(items.values())

print('total resources:', len(items))
print('categories:', collections.Counter(i.get('category') for i in items).most_common())

prices = collections.Counter()
for i in items:
    a = i.get('cheapest_atomic')
    try:
        prices[round(int(a) / 1e6, 5)] += 1
    except Exception:
        prices['n/a'] += 1
print('price points:', prices.most_common(14))

# what share of the catalog is at or below our new primitive price?
tot = sum(v for k, v in prices.items() if k != 'n/a')
cheap = sum(v for k, v in prices.items() if k != 'n/a' and k <= 0.002)
print(f'cheap (<=$0.002): {cheap}/{tot} = {100.0*cheap/max(tot,1):.1f}%')

# competitor scan: who sells gas/tx-cost-ish or chain-data primitives?
kw = ('gas', 'preflight', 'tx cost', 'fee', 'chain', 'rpc', 'nonce', 'token metadata', 'decimals')
hits = [i for i in items if any(k in (i.get('title', '') + ' ' + (i.get('summary') or '')).lower() for k in kw)]
print('gas/chain-ish competitors:', len(hits))
for h in hits[:10]:
    print('  -', (h.get('title') or '')[:60], '|', h.get('cheapest_atomic'), '|', h.get('origin_host'), '|', h.get('category'))
