// Endpoint: EVM tx preflight - the cheap runtime primitive.
//
// Why this exists: x402scan volume concentrates on CHEAP primitives that an agent
// needs IN THE RUNTIME LOOP (gas reads, RPC reads, tiny enrichments) - not on
// curated reports. Every on-chain agent must know "what will this tx cost me on
// chain X right now" BEFORE it signs. That is a pure function of public RPC data
// (zero marginal cost for us) and it is called on every decision, not once a day.
//
// Answers, in one call, for 6 chains: current gas price, block, native-token USD
// price and the estimated USD cost of the three tx shapes agents actually send
// (native transfer, ERC-20 approve, swap). Optionally resolves ERC-20 metadata
// (symbol/decimals/name) for token addresses supplied in ?tokens=, because you
// cannot build a correct calldata without decimals.
import { fetchJson } from "../util.js";

// chainId, public RPC (no key), native symbol, CoinGecko id of the native asset
const CHAINS = {
  base: { chainId: 8453, rpc: "https://mainnet.base.org", native: "ETH", pair: "ETHUSDT", l2: true },
  ethereum: { chainId: 1, rpc: "https://ethereum-rpc.publicnode.com", native: "ETH", pair: "ETHUSDT", l2: false },
  arbitrum: { chainId: 42161, rpc: "https://arb1.arbitrum.io/rpc", native: "ETH", pair: "ETHUSDT", l2: true },
  optimism: { chainId: 10, rpc: "https://mainnet.optimism.io", native: "ETH", pair: "ETHUSDT", l2: true },
  polygon: { chainId: 137, rpc: "https://polygon.drpc.org", native: "POL", pair: "POLUSDT", l2: false },
  bsc: { chainId: 56, rpc: "https://bsc-dataseed.binance.org", native: "BNB", pair: "BNBUSDT", l2: false },
};

// Typical gas units per tx shape (EVM consensus / common token implementations).
const GAS_UNITS = { native_transfer: 21000, erc20_approve: 46000, erc20_transfer: 65000, swap: 180000 };

const cache = new Map(); // key -> { ts, data }
const TTL = 30000;

