export type GmgnHoldingLite = {
  tokenSymbol?: string;
  tokenAddress?: string;
  usdValue?: number;
  realizedProfitUsd?: number;
  unrealizedProfitUsd?: number;
  totalProfitUsd?: number;
  walletTags?: string[];
};

export type GmgnWalletHoldingsLite = {
  holdings: GmgnHoldingLite[];
  source: "api";
};

export type GmgnTokenTradeLite = {
  maker?: string;
  amountUsd?: number;
  timestamp?: number;
  event?: string;
  txHash?: string;
};

export type GmgnTokenTradesLite = {
  trades: GmgnTokenTradeLite[];
  source: "api";
};

type GmgnEnvelope<T> = {
  code?: number;
  reason?: string;
  message?: string;
  msg?: string;
  data?: T;
};

function envStr(key: string): string {
  return String(process.env[key] || "").trim();
}

function toNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function getCommonParams(): Record<string, string> {
  return {
    device_id: envStr("GMGN_DEVICE_ID") || "81479bb3-d0c8-4555-b508-1edf90932e77",
    fp_did: envStr("GMGN_FP_DID") || "ff72472fafb25ec15b611cca304e3f95",
    client_id: envStr("GMGN_CLIENT_ID") || "gmgn_web_20251105-6680-c2c5d12",
    from_app: "gmgn",
    app_ver: envStr("GMGN_APP_VER") || "20251105-6680-c2c5d12",
    tz_name: envStr("GMGN_TZ_NAME") || "Asia/Shanghai",
    tz_offset: envStr("GMGN_TZ_OFFSET") || "28800",
    app_lang: envStr("GMGN_APP_LANG") || "zh-CN",
    os: envStr("GMGN_OS") || "web",
    worker: envStr("GMGN_WORKER") || "0",
  };
}

function hasGmgnCreds(): boolean {
  // GMGN public endpoints can often work with default client identifiers.
  // Cookie improves stability but is not strictly required for basic reads.
  return envStr("GMGN_DISABLE") !== "1";
}

export function isGmgnConfigured(): boolean {
  return hasGmgnCreds();
}

export async function fetchGmgnWalletHoldingsBsc(args: { wallet: string; limit?: number }): Promise<GmgnWalletHoldingsLite | null> {
  if (!hasGmgnCreds()) return null;

  const base = envStr("GMGN_BASE") || "https://gmgn.ai";
  const chain = "bsc";
  const limit = Math.max(1, Math.min(200, args.limit ?? 60));
  const url = new URL(`${base.replace(/\/$/, "")}/api/v1/wallet_holdings/${encodeURIComponent(chain)}/${encodeURIComponent(args.wallet)}`);

  const common = getCommonParams();
  for (const [k, v] of Object.entries(common)) {
    if (v) url.searchParams.set(k, v);
  }
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("orderby", "last_active_timestamp");
  url.searchParams.set("direction", "desc");
  url.searchParams.set("showsmall", "true");
  url.searchParams.set("sellout", "true");
  url.searchParams.set("hide_abnormal", "false");

  const headers: Record<string, string> = { accept: "application/json, text/plain, */*" };
  const cookie = envStr("GMGN_COOKIE");
  if (cookie) headers.cookie = cookie;

  const res = await fetch(url.toString(), { method: "GET", headers, cache: "no-store" }).catch(() => null);
  if (!res?.ok) return null;
  const json = (await res.json().catch(() => null)) as GmgnEnvelope<{ holdings?: unknown[] }> | null;
  if (!json || typeof json !== "object") return null;

  const raw = Array.isArray(json.data?.holdings) ? json.data?.holdings : [];
  const holdings: GmgnHoldingLite[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const rec = x as Record<string, unknown>;
    const token = (rec.token as Record<string, unknown> | undefined) || {};
    const walletTags = Array.isArray(rec.wallet_token_tags)
      ? (rec.wallet_token_tags as unknown[]).map((t) => String(t)).filter(Boolean).slice(0, 8)
      : undefined;
    holdings.push({
      tokenSymbol: typeof token.symbol === "string" ? token.symbol : undefined,
      tokenAddress: typeof token.address === "string" ? token.address : typeof token.token_address === "string" ? token.token_address : undefined,
      usdValue: toNum(rec.usd_value),
      realizedProfitUsd: toNum(rec.realized_profit),
      unrealizedProfitUsd: toNum(rec.unrealized_profit),
      totalProfitUsd: toNum(rec.total_profit),
      walletTags,
    });
    if (holdings.length >= limit) break;
  }

  return { holdings, source: "api" };
}

export async function fetchGmgnTokenTradesBsc(args: { token: string; limit?: number }): Promise<GmgnTokenTradesLite | null> {
  if (!hasGmgnCreds()) return null;

  const base = envStr("GMGN_BASE") || "https://gmgn.ai";
  const chain = "bsc";
  const limit = Math.max(1, Math.min(200, args.limit ?? 100));
  const url = new URL(`${base.replace(/\/$/, "")}/vas/api/v1/token_trades/${encodeURIComponent(chain)}/${encodeURIComponent(args.token)}`);
  const common = getCommonParams();
  for (const [k, v] of Object.entries(common)) {
    if (v) url.searchParams.set(k, v);
  }
  url.searchParams.set("limit", String(limit));

  const headers: Record<string, string> = { accept: "application/json, text/plain, */*" };
  const cookie = envStr("GMGN_COOKIE");
  if (cookie) headers.cookie = cookie;

  const res = await fetch(url.toString(), { method: "GET", headers, cache: "no-store" }).catch(() => null);
  if (!res?.ok) return null;
  const json = (await res.json().catch(() => null)) as GmgnEnvelope<{ history?: unknown[] }> | null;
  if (!json || typeof json !== "object") return null;
  const raw = Array.isArray(json.data?.history) ? json.data?.history : [];

  const trades: GmgnTokenTradeLite[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const rec = x as Record<string, unknown>;
    trades.push({
      maker: typeof rec.maker === "string" ? rec.maker : undefined,
      amountUsd: toNum(rec.amount_usd),
      timestamp: toNum(rec.timestamp),
      event: typeof rec.event === "string" ? rec.event : undefined,
      txHash: typeof rec.tx_hash === "string" ? rec.tx_hash : undefined,
    });
    if (trades.length >= limit) break;
  }

  return { trades, source: "api" };
}
