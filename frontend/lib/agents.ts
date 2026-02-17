import type { BriefResult } from "./api";
import type { LocaleCode } from "./i18n";

export type AgentVisibility = "private" | "public";
export type AgentRole = "user" | "assistant" | "system";

export interface AgentRecord {
  id: string;
  ownerAddress: string;
  name: string;
  description?: string;
  rules: string;
  visibility: AgentVisibility;
  rentPriceWei: string;
  nfaContract?: string;
  nfaTokenId?: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface AgentMessage {
  id: string;
  role: AgentRole;
  content: string;
  createdAtMs: number;
}

export interface OnchainConfig {
  enabled: boolean;
  chainId: number;
  rpcUrl?: string;
  contract?: string;
  contractName?: string | null;
  contractSymbol?: string | null;
  mintFeeWei?: string | null;
  mintFeeBnb?: string | null;
}

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => null)) as T | null;
  if (!res.ok || !json) {
    const rec = json && typeof json === "object" ? (json as Record<string, unknown>) : null;
    const msg = rec && typeof rec.error === "string" && rec.error ? rec.error : `request_failed_${res.status}`;
    throw new Error(msg);
  }
  return json;
}

export async function listAgents(ownerAddress?: string): Promise<AgentRecord[]> {
  const q = ownerAddress ? `?ownerAddress=${encodeURIComponent(ownerAddress)}&includePublic=1` : "";
  const res = await fetch(`/api/agents${q}`, { cache: "no-store" });
  const json = await parseJson<{ items: AgentRecord[] }>(res);
  return Array.isArray(json.items) ? json.items : [];
}

export async function listPublicAgents(): Promise<AgentRecord[]> {
  const res = await fetch("/api/agents/public", { cache: "no-store" });
  const json = await parseJson<{ items: AgentRecord[] }>(res);
  return Array.isArray(json.items) ? json.items : [];
}

export async function getOnchainConfig(): Promise<OnchainConfig> {
  const res = await fetch("/api/agents/onchain-config", { cache: "no-store" });
  const json = await parseJson<OnchainConfig>(res);
  return json;
}

export async function createAgent(input: {
  ownerAddress: string;
  name: string;
  description?: string;
  rules?: string;
  visibility?: AgentVisibility;
  rentPriceWei?: string;
  nfaContract?: string;
  nfaTokenId?: string;
}): Promise<AgentRecord> {
  const res = await fetch("/api/agents", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ item: AgentRecord }>(res);
  return json.item;
}

export async function updateAgent(id: string, patch: Partial<AgentRecord>): Promise<AgentRecord> {
  const res = await fetch(`/api/agents/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  const json = await parseJson<{ item: AgentRecord }>(res);
  return json.item;
}

export async function getAgentHistory(id: string): Promise<AgentMessage[]> {
  const res = await fetch(`/api/agents/${encodeURIComponent(id)}/history`, { cache: "no-store" });
  const json = await parseJson<{ items: AgentMessage[] }>(res);
  return Array.isArray(json.items) ? json.items : [];
}

export async function importAgentHistory(id: string, args: { mode?: "append" | "replace"; text?: string; messages?: Array<{ role: AgentRole; content: string }> }) {
  const res = await fetch(`/api/agents/${encodeURIComponent(id)}/history/import`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  const json = await parseJson<{ items: AgentMessage[] }>(res);
  return Array.isArray(json.items) ? json.items : [];
}

export async function runAgent(
  id: string,
  args: { query: string; lang?: LocaleCode; saveHistory?: boolean; callerAddress?: string; paymentTxHash?: string }
) {
  const res = await fetch(`/api/agents/${encodeURIComponent(id)}/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  const json = await parseJson<{ agent: AgentRecord; message: string; brief: BriefResult }>(res);
  return json;
}
