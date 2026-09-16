#!/usr/bin/env python3
"""Register our x402 origin on x402scan (www.x402scan.com) via the official
POST /api/x402/registry/register-origin endpoint.

Auth = SIWX (Sign-In-With-X): we fetch the 402 challenge, build the SIWE
message exactly as @x402/extensions does, sign it with the farm wallet
(EIP-191 personal_sign) and replay the POST with the base64-JSON header.

Usage:
    python x402scan_register.py --probe            # challenge only, no signature
    python x402scan_register.py --register         # full flow (needs key)
"""
import argparse, base64, json, os, sys, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
KEYFILE = os.path.join(ROOT, "projects", "airdrop_farm", "keys", "eth_key.txt")
ORIGIN = "https://mi-desktop.rainbow-dab.ts.net:10000"
REGISTER_URL = "https://www.x402scan.com/api/x402/registry/register-origin"


def load_key():
    raw = open(KEYFILE).read().strip()
    key = None
    for line in raw.replace("\r", "\n").split("\n"):
        line = line.strip()
        if not line:
            continue
        if "=" in line:
            name, _, val = line.partition("=")
            if name.strip().upper() in ("PRIVATE_KEY", "PRIVKEY", "KEY"):
                key = val.strip()
                break
        elif line.startswith("0x") and len(line) == 66:
            key = line
            break
    if not key:
        for tok in raw.split():
            tok = tok.strip()
            if len(tok) == 64 and all(c in "0123456789abcdefABCDEF" for c in tok):
                key = tok
                break
    if not key:
        raise SystemExit("no private key found in %s" % KEYFILE)
    if not key.startswith("0x"):
        key = "0x" + key
    return key


def http_post(url, body=None, headers=None, timeout=60):
    data = json.dumps(body).encode() if body is not None else b""
    h = {"Content-Type": "application/json", "User-Agent": "money-agent-ru/x402scan-register"}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, data=data, headers=h, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def get_challenge():
    status, text = http_post(REGISTER_URL, {"origin": ORIGIN})
    if status != 402:
        raise SystemExit("expected 402 challenge, got %s: %s" % (status, text[:400]))
    payload = json.loads(text)
    ext = payload.get("extensions", {}).get("sign-in-with-x")
    if not ext:
        raise SystemExit("no sign-in-with-x extension in challenge: %s" % text[:600])
    return ext["info"]


def build_message(info, address):
    chain_id = int(info["chainId"].split(":")[1])  # eip155:8453 -> 8453
    lines = [
        "%s wants you to sign in with your Ethereum account:" % info["domain"],
        address,
        "",
    ]
    if info.get("statement"):
        lines += [info["statement"], ""]
    lines += [
        "URI: %s" % info["uri"],
        "Version: %s" % info["version"],
        "Chain ID: %d" % chain_id,
        "Nonce: %s" % info["nonce"],
        "Issued At: %s" % info["issuedAt"],
    ]
    if info.get("expirationTime"):
        lines.append("Expiration Time: %s" % info["expirationTime"])
    if info.get("notBefore"):
        lines.append("Not Before: %s" % info["notBefore"])
    if info.get("requestId") is not None:
        lines.append("Request ID: %s" % info["requestId"])
    if info.get("resources"):
        lines.append("Resources:")
        lines += ["- %s" % r for r in info["resources"]]
    return "\n".join(lines)


def main():
    global ORIGIN
    ap = argparse.ArgumentParser()
    ap.add_argument("--probe", action="store_true")
    ap.add_argument("--register", action="store_true")
    ap.add_argument("--origin", default=ORIGIN)
    args = ap.parse_args()

    ORIGIN = args.origin

    info = get_challenge()
    print("[challenge] domain=%s chain=%s nonce=%s exp=%s" % (
        info["domain"], info["chainId"], info["nonce"], info.get("expirationTime")))
    print("[challenge] statement=%r" % info.get("statement"))

    if args.probe and not args.register:
        return

    from eth_account import Account
    from eth_account.messages import encode_defunct

    key = load_key()
    acct = Account.from_key(key)
    address = acct.address
    print("[wallet] %s" % address)

    message = build_message(info, address)
    print("---- SIWE MESSAGE ----\n%s\n----------------------" % message)

    signed = acct.sign_message(encode_defunct(text=message))
    signature = signed.signature.hex()
    if not signature.startswith("0x"):
        signature = "0x" + signature
    print("[sig] %s" % signature[:24] + "...")

    payload = {
        "domain": info["domain"],
        "address": address,
        "statement": info.get("statement"),
        "uri": info["uri"],
        "version": info["version"],
        "chainId": info["chainId"],
        "type": info.get("type", "eip191"),
        "nonce": info["nonce"],
        "issuedAt": info["issuedAt"],
        "expirationTime": info.get("expirationTime"),
        "signature": signature,
    }
    payload = {k: v for k, v in payload.items() if v is not None}
    header = base64.b64encode(json.dumps(payload).encode()).decode()

    status, text = http_post(REGISTER_URL, {"origin": ORIGIN},
                             headers={"SIGN-IN-WITH-X": header})
    print("[register] HTTP %s" % status)
    print(text[:3000])
    with open(os.path.join(HERE, "x402scan_register_result.json"), "w") as f:
        f.write(text)


if __name__ == "__main__":
    main()
