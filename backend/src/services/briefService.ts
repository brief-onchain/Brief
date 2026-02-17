import { z } from "zod";
import { createPublicClient, formatEther, formatUnits, http, isAddress, parseAbi, type PublicClient } from "viem";
import { bsc } from "viem/chains";
import { fetchArkhamAddressEnrichedLite, type ArkhamAddressEnrichedLite } from "./providers/arkham.js";
import { fetchGmgnTokenTradesBsc, fetchGmgnWalletHoldingsBsc, isGmgnConfigured, type GmgnTokenTradesLite, type GmgnWalletHoldingsLite } from "./providers/gmgn.js";
import { fetchBscScanAddressSummary, isBscScanConfigured, type BscScanAddressSummary } from "./providers/bscscan.js";
import { joinHumanList, normalizeLocale, pickLocaleText, sentenceJoin, type Locale, type LocaleTextMap } from "./i18n.js";

export const BriefBodySchema = z.object({
  query: z.string().trim().min(1).max(4000),
  lang: z
    .string()
    .optional()
    .transform((v) => normalizeLocale(v)),
});

export type Finding = { type: "critical" | "warning" | "info" | "success"; text: string };
export type Evidence = { label: string; url: string; value?: string };

export type BriefResult = {
  address: string;
  riskScore: number;
  tldr: string;
  findings: Finding[];
  evidence: Evidence[];
  explanation: string;
  type: "contract" | "wallet";
  entity?: {
    title?: string;
    subtitle?: string;
    tags?: string[];
  };
  enrich?: {
    frontrun?: {
      primaryLabel?: string;
      verified?: boolean;
      tags?: string[];
      primaryDomain?: string | null;
      tokenStats?: Array<{ tokenSymbol?: string; pnlUsd?: number; chain?: string; tokenMint?: string }>;
      altWallets?: string[];
    };
    memeradar?: {
      tags?: string[];
    };
    arkham?: {
      entityName?: string;
      entityType?: string;
      labelName?: string;
      tags?: string[];
    };
    gmgn?: {
      holdingCount?: number;
      profitableCount?: number;
      topTags?: string[];
    };
    bscscan?: {
      txCount24h?: number;
      tokenTransferCount24h?: number;
      firstSeenAt?: number;
      lastSeenAt?: number;
    };
    meme?: {
      topHolderCount?: number;
      smartMoneyHolderCount?: number;
      bundleGroupCount?: number;
      smartMoneySamples?: string[];
      bundleSourceSamples?: string[];
    };
  };
  runtime?: {
    mode: "enhanced" | "fallback";
    sources: Array<{
      id: "bsc_rpc" | "dexscreener" | "moralis" | "frontrun" | "memeradar" | "arkham" | "gmgn" | "bscscan" | "openrouter";
      status: "live" | "fallback" | "disabled";
      note?: string;
    }>;
  };
};

type TokenMeta = { name?: string; symbol?: string; decimals?: number; totalSupply?: string };
type DexMeta = { liquidityUsd?: number; fdvUsd?: number; pairUrl?: string; dexId?: string; source: "api" | "none" };
type ModuleResolve = {
  address: `0x${string}`;
  client: PublicClient;
  type: "contract" | "wallet";
  isContract: boolean;
  balanceBnb: number;
  txCount: number | null;
};

type ModuleIntel = {
  frMeta: (FrontrunMeta & { source: "api" }) | null;
  frAlt: string[] | null;
  frSource: "api" | "none";
  mrTags: { tags?: string[] } | null;
  mrSource: "api" | "none";
  arkham: ArkhamAddressEnrichedLite | null;
  arkhamSource: "api" | "none";
  gmgn: {
    holdings: GmgnWalletHoldingsLite | null;
    trades: GmgnTokenTradesLite | null;
  } | null;
  gmgnSource: "api" | "none";
  bscscan: BscScanAddressSummary | null;
  bscscanSource: "api" | "none";
};

type FrontrunMeta = {
  primaryLabel?: string;
  verified?: boolean;
  tags?: string[];
  primaryDomain?: string | null;
  tokenStats?: Array<{ tokenSymbol?: string; pnlUsd?: number; chain?: string; tokenMint?: string }>;
};

type ModuleMeme = {
  topHolderCount: number;
  smartMoneyHolderCount: number;
  bundleGroupCount: number;
  smartMoneySamples: string[];
  bundleSourceSamples: string[];
} | null;

type MoralisOwner = {
  ownerAddress: string;
  balance?: string;
};

type MoralisTransfer = {
  fromAddress: string;
  toAddress: string;
  txHash?: string;
  timestampSec?: number;
};

function extractFirstEvmAddress(input: string): string | null {
  const m = String(input || "").match(/0x[a-fA-F0-9]{40}/);
  return m ? m[0] : null;
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function envStr(key: string): string {
  return String(process.env[key] || "").trim();
}

function 文(locale: Locale, map: LocaleTextMap<string>): string {
  return pickLocaleText(locale, map);
}

function normalizeBearer(v: string): string {
  const t = String(v || "").trim();
  if (!t) return "";
  return t.toLowerCase().startsWith("bearer ") ? t : `Bearer ${t}`;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return Promise.race([
    p.finally(() => clearTimeout(t)),
    new Promise<T>((_, rej) => {
      ctrl.signal.addEventListener("abort", () => rej(new Error("timeout")));
    }),
  ]);
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    for (;;) {
      const i = idx++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

async function fetchDexScreener(args: { token: string }) {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(args.token)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`dexscreener_${res.status}`);
  const json = (await res.json().catch(() => null)) as { pairs?: Array<Record<string, unknown>> } | null;
  const pairs = Array.isArray(json?.pairs) ? json.pairs : [];
  const bscPairs = pairs.filter((p) => String(p.chainId || "").toLowerCase() === "bsc");
  const best =
    bscPairs
      .slice()
      .sort((a, b) => Number((b.liquidity as { usd?: number } | undefined)?.usd || 0) - Number((a.liquidity as { usd?: number } | undefined)?.usd || 0))[0] ||
    null;
  return { bestPair: best };
}

async function fetchMoralisTokenOwners(args: {
  chain: "bsc";
  tokenAddress: string;
  limit?: number;
  cursor?: string;
  order?: "ASC" | "DESC";
}): Promise<{ owners: MoralisOwner[]; cursor?: string } | null> {
  const key = envStr("MORALIS_API_KEY");
  if (!key) return null;
  const url = new URL(`https://deep-index.moralis.io/api/v2.2/erc20/${encodeURIComponent(args.tokenAddress)}/owners`);
  url.searchParams.set("chain", args.chain);
  url.searchParams.set("limit", String(Math.max(1, Math.min(100, args.limit ?? 100))));
  url.searchParams.set("order", args.order ?? "DESC");
  if (args.cursor) url.searchParams.set("cursor", args.cursor);

  const res = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
      "X-API-Key": key,
    },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !json) return null;
  const arr = Array.isArray(json.result) ? json.result : [];
  const owners = arr
    .map((x) => {
      const it = x as Record<string, unknown>;
      return {
        ownerAddress: String(it.owner_address || it.ownerAddress || "").toLowerCase(),
        balance: typeof it.balance === "string" ? it.balance : undefined,
      };
    })
    .filter((x) => isAddress(x.ownerAddress, { strict: false }));
  const cursor = typeof json.cursor === "string" && json.cursor.trim() ? json.cursor : undefined;
  return { owners, cursor };
}

