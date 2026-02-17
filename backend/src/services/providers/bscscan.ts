export type BscScanAddressSummary = {
  txCount24h: number;
  tokenTransferCount24h: number;
  firstTxTimeSec?: number;
  lastTxTimeSec?: number;
  contractCreator?: string;
  creationTxHash?: string;
  isContract?: boolean;
  source: "api";
};

type EtherscanV2Envelope<T> = {
  status?: string;
  message?: string;
  result?: T;
};

type ScanTxRow = {
  timeStamp?: string;
  hash?: string;
};

type ScanContractCreationRow = {
  contractAddress?: string;
  contractCreator?: string;
  txHash?: string;
};

function envStr(key: string): string {
  return String(process.env[key] || "").trim();
}

function normalizeApiKey(raw: string): string {
  let k = String(raw || "").trim();
  if (!k) return "";
  if (/^bearer\s+/i.test(k)) k = k.replace(/^bearer\s+/i, "").trim();
  if ((k.startsWith("\"") && k.endsWith("\"")) || (k.startsWith("'") && k.endsWith("'"))) k = k.slice(1, -1).trim();
  return k;
}

function readApiKey(): string {
  return (
    normalizeApiKey(envStr("BSCSCAN_API_KEY")) ||
    normalizeApiKey(envStr("ETHERSCAN_API_KEY")) ||
    normalizeApiKey(envStr("ETHERSCAN_V2_API_KEY"))
  );
}

function parseTsSec(v: unknown): number | undefined {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.floor(n);
}

function parseResultRows(result: unknown): ScanTxRow[] {
  if (!Array.isArray(result)) return [];
  const rows: ScanTxRow[] = [];
  for (const x of result) {
    if (!x || typeof x !== "object") continue;
    const rec = x as Record<string, unknown>;
    rows.push({
      timeStamp: typeof rec.timeStamp === "string" ? rec.timeStamp : undefined,
      hash: typeof rec.hash === "string" ? rec.hash : undefined,
    });
  }
  return rows;
}

function parseContractCreationRows(result: unknown): ScanContractCreationRow[] {
  if (!Array.isArray(result)) return [];
  const rows: ScanContractCreationRow[] = [];
  for (const x of result) {
    if (!x || typeof x !== "object") continue;
    const rec = x as Record<string, unknown>;
    rows.push({
      contractAddress: typeof rec.contractAddress === "string" ? rec.contractAddress : undefined,
      contractCreator: typeof rec.contractCreator === "string" ? rec.contractCreator : undefined,
      txHash: typeof rec.txHash === "string" ? rec.txHash : undefined,
    });
  }
  return rows;
}

function isNoTxMessage(msg: string): boolean {
  const s = msg.toLowerCase();
  return s.includes("no transactions found") || s.includes("no records found");
}

function resolveEndpoints(): string[] {
  const envBase = envStr("BSCSCAN_BASE");
  const defaults = [
    "https://api.etherscan.io/v2/api",
    "https://api.bscscan.com/v2/api",
    "https://api.bscscan.com/api",
    "https://api.etherscan.io/api",
  ];
  return [...new Set([envBase, ...defaults].filter(Boolean))];
}

async function fetchJsonWithRetry(url: string): Promise<Record<string, unknown> | null> {
  for (let i = 0; i < 2; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4500);
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { accept: "application/json", "user-agent": "brief-agent/1.0" },
      signal: ctrl.signal,
    }).catch(() => null);
    clearTimeout(t);
    if (!res?.ok) continue;
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (json && typeof json === "object") return json;
  }
  return null;
}

