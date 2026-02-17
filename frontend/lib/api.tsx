import { type LocaleCode } from "./i18n";

export interface BriefResult {
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
}

export interface Finding {
  type: "critical" | "warning" | "info" | "success";
  text: string;
}

export interface Evidence {
  label: string;
  url: string;
  value?: string;
}

export async function analyzeAddress(input: string, lang: LocaleCode): Promise<BriefResult> {
  const res = await fetch("/api/brief", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: input, lang }),
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      json &&
      typeof json === "object" &&
      "error" in json &&
      typeof (json as { error?: unknown }).error === "string"
        ? ((json as { error: string }).error || `request_failed_${res.status}`)
        : `request_failed_${res.status}`;
    throw new Error(msg);
  }
  if (!json || typeof json !== "object") {
    throw new Error("invalid_response_payload");
  }
  return json as BriefResult;
}