async function fetchMoralisTokenTransfers(args: {
  chain: "bsc";
  tokenAddress: string;
  limit?: number;
  cursor?: string;
  order?: "ASC" | "DESC";
}): Promise<{ transfers: MoralisTransfer[]; cursor?: string } | null> {
  const key = envStr("MORALIS_API_KEY");
  if (!key) return null;
  const url = new URL(`https://deep-index.moralis.io/api/v2.2/erc20/${encodeURIComponent(args.tokenAddress)}/transfers`);
  url.searchParams.set("chain", args.chain);
  url.searchParams.set("limit", String(Math.max(1, Math.min(100, args.limit ?? 100))));
  if (args.order) url.searchParams.set("order", args.order);
  if (args.cursor) url.searchParams.set("cursor", args.cursor);

  const res = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
      "X-API-Key": key,
    },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !json) return null;
  const arr = Array.isArray(json.result) ? json.result : [];
  const transfers = arr
    .map((x) => {
      const it = x as Record<string, unknown>;
      const tsIso = typeof it.block_timestamp === "string" ? it.block_timestamp : typeof it.blockTimestamp === "string" ? it.blockTimestamp : "";
      const tsMs = tsIso ? Date.parse(tsIso) : Number.NaN;
      return {
        fromAddress: String(it.from_address || it.fromAddress || "").toLowerCase(),
        toAddress: String(it.to_address || it.toAddress || "").toLowerCase(),
        txHash: typeof it.transaction_hash === "string" ? it.transaction_hash : typeof it.transactionHash === "string" ? it.transactionHash : undefined,
        timestampSec: Number.isFinite(tsMs) ? Math.floor(tsMs / 1000) : undefined,
      };
    })
    .filter((x) => isAddress(x.toAddress, { strict: false }) && isAddress(x.fromAddress, { strict: false }));
  const cursor = typeof json.cursor === "string" && json.cursor.trim() ? json.cursor : undefined;
  return { transfers, cursor };
}

async function fetchMoralisTokenMetadata(args: { chain: "bsc"; tokenAddress: string }): Promise<Record<string, unknown> | null> {
  const key = envStr("MORALIS_API_KEY");
  if (!key) return null;
  const url = new URL("https://deep-index.moralis.io/api/v2.2/erc20/metadata");
  url.searchParams.set("chain", args.chain);
  url.searchParams.set("addresses", args.tokenAddress);
  const res = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
      "X-API-Key": key,
    },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as unknown;
  if (!res.ok || !json) return null;
  const arr = Array.isArray(json)
    ? (json as unknown[])
    : Array.isArray((json as Record<string, unknown>).result)
      ? (((json as Record<string, unknown>).result as unknown[]) || [])
      : [];
  const first = arr[0];
  return first && typeof first === "object" ? (first as Record<string, unknown>) : null;
}

function buildFrontrunHeaders(args: { token: string; cookie: string }): Record<string, string> {
  const headers: Record<string, string> = {
    accept: "application/json, text/plain, */*",
    "content-type": "application/json",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "x-copilot-client-version": envStr("FR_CLIENT_VERSION") || "0.0.182",
    origin: envStr("FR_ORIGIN") || "chrome-extension://cahedbegdkagmcjfolhdlechbkeaieki",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "none",
  };
  if (args.cookie) headers.cookie = args.cookie;
  if (args.token) headers.authorization = args.token;
  return headers;
}

function normalizeFrontrunMetadata(raw: Record<string, unknown> | null): (FrontrunMeta & { source: "api" }) | null {
  if (!raw || typeof raw !== "object") return null;
  const data1 = raw.data as Record<string, unknown> | undefined;
  const inner = (data1?.data as Record<string, unknown> | undefined) ?? data1 ?? raw;
  if (!inner || typeof inner !== "object") return null;

  const tagsRaw = inner.tags;
  const tokenStatsRaw = inner.tokenStats;
  const tags = Array.isArray(tagsRaw) ? tagsRaw.map((x) => String(x)) : [];
  const tokenStats = Array.isArray(tokenStatsRaw) ? tokenStatsRaw : [];

  return {
    primaryLabel: typeof inner.primaryLabel === "string" ? inner.primaryLabel : undefined,
    verified: typeof inner.verified === "boolean" ? inner.verified : undefined,
    tags: tags.slice(0, 24),
    primaryDomain: (inner.primaryDomain as string | null | undefined) ?? null,
    tokenStats: tokenStats
      .map((t) => {
        const item = t as Record<string, unknown>;
        return {
          chain: typeof item.chain === "string" ? item.chain : undefined,
          tokenSymbol: typeof item.tokenSymbol === "string" ? item.tokenSymbol : undefined,
          tokenMint: typeof item.tokenMint === "string" ? item.tokenMint : undefined,
          pnlUsd: typeof item.pnlUsd === "number" && Number.isFinite(item.pnlUsd) ? item.pnlUsd : undefined,
        };
      })
      .slice(0, 20),
    source: "api",
  };
}

async function fetchFrontrunWalletMetadata(args: { chain: "BSC"; address: string }): Promise<(FrontrunMeta & { source: "api" }) | null> {
  const base = envStr("FR_BASE") || "https://loadbalance.frontrun.pro";
  const token = normalizeBearer(envStr("FR_TOKEN"));
  const cookie = envStr("FR_COOKIE");
  if (!token && !cookie) return null;
  const headers = buildFrontrunHeaders({ token, cookie });

  // Follow FR tooling strategy: batch-query first, then single-query fallback.
  const batchUrl = `${base.replace(/\/$/, "")}/api/v2/wallet/metadata/batch-query`;
  const batchBody = {
    wallets: [{ chain: args.chain, address: args.address }],
    showMentionedTweets: true,
    showLabels: true,
  };
  const batchRes = await fetch(batchUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(batchBody),
    cache: "no-store",
  }).catch(() => null);
  const batchJson = (await batchRes?.json().catch(() => null)) as Record<string, unknown> | null;
  if (batchRes?.ok && batchJson) {
    const data = batchJson.data as unknown;
    const arr = Array.isArray(data)
      ? data
      : Array.isArray((data as Record<string, unknown> | undefined)?.data)
        ? (((data as Record<string, unknown>).data as unknown[]) || [])
        : [];
    const hit =
      arr.find((x) => String((x as Record<string, unknown>).address || "").toLowerCase() === args.address.toLowerCase()) ?? arr[0];
    const normalized = normalizeFrontrunMetadata(hit ? ({ data: hit } as Record<string, unknown>) : null);
    if (normalized) return normalized;
  }

  const singleUrl = `${base.replace(/\/$/, "")}/api/v2/wallet/metadata/${encodeURIComponent(args.chain)}/${encodeURIComponent(args.address)}`;
  const singleRes = await fetch(singleUrl, { method: "GET", headers, cache: "no-store" }).catch(() => null);
  const singleJson = (await singleRes?.json().catch(() => null)) as Record<string, unknown> | null;
  if (!singleRes?.ok || !singleJson) return null;
  return normalizeFrontrunMetadata(singleJson);
}

async function fetchFrontrunAltWallets(args: { chain: "BSC"; address: string }): Promise<{ items: string[]; source: "api" } | null> {
  const base = envStr("FR_BASE") || "https://loadbalance.frontrun.pro";
  const token = normalizeBearer(envStr("FR_TOKEN"));
  const cookie = envStr("FR_COOKIE");
  if (!token && !cookie) return null;
  if (envStr("FR_FETCH_ALT_WALLETS") !== "1") return null;

  const url = `${base.replace(/\/$/, "")}/api/v1/wallet/alt-wallets/${encodeURIComponent(args.chain)}/${encodeURIComponent(args.address)}`;
  const headers = buildFrontrunHeaders({ token, cookie });

  const res = await fetch(url, { method: "GET", headers, cache: "no-store" });
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !json) return null;
  const data1 = json.data as Record<string, unknown> | undefined;
  const data = (data1?.data as Record<string, unknown> | undefined) ?? data1 ?? json;
  const raw = (data as Record<string, unknown>).altWallets ?? data;
  const arr = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as Record<string, unknown> | undefined)?.altWallets)
      ? ((raw as Record<string, unknown>).altWallets as unknown[])
      : [];

  const out = arr
    .map((x) => {
      if (typeof x === "string") return x;
      const rec = x as Record<string, unknown>;
      return typeof rec.address === "string" ? rec.address : "";
    })
    .map((s) => s.trim())
    .filter(Boolean);
  return { items: out.slice(0, 30), source: "api" };
}