async function postJson(url, body) {
  const key = url + JSON.stringify(body);
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.ts < TTL) return hit.data;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "money-agent-x402-seller/0.1" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`rpc http ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || "rpc error");
    cache.set(key, { ts: now, data });
    return data;
  } finally {
    clearTimeout(t);
  }
}

// Minimal ABI decoding for string / uint8 returns (symbol/name/decimals).
function decodeUint8(hex) {
  if (!hex || hex === "0x") return null;
  return parseInt(hex.slice(2, 66), 16);
}
function decodeString(hex) {
  if (!hex || hex.length < 3) return null;
  const body = hex.slice(2);
  try {
    // dynamic string: [offset(32)][length(32)][data]
    if (body.length >= 128) {
      const len = parseInt(body.slice(64, 128), 16);
      if (len > 0 && len < 256) {
        const word = body.slice(128, 128 + Math.ceil(len / 32) * 64);
        const buf = Buffer.from(word, "hex").subarray(0, len);
        const s = buf.toString("utf8").replace(/\0/g, "").trim();
        if (s) return s;
      }
    }
    // bytes32 fallback
    const raw = Buffer.from(body.slice(0, 64), "hex").toString("utf8").replace(/\0/g, "").trim();
    return raw || null;
  } catch {
    return null;
  }
}

async function chainStatus(name, prices) {
  const c = CHAINS[name];
  const [gas, block] = await Promise.all([
    postJson(c.rpc, { jsonrpc: "2.0", id: 1, method: "eth_gasPrice", params: [] }),
    postJson(c.rpc, { jsonrpc: "2.0", id: 2, method: "eth_blockNumber", params: [] }),
  ]);
  const wei = BigInt(gas.result);
  const gwei = Number(wei) / 1e9;

  // prices are fetched ONCE per request by the caller: hammering the price API in
  // parallel gets us 429s and null prices (observed live with CoinGecko).
  const nativeUsd = prices?.[c.pair] ?? null;

  const cost = {};
  for (const [shape, units] of Object.entries(GAS_UNITS)) {
    const nativeFee = (Number(wei) * units) / 1e18;
    cost[shape] = {
      gas_units: units,
      native_fee: Number(nativeFee.toPrecision(6)),
      usd: nativeUsd ? Number((nativeFee * nativeUsd).toPrecision(4)) : null,
    };
  }

  return {
    chain: name,
    chain_id: c.chainId,
    rpc: c.rpc,
    block: parseInt(block.result, 16),
    gas_price_wei: wei.toString(),
    gas_price_gwei: Number(gwei.toPrecision(6)),
    native_symbol: c.native,
    native_usd: nativeUsd,
    est_tx_cost: cost,
  };
}

async function tokenMeta(address, chain = "base") {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return { address, error: "invalid address" };
  const rpc = (CHAINS[chain] || CHAINS.base).rpc;
  const call = (data) => postJson(rpc, { jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: address, data }, "latest"] });
  const out = { address, chain, chain_id: (CHAINS[chain] || CHAINS.base).chainId };
  try {
    const [sym, dec, nm] = await Promise.all([
      call("0x95d89b41").catch(() => null), // symbol()
      call("0x313ce567").catch(() => null), // decimals()
      call("0x06fdde03").catch(() => null), // name()
    ]);
    out.symbol = sym ? decodeString(sym.result) : null;
    out.decimals = dec ? decodeUint8(dec.result) : null;
    out.name = nm ? decodeString(nm.result) : null;
    out.is_contract = out.symbol !== null || out.decimals !== null;
  } catch (e) {
    out.error = e.message;
  }
  return out;
}

export async function evmPreflight({ chain = "base", tokens = "" } = {}) {
  const want = String(chain).toLowerCase().trim();
  const names = want === "all" || !CHAINS[want] ? Object.keys(CHAINS) : [want];

  // One Bybit spot call for all native assets we are about to report.
  // Bybit is our primary price source: it is reachable from RF (CoinGecko free
  // tier rate-limits us to 429 within minutes of normal agent traffic).
  let prices = {};
  try {
    const pairs = [...new Set(names.map((n) => CHAINS[n].pair))];
    const rows = await Promise.all(
      pairs.map((p) => fetchJson(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${p}`))
    );
    for (const r of rows) for (const row of r?.result?.list || []) prices[row.symbol] = Number(row.lastPrice);
  } catch {
    prices = {};
  }

  const settled = await Promise.allSettled(names.map((n) => chainStatus(n, prices)));
  const chains = [];
  const errors = [];
  settled.forEach((s, i) => {
    if (s.status === "fulfilled") chains.push(s.value);
    else errors.push({ chain: names[i], error: s.reason?.message || String(s.reason) });
  });

  const addrs = String(tokens)
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean)
    .slice(0, 10);
  const tokenList = addrs.length ? await Promise.all(addrs.map((a) => tokenMeta(a, CHAINS[want] ? want : "base"))) : [];

  return {
    generated_at: new Date().toISOString(),
    source: "public EVM RPCs (eth_gasPrice/eth_blockNumber/eth_call) + CoinGecko",
    query: { chain: want, tokens: addrs.length },
    chains,
    tokens: tokenList,
    errors: errors.length ? errors : undefined,
    notes:
      "est_tx_cost.usd uses the current native-token price; L2 total cost also includes an L1 data fee that depends on calldata size, so treat L2 numbers as a lower bound. decimals() is required to build correct ERC-20 calldata.",
  };
}

export const meta = {
  description:
    "Runtime preflight for EVM transaction execution: live gas price, block height, native-token USD price and estimated USD cost of a transfer/approve/swap on Base, Ethereum, Arbitrum, Optimism, Polygon and BSC - plus ERC-20 symbol/decimals/name resolution for addresses passed in ?tokens=. Cheap, cache-friendly, called inside the agent loop.",
};