async function fetchList(args: {
  address: string;
  action: "txlist" | "tokentx";
  sort: "asc" | "desc";
  offset: number;
}): Promise<ScanTxRow[] | null> {
  const apiKey = readApiKey();
  if (!apiKey) return null;

  for (const endpoint of resolveEndpoints()) {
    const url = new URL(endpoint);
    const isLegacy = /\/api$/i.test(url.pathname) && !/\/v2\/api$/i.test(url.pathname);
    if (!isLegacy) url.searchParams.set("chainid", "56");
    url.searchParams.set("module", "account");
    url.searchParams.set("action", args.action);
    url.searchParams.set("address", args.address);
    url.searchParams.set("startblock", "0");
    url.searchParams.set("endblock", "99999999");
    url.searchParams.set("page", "1");
    url.searchParams.set("offset", String(Math.max(1, Math.min(100, args.offset))));
    url.searchParams.set("sort", args.sort);
    url.searchParams.set("apikey", apiKey);

    const json = (await fetchJsonWithRetry(url.toString())) as EtherscanV2Envelope<unknown> | null;
    if (!json || typeof json !== "object") continue;

    if (Array.isArray(json.result)) return parseResultRows(json.result);
    if (json.result && typeof json.result === "object") {
      const obj = json.result as Record<string, unknown>;
      if (Array.isArray(obj.items)) return parseResultRows(obj.items);
      if (Array.isArray(obj.data)) return parseResultRows(obj.data);
    }
    if (typeof json.result === "string") {
      if (isNoTxMessage(json.result)) return [];
      continue;
    }
  }
  return null;
}

async function fetchContractCreation(address: string): Promise<ScanContractCreationRow | null> {
  const apiKey = readApiKey();
  if (!apiKey) return null;

  for (const endpoint of resolveEndpoints()) {
    const url = new URL(endpoint);
    const isLegacy = /\/api$/i.test(url.pathname) && !/\/v2\/api$/i.test(url.pathname);
    if (!isLegacy) url.searchParams.set("chainid", "56");
    url.searchParams.set("module", "contract");
    url.searchParams.set("action", "getcontractcreation");
    url.searchParams.set("contractaddresses", address);
    url.searchParams.set("apikey", apiKey);

    const json = (await fetchJsonWithRetry(url.toString())) as EtherscanV2Envelope<unknown> | null;
    if (!json || typeof json !== "object") continue;

    if (Array.isArray(json.result)) {
      const rows = parseContractCreationRows(json.result);
      const first = rows[0];
      if (!first) return null;
      return first;
    }
    if (json.result && typeof json.result === "object") {
      const obj = json.result as Record<string, unknown>;
      if (Array.isArray(obj.items)) {
        const rows = parseContractCreationRows(obj.items);
        return rows[0] || null;
      }
      if (Array.isArray(obj.data)) {
        const rows = parseContractCreationRows(obj.data);
        return rows[0] || null;
      }
    }
    if (typeof json.result === "string") {
      if (isNoTxMessage(json.result)) return null;
      continue;
    }
  }
  return null;
}

export async function fetchBscScanAddressSummary(address: string): Promise<BscScanAddressSummary | null> {
  const apiKey = readApiKey();
  if (!apiKey) return null;

  const [txDesc, tokenTxDesc, txAscOne, contractCreation] = await Promise.all([
    fetchList({ address, action: "txlist", sort: "desc", offset: 50 }),
    fetchList({ address, action: "tokentx", sort: "desc", offset: 50 }),
    fetchList({ address, action: "txlist", sort: "asc", offset: 1 }),
    fetchContractCreation(address),
  ]);
  if (!txDesc && !tokenTxDesc && !txAscOne && !contractCreation) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  const cutoff = nowSec - 24 * 3600;

  const txRows = txDesc || [];
  const tokenRows = tokenTxDesc || [];
  const txCount24h = txRows.filter((r) => {
    const ts = parseTsSec(r.timeStamp);
    return typeof ts === "number" && ts >= cutoff;
  }).length;
  const tokenTransferCount24h = tokenRows.filter((r) => {
    const ts = parseTsSec(r.timeStamp);
    return typeof ts === "number" && ts >= cutoff;
  }).length;

  const firstTs = parseTsSec(txAscOne?.[0]?.timeStamp) || parseTsSec(txRows[txRows.length - 1]?.timeStamp);
  const lastTs = parseTsSec(txRows[0]?.timeStamp);
  const creator = String(contractCreation?.contractCreator || "").trim();
  const txHash = String(contractCreation?.txHash || "").trim();

  return {
    txCount24h,
    tokenTransferCount24h,
    firstTxTimeSec: firstTs,
    lastTxTimeSec: lastTs,
    contractCreator: creator || undefined,
    creationTxHash: txHash || undefined,
    isContract: Boolean(creator),
    source: "api",
  };
}

export function isBscScanConfigured(): boolean {
  return Boolean(readApiKey());
}