async function fetchMemeRadarWalletTags(args: { chain: "BSC"; walletAddress: string; contractAddress?: string }) {
  const base = envStr("MR_BASE") || "https://chaininsight.vip";
  const token = envStr("MR_TOKEN");
  if (!token) return null;

  const url = `${base.replace(/\/$/, "")}/api/v0/util/query/wallet_tags_v2`;
  const body = {
    walletAddresses: [args.walletAddress],
    chain: envStr("MR_CHAIN") || args.chain,
    contractAddress: args.contractAddress || "",
    bizType: "AI_Tag",
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: token, "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !json) return null;

  const data = json.data;
  const arr = Array.isArray(data)
    ? data
    : Array.isArray((data as Record<string, unknown> | undefined)?.data)
      ? (((data as Record<string, unknown>).data as unknown[]) || [])
      : [];
  const first =
    arr.find((x) => {
      const rec = x as Record<string, unknown>;
      return String(rec.address || "").toLowerCase() === args.walletAddress.toLowerCase();
    }) ?? arr[0];

  const tags = Array.isArray((first as Record<string, unknown> | undefined)?.tags)
    ? (((first as Record<string, unknown>).tags as unknown[]) || []).map((t) => String(t))
    : [];
  return { tags: tags.slice(0, 24) };
}

async function runResolveModule(args: { query: string; lang: Locale }): Promise<ModuleResolve> {
  const raw = args.query.trim();
  const extracted = extractFirstEvmAddress(raw);
  const addr = extracted || raw;
  if (!isAddress(addr, { strict: false })) {
    throw new Error(
      文(args.lang, {
        en: "No valid 0x address/contract detected",
        "zh-CN": "未识别到有效的 0x 地址/合约地址",
        "zh-TW": "未識別到有效的 0x 地址/合約地址",
        ko: "유효한 0x 주소/컨트랙트를 인식하지 못했습니다",
      })
    );
  }

  const rpcUrl = String(process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/").trim();
  const client = createPublicClient({ chain: bsc, transport: http(rpcUrl) });
  const address = addr.toLowerCase() as `0x${string}`;

  const [bytecode, balance, txCount] = await Promise.all([
    client.getBytecode({ address }).catch(() => null),
    client.getBalance({ address }).catch(() => 0n),
    client.getTransactionCount({ address }).catch(() => null),
  ]);

  let isContract = Boolean(bytecode && bytecode !== "0x");
  if (!isContract && bytecode === null) {
    const mm = await withTimeout(fetchMoralisTokenMetadata({ chain: "bsc", tokenAddress: address }), 2000).catch(() => null);
    const mmLooksToken = Boolean(mm && (typeof mm.symbol === "string" || typeof mm.name === "string"));
    if (mmLooksToken) isContract = true;
  }
  if (!isContract && bytecode === null) {
    const ds = await withTimeout(fetchDexScreener({ token: address }), 1800).catch(() => null);
    if (ds?.bestPair) isContract = true;
  }
  const type: "contract" | "wallet" = isContract ? "contract" : "wallet";
  const balanceBnb = Number(formatEther(balance));

  return { address, client, type, isContract, balanceBnb, txCount };
}

async function runContractModule(args: {
  resolved: ModuleResolve;
  lang: Locale;
  findings: Finding[];
  evidence: Evidence[];
}): Promise<TokenMeta> {
  const { resolved, lang, findings, evidence } = args;
  if (!resolved.isContract) {
    if (resolved.balanceBnb <= 0.001) {
      findings.push({
        type: "info",
        text: 文(lang, {
          en: "Low BNB balance",
          "zh-CN": "该地址 BNB 余额较低",
          "zh-TW": "該地址 BNB 餘額較低",
          ko: "해당 주소의 BNB 잔액이 낮습니다",
        }),
      });
    }
    if (typeof resolved.txCount === "number") {
      if (resolved.txCount === 0) {
        findings.push({
          type: "info",
          text: 文(lang, {
            en: "No transactions (likely new address)",
            "zh-CN": "该地址交易次数为 0（可能是新地址）",
            "zh-TW": "該地址交易次數為 0（可能是新地址）",
            ko: "거래 횟수가 0입니다 (신규 주소일 수 있음)",
          }),
        });
      }
      if (resolved.txCount > 5000) {
        findings.push({
          type: "info",
          text: 文(lang, {
            en: "High transaction count (active address)",
            "zh-CN": "该地址历史交易较多（可能是活跃地址）",
            "zh-TW": "該地址歷史交易較多（可能是活躍地址）",
            ko: "거래 횟수가 많습니다 (활성 주소일 수 있음)",
          }),
        });
      }
    }
    return {};
  }

  const tokenMeta: TokenMeta = {};
  const erc20MetaAbi = parseAbi([
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
  ]);

  const [nameR, symbolR, decimalsR, supplyR] = await Promise.allSettled([
    resolved.client.readContract({ address: resolved.address, abi: erc20MetaAbi, functionName: "name" }),
    resolved.client.readContract({ address: resolved.address, abi: erc20MetaAbi, functionName: "symbol" }),
    resolved.client.readContract({ address: resolved.address, abi: erc20MetaAbi, functionName: "decimals" }),
    resolved.client.readContract({ address: resolved.address, abi: erc20MetaAbi, functionName: "totalSupply" }),
  ]);

  if (nameR.status === "fulfilled") tokenMeta.name = String(nameR.value || "").trim().slice(0, 64);
  if (symbolR.status === "fulfilled") tokenMeta.symbol = String(symbolR.value || "").trim().slice(0, 32);
  if (decimalsR.status === "fulfilled") tokenMeta.decimals = Number(decimalsR.value);
  if (supplyR.status === "fulfilled" && typeof tokenMeta.decimals === "number") {
    try {
      tokenMeta.totalSupply = formatUnits(supplyR.value as bigint, tokenMeta.decimals);
    } catch {
      // noop
    }
  }

  if (tokenMeta.symbol || tokenMeta.name) {
    findings.push({
      type: "info",
      text: (() => {
        const symbol = tokenMeta.symbol || "TOKEN";
        if (lang === "en") return `Detected token contract: ${symbol}${tokenMeta.name ? ` (${tokenMeta.name})` : ""}`;
        if (lang === "ko") return `토큰 컨트랙트로 인식됨: ${symbol}${tokenMeta.name ? ` (${tokenMeta.name})` : ""}`;
        return `已识别为代币合约：${symbol}${tokenMeta.name ? `（${tokenMeta.name}）` : ""}`;
      })(),
    });
  } else {
    findings.push({
      type: "info",
      text: 文(lang, {
        en: "Detected contract address (may not be ERC20)",
        "zh-CN": "已识别为合约地址（不一定是 ERC20 代币）",
        "zh-TW": "已識別為合約地址（不一定是 ERC20 代幣）",
        ko: "컨트랙트 주소로 인식됨 (ERC20이 아닐 수 있음)",
      }),
    });
  }

  const ownableAbi = parseAbi(["function owner() view returns (address)"]);
  const owner = await resolved.client.readContract({ address: resolved.address, abi: ownableAbi, functionName: "owner" }).catch(() => null);
  if (typeof owner === "string" && isAddress(owner)) {
    const zero = "0x0000000000000000000000000000000000000000";
    if (owner.toLowerCase() === zero) {
      findings.push({
        type: "success",
        text: 文(lang, {
          en: "owner() is zero (possibly renounced)",
          "zh-CN": "owner() 返回 0 地址（可能已放弃所有权）",
          "zh-TW": "owner() 返回 0 地址（可能已放棄所有權）",
          ko: "owner()가 0 주소입니다 (소유권 포기 가능성)",
        }),
      });
    } else {
      findings.push({
        type: "warning",
        text: 文(lang, {
          en: "owner() exists (owner controls may remain)",
          "zh-CN": "owner() 存在且非 0（可能仍可管理合约）",
          "zh-TW": "owner() 存在且非 0（可能仍可管理合約）",
          ko: "owner()가 존재합니다 (소유자 권한이 남아 있을 수 있음)",
        }),
      });
      evidence.push({ label: "Owner", url: `https://bscscan.com/address/${owner}`, value: `${owner.slice(0, 6)}…${owner.slice(-4)}` });
    }
  }

  return tokenMeta;
}

async function runMarketModule(args: { resolved: ModuleResolve; lang: Locale; findings: Finding[]; evidence: Evidence[] }): Promise<DexMeta> {
  const { resolved, lang, findings, evidence } = args;
  const dex: DexMeta = { source: "none" };
  try {
    const ds = await withTimeout(fetchDexScreener({ token: resolved.address }), 3500);
    dex.source = "api";
    const p = ds.bestPair as Record<string, unknown> | null;
    if (p) {
      dex.liquidityUsd = Number((p.liquidity as { usd?: number } | undefined)?.usd || 0) || 0;
      dex.fdvUsd = Number(p.fdv || 0) || 0;
      dex.pairUrl = typeof p.url === "string" ? p.url : undefined;
      dex.dexId = typeof p.dexId === "string" ? p.dexId : undefined;
      if (dex.pairUrl) evidence.push({ label: "DEX", url: dex.pairUrl });
      const pairAddress = typeof p.pairAddress === "string" ? p.pairAddress : "";
      if (pairAddress && isAddress(pairAddress)) {
        evidence.push({ label: "Pair", url: `https://bscscan.com/address/${pairAddress}`, value: `${pairAddress.slice(0, 6)}…${pairAddress.slice(-4)}` });
      }
    }
  } catch {
    // noop
  }

  if (resolved.isContract) {
    if (dex.liquidityUsd != null && dex.liquidityUsd > 0) {
      if (dex.liquidityUsd < 5_000) {
        findings.push({
          type: "warning",
          text: 文(lang, {
            en: "Low liquidity (easy to manipulate)",
            "zh-CN": "流动性偏低（更容易被拉盘/砸盘）",
            "zh-TW": "流動性偏低（更容易被拉盤/砸盤）",
            ko: "유동성이 낮습니다 (시세 조작에 취약)",
          }),
        });
      } else if (dex.liquidityUsd < 30_000) {
        findings.push({
          type: "info",
          text: 文(lang, {
            en: "Moderate liquidity (expect volatility)",
            "zh-CN": "流动性一般（波动可能较大）",
            "zh-TW": "流動性一般（波動可能較大）",
            ko: "유동성이 보통 수준입니다 (변동성 주의)",
          }),
        });
      } else {
        findings.push({
          type: "success",
          text: 文(lang, {
            en: "Healthy liquidity (relatively safer)",
            "zh-CN": "流动性相对充足（相对更稳）",
            "zh-TW": "流動性相對充足（相對更穩）",
            ko: "유동성이 비교적 충분합니다 (상대적으로 안정적)",
          }),
        });
      }
    } else {
      findings.push({
        type: "info",
        text: 文(lang, {
          en: "No DEX liquidity data found",
          "zh-CN": "未获取到 DEX 流动性信息（可能未上线或数据源不可用）",
          "zh-TW": "未獲取到 DEX 流動性資訊（可能未上線或資料源不可用）",
          ko: "DEX 유동성 데이터를 찾지 못했습니다",
        }),
      });
    }

    if (dex.fdvUsd && dex.liquidityUsd && dex.fdvUsd > 0) {
      const ratio = dex.liquidityUsd / dex.fdvUsd;
      if (ratio < 0.003) {
        findings.push({
          type: "warning",
          text: 文(lang, {
            en: "High FDV vs liquidity (fragile price)",
            "zh-CN": "FDV 相对流动性过高（价格更脆弱）",
            "zh-TW": "FDV 相對流動性過高（價格更脆弱）",
            ko: "FDV 대비 유동성이 낮습니다 (가격 취약)",
          }),
        });
      }
    }
  }

  return dex;
}

async function runIntelModule(args: { resolved: ModuleResolve; lang: Locale; findings: Finding[]; evidence: Evidence[] }): Promise<ModuleIntel> {
  const { resolved, lang, findings, evidence } = args;
  const [frMeta, frAltResp, mrTags, arkham, gmgnHoldings, gmgnTrades, bscscan] = await Promise.all([
    withTimeout(fetchFrontrunWalletMetadata({ chain: "BSC", address: resolved.address }), 2500).catch(() => null),
    withTimeout(fetchFrontrunAltWallets({ chain: "BSC", address: resolved.address }), 2500).catch(() => null),
    withTimeout(
      fetchMemeRadarWalletTags({
        chain: "BSC",
        walletAddress: resolved.address,
        contractAddress: resolved.isContract ? resolved.address : undefined,
      }),
      2500
    ).catch(() => null),
    withTimeout(fetchArkhamAddressEnrichedLite(resolved.address), 2500).catch(() => null),
    resolved.type === "wallet" ? withTimeout(fetchGmgnWalletHoldingsBsc({ wallet: resolved.address, limit: 60 }), 2500).catch(() => null) : Promise.resolve(null),
    resolved.type === "contract" ? withTimeout(fetchGmgnTokenTradesBsc({ token: resolved.address, limit: 80 }), 2500).catch(() => null) : Promise.resolve(null),
    withTimeout(fetchBscScanAddressSummary(resolved.address), 6500).catch(() => null),
  ]);
  const gmgn = gmgnHoldings || gmgnTrades ? { holdings: gmgnHoldings, trades: gmgnTrades } : null;
  const frAlt = frAltResp?.items || null;
  const frSource: "api" | "none" = frMeta?.source || frAltResp?.source || "none";
  const mrSource: "api" | "none" = mrTags ? "api" : "none";
  const arkhamSource: "api" | "none" = arkham?.source || "none";
  const gmgnSource: "api" | "none" = gmgnHoldings?.source || gmgnTrades?.source || "none";
  const bscscanSource: "api" | "none" = bscscan?.source || "none";

  if (frMeta) {
    if (frMeta.primaryLabel) {
      findings.push({
        type: "info",
        text: 文(lang, {
          en: `External profile label: ${frMeta.primaryLabel}`,
          "zh-CN": `外部地址画像：${frMeta.primaryLabel}`,
          "zh-TW": `外部地址畫像：${frMeta.primaryLabel}`,
          ko: `외부 주소 프로필 라벨: ${frMeta.primaryLabel}`,
        }),
      });
    }
    if (frMeta.verified === true) {
      findings.push({
        type: "success",
        text: 文(lang, {
          en: "External source indicates verified label",
          "zh-CN": "外部画像源显示：该地址存在已验证标签",
          "zh-TW": "外部畫像源顯示：該地址存在已驗證標籤",
          ko: "외부 소스에서 검증된 라벨이 확인되었습니다",
        }),
      });
    }
    if (Array.isArray(frMeta.tokenStats) && frMeta.tokenStats.length > 0) {
      const best = frMeta.tokenStats
        .filter((x) => typeof x.pnlUsd === "number" && Number.isFinite(x.pnlUsd))
        .sort((a, b) => Number(b.pnlUsd || 0) - Number(a.pnlUsd || 0))[0];
      if (best?.tokenSymbol) {
        findings.push({
          type: "info",
          text: (() => {
            const pnlText = typeof best.pnlUsd === "number" ? `$${Math.round(best.pnlUsd).toLocaleString()}` : "";
            if (lang === "en") return `Past active asset: ${best.tokenSymbol}${pnlText ? ` (PnL≈${pnlText})` : ""}`;
            if (lang === "ko") return `과거 주요 자산: ${best.tokenSymbol}${pnlText ? ` (PnL≈${pnlText})` : ""}`;
            return `历史活跃资产：${best.tokenSymbol}${pnlText ? `（PnL≈${pnlText}）` : ""}`;
          })(),
        });
      }
    }
    evidence.push({
      label: "Address Label Source",
      url: `${(envStr("FR_BASE") || "https://loadbalance.frontrun.pro").replace(/\/$/, "")}/api/v2/wallet/metadata/BSC/${resolved.address}`,
    });
  }

  if (Array.isArray(frAlt) && frAlt.length) {
    findings.push({
      type: "warning",
      text: 文(lang, {
        en: `Detected ${frAlt.length} potential related addresses`,
        "zh-CN": `检测到 ${frAlt.length} 个潜在关联地址（仅供进一步核验）`,
        "zh-TW": `檢測到 ${frAlt.length} 個潛在關聯地址（僅供進一步核驗）`,
        ko: `${frAlt.length}개의 잠재 연관 주소가 감지되었습니다 (추가 검증 필요)`,
      }),
    });
  }

  if (mrTags?.tags?.length) {
    const tagsText = joinHumanList(lang, mrTags.tags.slice(0, 6));
    findings.push({
      type: "info",
      text: 文(lang, {
        en: `External tags: ${tagsText}`,
        "zh-CN": `外部标签信号：${tagsText}`,
        "zh-TW": `外部標籤信號：${tagsText}`,
        ko: `외부 태그 신호: ${tagsText}`,
      }),
    });
  }

  if (arkham) {
    const label = arkham.labelName || arkham.entityName || arkham.entityType;
    if (label) {
      findings.push({
        type: "info",
        text: 文(lang, {
          en: `Arkham label: ${label}`,
          "zh-CN": `Arkham 标签：${label}`,
          "zh-TW": `Arkham 標籤：${label}`,
          ko: `Arkham 라벨: ${label}`,
        }),
      });
    }
    const riskyTypes = ["mixer", "hacker", "exploit", "sanctioned", "scammer", "phishing"];
    if (arkham.entityType && riskyTypes.some((k) => arkham.entityType?.includes(k))) {
      findings.push({
        type: "warning",
        text: 文(lang, {
          en: `Arkham marks this address as high-risk type: ${arkham.entityType}`,
          "zh-CN": `Arkham 标注类型偏高风险：${arkham.entityType}`,
          "zh-TW": `Arkham 標註類型偏高風險：${arkham.entityType}`,
          ko: `Arkham에서 고위험 유형으로 분류: ${arkham.entityType}`,
        }),
      });
    }
    if (arkham.tags.length) {
      const tagsText = joinHumanList(lang, arkham.tags.slice(0, 4));
      findings.push({
        type: "info",
        text: 文(lang, {
          en: `Arkham tags: ${tagsText}`,
          "zh-CN": `Arkham 关联标签：${tagsText}`,
          "zh-TW": `Arkham 關聯標籤：${tagsText}`,
          ko: `Arkham 태그: ${tagsText}`,
        }),
      });
    }
    evidence.push({
      label: "Arkham",
      url: `https://intel.arkm.com/explorer/address/${resolved.address}`,
    });
  }

  if (gmgn?.holdings?.holdings?.length) {
    const profitableCount = gmgn.holdings.holdings.filter((h) => (h.realizedProfitUsd || 0) > 0 || (h.totalProfitUsd || 0) > 0).length;
    const topTags = [...new Set(gmgn.holdings.holdings.flatMap((h) => h.walletTags || []))].slice(0, 6);
    findings.push({
      type: "info",
      text: 文(lang, {
        en: `GMGN portfolio profile: ${gmgn.holdings.holdings.length} holdings, ${profitableCount} profitable`,
        "zh-CN": `GMGN 持仓画像：共 ${gmgn.holdings.holdings.length} 个持仓，盈利仓位 ${profitableCount} 个`,
        "zh-TW": `GMGN 持倉畫像：共 ${gmgn.holdings.holdings.length} 個持倉，盈利倉位 ${profitableCount} 個`,
        ko: `GMGN 포트폴리오 프로필: 총 ${gmgn.holdings.holdings.length}개 보유, 수익 구간 ${profitableCount}개`,
      }),
    });
    if (topTags.length) {
      const tagsText = joinHumanList(lang, topTags);
      findings.push({
        type: "info",
        text: 文(lang, {
          en: `GMGN wallet tags: ${tagsText}`,
          "zh-CN": `GMGN 钱包标签：${tagsText}`,
          "zh-TW": `GMGN 錢包標籤：${tagsText}`,
          ko: `GMGN 지갑 태그: ${tagsText}`,
        }),
      });
    }
    evidence.push({
      label: "GMGN",
      url: `https://gmgn.ai/bsc/address/${resolved.address}`,
    });
  }
  if (gmgn?.trades?.trades?.length) {
    const makerSet = new Set(
      gmgn.trades.trades
        .map((t) => String(t.maker || "").toLowerCase())
        .filter((m) => isAddress(m, { strict: false }))
    );
    findings.push({
      type: "info",
      text: 文(lang, {
        en: `GMGN trade sample: ${gmgn.trades.trades.length} trades, ${makerSet.size} unique makers`,
        "zh-CN": `GMGN 交易样本：${gmgn.trades.trades.length} 笔，独立 maker ${makerSet.size} 个`,
        "zh-TW": `GMGN 交易樣本：${gmgn.trades.trades.length} 筆，獨立 maker ${makerSet.size} 個`,
        ko: `GMGN 거래 샘플: ${gmgn.trades.trades.length}건, 고유 maker ${makerSet.size}개`,
      }),
    });
    evidence.push({
      label: "GMGN Token",
      url: `https://gmgn.ai/bsc/token/${resolved.address}`,
    });
  }

  if (bscscan) {
    if (bscscan.txCount24h > 0 || bscscan.tokenTransferCount24h > 0) {
      findings.push({
        type: "info",
        text: 文(lang, {
          en: `BscScan activity (24h): ${bscscan.txCount24h} txs, ${bscscan.tokenTransferCount24h} token transfers`,
          "zh-CN": `BscScan 活跃度（24h）：交易 ${bscscan.txCount24h} 笔，代币转账 ${bscscan.tokenTransferCount24h} 笔`,
          "zh-TW": `BscScan 活躍度（24h）：交易 ${bscscan.txCount24h} 筆，代幣轉帳 ${bscscan.tokenTransferCount24h} 筆`,
          ko: `BscScan 활동도(24h): 거래 ${bscscan.txCount24h}건, 토큰 전송 ${bscscan.tokenTransferCount24h}건`,
        }),
      });
    }
  }

  return { frMeta, frAlt, frSource, mrTags, mrSource, arkham, arkhamSource, gmgn, gmgnSource, bscscan, bscscanSource };
}

async function runMemeModule(args: {
  resolved: ModuleResolve;
  lang: Locale;
  findings: Finding[];
  evidence: Evidence[];
}): Promise<ModuleMeme> {
  const { resolved, lang, findings, evidence } = args;
  if (!resolved.isContract) return null;
  if (!envStr("MORALIS_API_KEY")) return null;

  const ownersResp = await withTimeout(
    fetchMoralisTokenOwners({ chain: "bsc", tokenAddress: resolved.address, limit: 60, order: "DESC" }),
    3500
  ).catch(() => null);
  if (!ownersResp?.owners?.length) return null;

  const unique = new Set<string>();
  const candidates = ownersResp.owners
    .map((x) => x.ownerAddress.toLowerCase())
    .filter((addr) => {
      if (addr === resolved.address.toLowerCase()) return false;
      if (unique.has(addr)) return false;
      unique.add(addr);
      return true;
    })
    .slice(0, 24);
  if (!candidates.length) return null;

  const isContractFlags = await mapLimit(candidates, 5, async (addr) => {
    const code = await resolved.client.getBytecode({ address: addr as `0x${string}` }).catch(() => null);
    return Boolean(code && code !== "0x");
  });
  const topHolders = candidates.filter((_, i) => !isContractFlags[i]).slice(0, 12);
  if (!topHolders.length) return null;

  const frHolderMeta = await mapLimit(topHolders, 4, async (addr) =>
    withTimeout(fetchFrontrunWalletMetadata({ chain: "BSC", address: addr }), 1200).catch(() => null)
  );

  const smartIdx: number[] = [];
  for (let i = 0; i < frHolderMeta.length; i++) {
    const meta = frHolderMeta[i];
    if (!meta) continue;
    const hay = `${meta.primaryLabel || ""} ${(meta.tags || []).join(" ")}`.toLowerCase();
    const maybeKOL = ["kol", "smart", "alpha", "sniper", "whale", "fund", "maker", "trader"].some((k) => hay.includes(k));
    const highPnl = (meta.tokenStats || []).some((x) => typeof x.pnlUsd === "number" && Number.isFinite(x.pnlUsd) && x.pnlUsd > 5_000);
    if (meta.verified === true || maybeKOL || highPnl) smartIdx.push(i);
  }
  const smartMoneySamples = smartIdx.slice(0, 4).map((i) => {
    const addr = topHolders[i];
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  });

  const firstFundingByHolder = new Map<string, string>();
  let cursor: string | undefined;
  let pageCount = 0;
  const holderSet = new Set(topHolders.map((x) => x.toLowerCase()));
  while (pageCount < 6 && firstFundingByHolder.size < holderSet.size) {
    pageCount += 1;
    const page = await withTimeout(
      fetchMoralisTokenTransfers({
        chain: "bsc",
        tokenAddress: resolved.address,
        limit: 100,
        cursor,
        order: "ASC",
      }),
      3200
    ).catch(() => null);
    if (!page || !page.transfers.length) break;
    for (const t of page.transfers) {
      const to = t.toAddress.toLowerCase();
      if (!holderSet.has(to)) continue;
      if (firstFundingByHolder.has(to)) continue;
      const from = t.fromAddress.toLowerCase();
      if (!isAddress(from, { strict: false })) continue;
      firstFundingByHolder.set(to, from);
    }
    cursor = page.cursor;
    if (!cursor) break;
  }

  const bySource = new Map<string, number>();
  for (const src of firstFundingByHolder.values()) bySource.set(src, (bySource.get(src) ?? 0) + 1);
  const bundledSources = [...bySource.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const bundleSourceSamples = bundledSources.map(([s]) => `${s.slice(0, 6)}…${s.slice(-4)}`);

  findings.push({
    type: "info",
    text: 文(lang, {
      en: `Meme holder scan: analyzed ${topHolders.length} top addresses (obvious contracts filtered)`,
      "zh-CN": `Meme 持币结构扫描：已分析 ${topHolders.length} 个 Top 地址（过滤了明显合约地址）`,
      "zh-TW": `Meme 持幣結構掃描：已分析 ${topHolders.length} 個 Top 地址（過濾了明顯合約地址）`,
      ko: `Meme 홀더 구조 스캔: 상위 주소 ${topHolders.length}개를 분석했습니다 (명백한 컨트랙트 주소 제외)`,
    }),
  });

  if (smartIdx.length > 0) {
    const sampleText = joinHumanList(lang, smartMoneySamples);
    findings.push({
      type: "success",
      text: (() => {
        const suffix =
          smartMoneySamples.length > 0
            ? lang === "en" || lang === "ko"
              ? ` (${sampleText})`
              : `（${sampleText}）`
            : "";
        return 文(lang, {
          en: `Detected ${smartIdx.length}/${topHolders.length} possible smart-money/KOL holders${suffix}`,
          "zh-CN": `检测到 ${smartIdx.length}/${topHolders.length} 个疑似聪明钱/KOL 地址${suffix}`,
          "zh-TW": `檢測到 ${smartIdx.length}/${topHolders.length} 個疑似聰明錢/KOL 地址${suffix}`,
          ko: `${smartIdx.length}/${topHolders.length}개의 스마트머니/KOL 가능 주소를 감지했습니다${suffix}`,
        });
      })(),
    });
  }

  if (bundledSources.length > 0) {
    const sampleText = joinHumanList(lang, bundleSourceSamples);
    findings.push({
      type: "warning",
      text: (() => {
        const suffix = bundleSourceSamples.length > 0 ? `: ${sampleText}` : "";
        return 文(lang, {
          en: `Detected ${bundledSources.length} shared funding-source groups (possible bundled/linked wallets)${suffix}`,
          "zh-CN": `检测到 ${bundledSources.length} 组同源入金分发（疑似捆绑/关联地址）${bundleSourceSamples.length ? `：${sampleText}` : ""}`,
          "zh-TW": `檢測到 ${bundledSources.length} 組同源入金分發（疑似綁定/關聯地址）${bundleSourceSamples.length ? `：${sampleText}` : ""}`,
          ko: `동일 자금원 분산 그룹 ${bundledSources.length}개 감지됨 (묶음/연관 지갑 가능성)${suffix}`,
        });
      })(),
    });
  }

  evidence.push({ label: "Token Holders", url: `https://bscscan.com/token/${resolved.address}#balances` });

  return {
    topHolderCount: topHolders.length,
    smartMoneyHolderCount: smartIdx.length,
    bundleGroupCount: bundledSources.length,
    smartMoneySamples,
    bundleSourceSamples,
  };
}

function runRiskModule(args: { resolved: ModuleResolve; dex: DexMeta; intel: ModuleIntel; meme: ModuleMeme }): number {
  const { resolved, dex, intel, meme } = args;
  let score = 18;
  if (resolved.isContract) score += 18;
  if (dex.liquidityUsd != null && dex.liquidityUsd > 0) {
    if (dex.liquidityUsd < 5_000) score += 32;
    else if (dex.liquidityUsd < 30_000) score += 18;
  } else if (resolved.isContract) {
    score += 10;
  }

  if (dex.fdvUsd && dex.liquidityUsd && dex.fdvUsd > 0) {
    const ratio = dex.liquidityUsd / dex.fdvUsd;
    if (ratio < 0.003) score += 18;
  }

  if ((intel.frAlt?.length || 0) > 0) {
    score += Math.min(14, 4 + Math.floor((intel.frAlt?.length || 0) / 3));
  }
  if ((meme?.bundleGroupCount || 0) > 0) {
    score += Math.min(16, 6 + (meme?.bundleGroupCount || 0) * 4);
  }
  const arkhamType = String(intel.arkham?.entityType || "").toLowerCase();
  if (arkhamType && ["mixer", "hacker", "exploit", "sanctioned", "scammer", "phishing"].some((k) => arkhamType.includes(k))) {
    score += 15;
  }
  const gmgnPortfolio = intel.gmgn?.holdings?.holdings || [];
  const gmgnProfitable = gmgnPortfolio.filter((h) => (h.realizedProfitUsd || 0) > 0 || (h.totalProfitUsd || 0) > 0).length;
  if (gmgnProfitable >= 8) score -= 4;

  return clampScore(score);
}

function defaultNarrative(args: {
  lang: Locale;
  score: number;
  resolved: ModuleResolve;
  dex: DexMeta;
  meme: ModuleMeme;
}): { tldr: string; explanation: string } {
  const { lang, score, resolved, dex, meme } = args;
  const tldr =
    score >= 80
      ? 文(lang, {
          en: "High risk: prioritize evidence review and avoid impulsive trades.",
          "zh-CN": "高风险：建议以观察和证据复核为主，避免冲动交易。",
          "zh-TW": "高風險：建議以觀察和證據復核為主，避免衝動交易。",
          ko: "고위험: 증거 검토를 우선하고 충동 거래를 피하세요.",
        })
      : score >= 55
        ? 文(lang, {
            en: "Medium risk: verify holders, controls, and liquidity sources.",
            "zh-CN": "中风险：建议进一步核查持币结构、权限控制与流动性来源。",
            "zh-TW": "中風險：建議進一步核查持幣結構、權限控制與流動性來源。",
            ko: "중위험: 홀더 구조, 권한 제어, 유동성 출처를 추가 검증하세요.",
          })
        : 文(lang, {
            en: "Lower risk: still verify controls, concentration, and liquidity quality.",
            "zh-CN": "相对低风险：仍建议复核关键权限、持币集中度和流动性质量。",
            "zh-TW": "相對低風險：仍建議復核關鍵權限、持幣集中度和流動性質量。",
            ko: "상대적 저위험: 그래도 권한, 집중도, 유동성 품질은 확인하세요.",
          });

  const explainParts: string[] = [];
  explainParts.push(
    resolved.isContract
      ? 文(lang, {
          en: "This input is identified as a contract address.",
          "zh-CN": "该输入被识别为合约地址。",
          "zh-TW": "該輸入被識別為合約地址。",
          ko: "입력값은 컨트랙트 주소로 식별되었습니다.",
        })
      : 文(lang, {
          en: "This input is identified as an EOA wallet.",
          "zh-CN": "该输入被识别为普通地址（EOA）。",
          "zh-TW": "該輸入被識別為普通地址（EOA）。",
          ko: "입력값은 EOA 지갑 주소로 식별되었습니다.",
        })
  );

  if (dex.liquidityUsd != null && dex.liquidityUsd > 0) {
    explainParts.push(
      文(lang, {
        en: `Visible liquidity is about $${Math.round(dex.liquidityUsd).toLocaleString()}.`,
        "zh-CN": `可见流动性约 $${Math.round(dex.liquidityUsd).toLocaleString()}。`,
        "zh-TW": `可見流動性約 $${Math.round(dex.liquidityUsd).toLocaleString()}。`,
        ko: `가시 유동성은 약 $${Math.round(dex.liquidityUsd).toLocaleString()} 수준입니다.`,
      })
    );
  } else {
    explainParts.push(
      文(lang, {
        en: "Liquidity data was unavailable, so this evaluation is conservative.",
        "zh-CN": "当前未稳定获取到流动性数据，因此本次评估偏保守。",
        "zh-TW": "當前未穩定獲取到流動性資料，因此本次評估偏保守。",
        ko: "유동성 데이터를 안정적으로 확보하지 못해 이번 평가는 보수적으로 진행되었습니다.",
      })
    );
  }

  if ((meme?.bundleGroupCount || 0) > 0) {
    explainParts.push(
      文(lang, {
        en: `Top holders show ${meme?.bundleGroupCount} shared funding groups; verify if they belong to one cluster.`,
        "zh-CN": `Top 持币地址存在 ${meme?.bundleGroupCount} 组同源入金分发，需重点复核是否为同团体地址。`,
        "zh-TW": `Top 持幣地址存在 ${meme?.bundleGroupCount} 組同源入金分發，需重點復核是否為同團體地址。`,
        ko: `상위 홀더에서 ${meme?.bundleGroupCount}개의 동일 자금원 그룹이 확인되었습니다. 동일 군집 여부를 중점 검증하세요.`,
      })
    );
  }

  explainParts.push(
    文(lang, {
      en: "Evidence links are included; verify on BscScan and other sources.",
      "zh-CN": "结论已尽量附带可点击证据，建议在 BscScan 等来源二次复核。",
      "zh-TW": "結論已盡量附帶可點擊證據，建議在 BscScan 等來源二次復核。",
      ko: "결론에는 클릭 가능한 증거 링크가 포함되어 있습니다. BscScan 등에서 2차 검증하세요.",
    })
  );

  return {
    tldr,
    explanation: sentenceJoin(lang, explainParts),
  };
}

function looksMostlyLatinText(s: string): boolean {
  const text = String(s || "");
  if (!text) return false;
  const latinChars = (text.match(/[A-Za-z]/g) || []).length;
  const zhChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  // For zh mode, treat long Latin-heavy output as a language mismatch.
  return latinChars >= 24 && latinChars > zhChars * 2;
}

async function summarizeNarrativeWithAi(args: {
  lang: Locale;
  score: number;
  address: string;
  type: "contract" | "wallet";
  findings: Finding[];
  liquidityUsd?: number;
}): Promise<{ tldr: string; explanation: string } | null> {
  const apiKey = envStr("OPENROUTER_API_KEY") || envStr("AI_API_KEY");
  if (!apiKey) return null;

  const model = envStr("OPENROUTER_MODEL_ID") || envStr("AI_MODEL") || "x-ai/grok-4-fast";
  const base = envStr("OPENROUTER_BASE_URL") || "https://openrouter.ai/api/v1";

  const factLines = args.findings.slice(0, 6).map((f) => `- ${f.text}`).join("\\n");
  const promptByLang: Record<Locale, string> = {
    en: [
      'You are an onchain research assistant. Output JSON only: {"tldr":string,"explanation":string}.',
      "Keep it concise, conservative, and plain language. Do not mention any internal modules.",
      `Address: ${args.address}`,
      `Type: ${args.type}`,
      `Risk score: ${args.score}`,
      `Liquidity USD: ${args.liquidityUsd ?? "unknown"}`,
      `Facts: ${factLines}`,
    ].join("\n"),
    "zh-CN": [
      "你是链上研究助手。只输出 JSON，格式为 {\"tldr\":string,\"explanation\":string}。",
      "要求：简洁、保守、可读，不使用小标题，不提到任何模块名或系统内部结构。",
      `地址: ${args.address}`,
      `类型: ${args.type}`,
      `风险分: ${args.score}`,
      `流动性USD: ${args.liquidityUsd ?? "unknown"}`,
      `关键事实: ${factLines}`,
    ].join("\n"),
    "zh-TW": [
      "你是鏈上研究助手。只輸出 JSON，格式為 {\"tldr\":string,\"explanation\":string}。",
      "要求：簡潔、保守、可讀，不使用小標題，不提到任何模組名或系統內部結構。",
      `地址: ${args.address}`,
      `類型: ${args.type}`,
      `風險分: ${args.score}`,
      `流動性USD: ${args.liquidityUsd ?? "unknown"}`,
      `關鍵事實: ${factLines}`,
    ].join("\n"),
    ko: [
      '당신은 온체인 리서치 어시스턴트입니다. JSON만 출력하세요: {"tldr":string,"explanation":string}.',
      "간결하고 보수적이며 평이한 표현을 사용하세요. 내부 모듈명은 언급하지 마세요.",
      `주소: ${args.address}`,
      `유형: ${args.type}`,
      `위험 점수: ${args.score}`,
      `유동성 USD: ${args.liquidityUsd ?? "unknown"}`,
      `핵심 사실: ${factLines}`,
    ].join("\n"),
  };
  const prompt = promptByLang[args.lang];

  const headers: Record<string, string> = {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
  };
  const referer = envStr("OPENROUTER_HTTP_REFERER");
  const title = envStr("OPENROUTER_X_TITLE");
  if (referer) headers["http-referer"] = referer;
  if (title) headers["x-title"] = title;

  const res = await withTimeout(
    fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 350,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
      cache: "no-store",
    }),
    4500
  );

  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !json) return null;

  const choices = json.choices;
  if (!Array.isArray(choices) || !choices.length) return null;
  const first = choices[0] as Record<string, unknown>;
  const msg = first.message as Record<string, unknown> | undefined;
  const rawContent = msg?.content;

  let content = "";
  if (typeof rawContent === "string") {
    content = rawContent;
  } else if (Array.isArray(rawContent)) {
    content = rawContent
      .map((x) => {
        const rec = x as Record<string, unknown>;
        return typeof rec.text === "string" ? rec.text : "";
      })
      .join("\n");
  }

  if (!content.trim()) return null;

  const parsed = z
    .object({
      tldr: z.string().min(1).max(220),
      explanation: z.string().min(1).max(1200),
    })
    .safeParse(JSON.parse(content));

  if (!parsed.success) return null;
  return parsed.data;
}

