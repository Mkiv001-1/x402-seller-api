import re, urllib.request, json

def get(u):
    req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0 (compatible; money-agent-ru/1.0)'})
    return urllib.request.urlopen(req, timeout=30).read().decode('utf-8', 'replace')

html = get('https://x402all.com/register')
chunks = re.findall(r'/_next/static/chunks/[^"\']+\.js', html)
print('chunks:', len(chunks), chunks[:6])

# server-action ids in Next.js app router look like 40-char hex in the client manifest
for c in set(chunks):
    try:
        js = get('https://x402all.com' + c)
    except Exception as e:
        print('chunk fail', c, e)
        continue
    if 'origin_url' in js:
        ids = re.findall(r'["\']([0-9a-f]{40,64})["\']', js)
        print('chunk with form:', c, 'action-id candidates:', ids[:5])
        m = re.search(r'(createServerReference|registerServerReference)[^;]{0,200}', js)
        if m:
            print('ref snippet:', m.group(0)[:220])
print('--- page action refs ---')
for m in re.findall(r'\$ACTION_ID_[0-9a-f]+|"\\\$ACTION_ID[^"]*"', html)[:5]:
    print(m)