function buildRuntimeInfo(args: {
  lang: Locale;
  intel: ModuleIntel;
  dex: DexMeta;
  aiUsed: boolean;
  aiConfigured: boolean;
}): BriefResult["runtime"] {
  const { lang } = args;
  const hasMoralis = Boolean(envStr("MORALIS_API_KEY"));
  const hasFrontrunCreds = Boolean(envStr("FR_TOKEN") || envStr("FR_COOKIE"));
  const hasMemeRadar = Boolean(envStr("MR_TOKEN"));
  const hasArkham = Boolean(envStr("ARKM_API_KEY") || envStr("ARKHAM_API_KEY"));
  const hasGmgn = isGmgnConfigured();
  const hasBscscan = isBscScanConfigured();

  const frStatus: "live" | "fallback" | "disabled" =
    args.intel.frSource === "api" ? "live" : hasFrontrunCreds ? "fallback" : "disabled";
  const frNote =
    args.intel.frSource === "api"
      ? 文(lang, {
          en: "live: batch-query -> single-query fallback",
          "zh-CN": "可用：批量查询，单查询兜底",
          "zh-TW": "可用：批量查詢，單查詢兜底",
          ko: "가동: batch-query 후 single-query 폴백",
        })
      : hasFrontrunCreds
        ? 文(lang, {
            en: "api configured; no signal returned",
            "zh-CN": "API 已配置，但未返回信号",
            "zh-TW": "API 已配置，但未返回信號",
            ko: "API는 설정되었지만 신호가 없습니다",
          })
        : 文(lang, { en: "not configured", "zh-CN": "未配置", "zh-TW": "未配置", ko: "미설정" });

  const mrStatus: "live" | "fallback" | "disabled" =
    args.intel.mrSource === "api" ? "live" : hasMemeRadar ? "fallback" : "disabled";
  const mrNote = hasMemeRadar
    ? 文(lang, { en: "api configured", "zh-CN": "API 已配置", "zh-TW": "API 已配置", ko: "API 설정됨" })
    : 文(lang, { en: "not configured", "zh-CN": "未配置", "zh-TW": "未配置", ko: "미설정" });
  const arkhamStatus: "live" | "fallback" | "disabled" =
    args.intel.arkhamSource === "api" ? "live" : hasArkham ? "fallback" : "disabled";
  const gmgnStatus: "live" | "fallback" | "disabled" =
    args.intel.gmgnSource === "api" ? "live" : hasGmgn ? "fallback" : "disabled";
  const bscscanStatus: "live" | "fallback" | "disabled" =
    args.intel.bscscanSource === "api" ? "live" : hasBscscan ? "fallback" : "disabled";

  const moralisStatus: "live" | "disabled" = hasMoralis ? "live" : "disabled";
  const dexStatus: "live" | "fallback" = args.dex.source === "api" ? "live" : "fallback";
  const openrouterStatus: "live" | "fallback" | "disabled" = args.aiUsed ? "live" : args.aiConfigured ? "fallback" : "disabled";

  const mode: "enhanced" | "fallback" =
    dexStatus === "live" ||
    frStatus === "live" ||
    mrStatus === "live" ||
    arkhamStatus === "live" ||
    gmgnStatus === "live" ||
    bscscanStatus === "live" ||
    moralisStatus === "live" ||
    openrouterStatus === "live"
      ? "enhanced"
      : "fallback";

  return {
    mode,
    sources: [
      {
        id: "bsc_rpc",
        status: "live",
        note: 文(lang, {
          en: "public RPC + optional custom endpoint",
          "zh-CN": "公共 RPC + 可选自定义节点",
          "zh-TW": "公共 RPC + 可選自定義節點",
          ko: "공용 RPC + 선택적 커스텀 엔드포인트",
        }),
      },
      {
        id: "dexscreener",
        status: dexStatus,
        note:
          dexStatus === "live"
            ? 文(lang, { en: "public market data", "zh-CN": "公开市场数据", "zh-TW": "公開市場數據", ko: "공개 시장 데이터" })
            : 文(lang, {
                en: "request failed or no signal",
                "zh-CN": "请求失败或无信号",
                "zh-TW": "請求失敗或無信號",
                ko: "요청 실패 또는 신호 없음",
              }),
      },
      {
        id: "moralis",
        status: moralisStatus,
        note: hasMoralis
          ? 文(lang, { en: "api configured", "zh-CN": "API 已配置", "zh-TW": "API 已配置", ko: "API 설정됨" })
          : 文(lang, { en: "api key missing", "zh-CN": "缺少 API Key", "zh-TW": "缺少 API Key", ko: "API 키 없음" }),
      },
      { id: "frontrun", status: frStatus, note: frNote },
      { id: "memeradar", status: mrStatus, note: mrNote },
      {
        id: "arkham",
        status: arkhamStatus,
        note:
          arkhamStatus === "live"
            ? 文(lang, { en: "api live", "zh-CN": "API 可用", "zh-TW": "API 可用", ko: "API 가동" })
            : hasArkham
              ? 文(lang, {
                  en: "api configured; request failed or no signal",
                  "zh-CN": "API 已配置；请求失败或无信号",
                  "zh-TW": "API 已配置；請求失敗或無信號",
                  ko: "API 설정됨; 요청 실패 또는 신호 없음",
                })
              : 文(lang, { en: "not configured", "zh-CN": "未配置", "zh-TW": "未配置", ko: "미설정" }),
      },
      {
        id: "gmgn",
        status: gmgnStatus,
        note:
          gmgnStatus === "live"
            ? 文(lang, { en: "api live", "zh-CN": "API 可用", "zh-TW": "API 可用", ko: "API 가동" })
            : hasGmgn
              ? 文(lang, {
                  en: "api configured; request failed or no signal",
                  "zh-CN": "API 已配置；请求失败或无信号",
                  "zh-TW": "API 已配置；請求失敗或無信號",
                  ko: "API 설정됨; 요청 실패 또는 신호 없음",
                })
              : 文(lang, { en: "not configured", "zh-CN": "未配置", "zh-TW": "未配置", ko: "미설정" }),
      },
      {
        id: "bscscan",
        status: bscscanStatus,
        note:
          bscscanStatus === "live"
            ? 文(lang, { en: "api live", "zh-CN": "API 可用", "zh-TW": "API 可用", ko: "API 가동" })
            : hasBscscan
              ? 文(lang, {
                  en: "api configured; request failed or no signal",
                  "zh-CN": "API 已配置；请求失败或无信号",
                  "zh-TW": "API 已配置；請求失敗或無信號",
                  ko: "API 설정됨; 요청 실패 또는 신호 없음",
                })
              : 文(lang, { en: "not configured", "zh-CN": "未配置", "zh-TW": "未配置", ko: "미설정" }),
      },
      {
        id: "openrouter",
        status: openrouterStatus,
        note: args.aiConfigured
          ? 文(lang, { en: "llm summarizer configured", "zh-CN": "LLM 总结器已配置", "zh-TW": "LLM 總結器已配置", ko: "LLM 요약기 설정됨" })
          : 文(lang, { en: "llm summarizer disabled", "zh-CN": "LLM 总结器未启用", "zh-TW": "LLM 總結器未啟用", ko: "LLM 요약기 비활성" }),
      },
    ],
  };
}

export async function analyzeBrief(args: { query: string; lang: Locale }): Promise<BriefResult> {
  const findings: Finding[] = [];
  const evidence: Evidence[] = [];
  const aiConfigured = Boolean(envStr("OPENROUTER_API_KEY") || envStr("AI_API_KEY"));

  const resolved = await runResolveModule({ query: args.query, lang: args.lang });
  evidence.push({ label: "BscScan", url: `https://bscscan.com/address/${resolved.address}` });

  const [tokenMeta, dex, intel, meme] = await Promise.all([
    runContractModule({ resolved, lang: args.lang, findings, evidence }),
    runMarketModule({ resolved, lang: args.lang, findings, evidence }),
    runIntelModule({ resolved, lang: args.lang, findings, evidence }),
    runMemeModule({ resolved, lang: args.lang, findings, evidence }),
  ]);

  const score = runRiskModule({ resolved, dex, intel, meme });
  const fallback = defaultNarrative({ lang: args.lang, score, resolved, dex, meme });

  const aiNarrative = await summarizeNarrativeWithAi({
    lang: args.lang,
    score,
    address: resolved.address,
    type: resolved.type,
    findings,
    liquidityUsd: dex.liquidityUsd,
  }).catch(() => null);

  const aiNarrativeUsable =
    aiNarrative &&
    !(
      (args.lang === "zh-CN" || args.lang === "zh-TW") &&
      (looksMostlyLatinText(aiNarrative.tldr) || looksMostlyLatinText(aiNarrative.explanation))
    );

  const tldr = aiNarrativeUsable ? aiNarrative.tldr : fallback.tldr;
  const explanation = aiNarrativeUsable ? aiNarrative.explanation : fallback.explanation;
  const runtime = buildRuntimeInfo({
    lang: args.lang,
    intel,
    dex,
    aiUsed: Boolean(aiNarrativeUsable),
    aiConfigured,
  });

  const entityTitle = tokenMeta.symbol || (resolved.isContract ? "Contract" : "Wallet");
  const entitySubtitle =
    tokenMeta.name ||
    (resolved.isContract
      ? 文(args.lang, { en: "Contract", "zh-CN": "合约地址", "zh-TW": "合約地址", ko: "컨트랙트 주소" })
      : 文(args.lang, { en: "Address", "zh-CN": "地址", "zh-TW": "地址", ko: "주소" }));

  return {
    address: resolved.address,
    type: resolved.type,
    riskScore: score,
    tldr,
    findings: findings.slice(0, 10),
    evidence: evidence.slice(0, 10),
    explanation,
    entity: {
      title: entityTitle,
      subtitle: entitySubtitle,
      tags: [
        ...(tokenMeta.decimals != null ? [`decimals:${tokenMeta.decimals}`] : []),
        ...(dex.dexId ? [`dex:${dex.dexId}`] : []),
      ].slice(0, 4),
    },
    enrich: {
      frontrun: intel.frMeta
        ? {
            primaryLabel: intel.frMeta.primaryLabel,
            verified: intel.frMeta.verified,
            tags: intel.frMeta.tags,
            primaryDomain: intel.frMeta.primaryDomain,
            tokenStats: intel.frMeta.tokenStats,
            altWallets: Array.isArray(intel.frAlt) ? intel.frAlt : undefined,
          }
        : undefined,
      memeradar: intel.mrTags ? { tags: intel.mrTags.tags } : undefined,
      arkham: intel.arkham
        ? {
            entityName: intel.arkham.entityName,
            entityType: intel.arkham.entityType,
            labelName: intel.arkham.labelName,
            tags: intel.arkham.tags,
          }
        : undefined,
      gmgn: intel.gmgn
        ? {
            holdingCount: intel.gmgn.holdings?.holdings.length,
            profitableCount:
              intel.gmgn.holdings?.holdings.filter((h) => (h.realizedProfitUsd || 0) > 0 || (h.totalProfitUsd || 0) > 0).length || 0,
            topTags: [...new Set((intel.gmgn.holdings?.holdings || []).flatMap((h) => h.walletTags || []))].slice(0, 8),
          }
        : undefined,
      bscscan: intel.bscscan
        ? {
            txCount24h: intel.bscscan.txCount24h,
            tokenTransferCount24h: intel.bscscan.tokenTransferCount24h,
            firstSeenAt: intel.bscscan.firstTxTimeSec,
            lastSeenAt: intel.bscscan.lastTxTimeSec,
          }
        : undefined,
      meme: meme || undefined,
    },
    runtime,
  };
}
