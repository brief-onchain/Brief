import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export type AgentVisibility = "private" | "public";
export type AgentRole = "user" | "assistant" | "system";

export type AgentMessage = {
  id: string;
  role: AgentRole;
  content: string;
  createdAtMs: number;
};

export type AgentRecord = {
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
};

type AgentStoreFile = {
  agents: AgentRecord[];
  historyByAgentId: Record<string, AgentMessage[]>;
  usedPaymentTxByAgentId: Record<string, string[]>;
};

type CreateAgentInput = {
  ownerAddress: string;
  name: string;
  description?: string;
  rules?: string;
  visibility?: AgentVisibility;
  rentPriceWei?: string;
  nfaContract?: string;
  nfaTokenId?: string;
};

type UpdateAgentInput = Partial<{
  name: string;
  description: string;
  rules: string;
  visibility: AgentVisibility;
  rentPriceWei: string;
  nfaContract: string;
  nfaTokenId: string;
}>;

function nowMs(): number {
  return Date.now();
}

function envStr(key: string): string {
  return String(process.env[key] || "").trim();
}

function normalizeAddress(s: string): string {
  return String(s || "").trim().toLowerCase();
}

function normalizeWei(v: string | undefined): string {
  const s = String(v || "0").trim();
  return /^\d+$/.test(s) ? s : "0";
}

function defaultNfaContract(): string {
  return envStr("BRIEF_NFA_CONTRACT");
}

function resolveNfaContract(input?: string): string | undefined {
  // If app-level contract is configured, enforce single contract binding everywhere.
  const fixed = defaultNfaContract();
  if (fixed) return fixed;
  const manual = String(input || "").trim();
  return manual || undefined;
}

function withResolvedNfaContract(agent: AgentRecord): AgentRecord {
  const resolved = resolveNfaContract(agent.nfaContract);
  if (resolved === agent.nfaContract) return agent;
  return { ...agent, nfaContract: resolved };
}

function makeId(prefix: string): string {
  const r = crypto.randomBytes(5).toString("hex");
  return `${prefix}_${nowMs().toString(36)}_${r}`;
}

function defaultFilePath(): string {
  const base = envStr("AGENTS_DATA_DIR") || path.resolve(process.cwd(), ".data");
  return path.resolve(base, "agents.store.json");
}

async function ensureDirForFile(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function readStoreFile(filePath: string): Promise<AgentStoreFile> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as AgentStoreFile;
    if (!parsed || typeof parsed !== "object") throw new Error("invalid_store");
    const agents = Array.isArray(parsed.agents) ? parsed.agents : [];
    const historyByAgentId = parsed.historyByAgentId && typeof parsed.historyByAgentId === "object" ? parsed.historyByAgentId : {};
    const usedPaymentTxByAgentId =
      parsed.usedPaymentTxByAgentId && typeof parsed.usedPaymentTxByAgentId === "object" ? parsed.usedPaymentTxByAgentId : {};
    return { agents, historyByAgentId, usedPaymentTxByAgentId };
  } catch {
    return { agents: [], historyByAgentId: {}, usedPaymentTxByAgentId: {} };
  }
}

async function writeStoreFile(filePath: string, data: AgentStoreFile): Promise<void> {
  await ensureDirForFile(filePath);
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, filePath);
}

export class AgentStore {
  private readonly filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || defaultFilePath();
  }

  async listAgents(args?: { ownerAddress?: string; includePublic?: boolean }): Promise<AgentRecord[]> {
    const data = await readStoreFile(this.filePath);
    const owner = normalizeAddress(args?.ownerAddress || "");
    const includePublic = args?.includePublic !== false;
    const out = data.agents.filter((a) => {
      if (!owner) return includePublic ? true : a.visibility !== "public";
      if (a.ownerAddress === owner) return true;
      return includePublic ? a.visibility === "public" : false;
    });
    return out.map(withResolvedNfaContract).sort((a, b) => b.updatedAtMs - a.updatedAtMs);
  }

  async listPublicAgents(): Promise<AgentRecord[]> {
    const data = await readStoreFile(this.filePath);
    return data.agents.filter((a) => a.visibility === "public").map(withResolvedNfaContract).sort((a, b) => b.updatedAtMs - a.updatedAtMs);
  }

  async getAgent(id: string): Promise<AgentRecord | null> {
    const data = await readStoreFile(this.filePath);
    const found = data.agents.find((a) => a.id === id) || null;
    return found ? withResolvedNfaContract(found) : null;
  }

  async createAgent(input: CreateAgentInput): Promise<AgentRecord> {
    const data = await readStoreFile(this.filePath);
    const ts = nowMs();
    const agent: AgentRecord = {
      id: makeId("agent"),
      ownerAddress: normalizeAddress(input.ownerAddress),
      name: String(input.name || "").trim().slice(0, 60),
      description: String(input.description || "").trim().slice(0, 240) || undefined,
      rules: String(input.rules || "").trim().slice(0, 4000),
      visibility: input.visibility === "public" ? "public" : "private",
      rentPriceWei: normalizeWei(input.rentPriceWei),
      nfaContract: resolveNfaContract(input.nfaContract),
      nfaTokenId: String(input.nfaTokenId || "").trim() || undefined,
      createdAtMs: ts,
      updatedAtMs: ts,
    };
    data.agents.push(agent);
    await writeStoreFile(this.filePath, data);
    return agent;
  }

  async updateAgent(id: string, input: UpdateAgentInput): Promise<AgentRecord | null> {
    const data = await readStoreFile(this.filePath);
    const idx = data.agents.findIndex((a) => a.id === id);
    if (idx < 0) return null;
    const cur = data.agents[idx];
    const fixedNfaContract = defaultNfaContract();
    const next: AgentRecord = {
      ...cur,
      ...(input.name !== undefined ? { name: String(input.name || "").trim().slice(0, 60) || cur.name } : {}),
      ...(input.description !== undefined ? { description: String(input.description || "").trim().slice(0, 240) || undefined } : {}),
      ...(input.rules !== undefined ? { rules: String(input.rules || "").trim().slice(0, 4000) } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
      ...(input.rentPriceWei !== undefined ? { rentPriceWei: normalizeWei(input.rentPriceWei) } : {}),
      ...(fixedNfaContract
        ? { nfaContract: fixedNfaContract }
        : input.nfaContract !== undefined
          ? { nfaContract: resolveNfaContract(input.nfaContract) }
          : {}),
      ...(input.nfaTokenId !== undefined ? { nfaTokenId: String(input.nfaTokenId || "").trim() || undefined } : {}),
      updatedAtMs: nowMs(),
    };
    data.agents[idx] = next;
    await writeStoreFile(this.filePath, data);
    return next;
  }

  async getHistory(agentId: string): Promise<AgentMessage[]> {
    const data = await readStoreFile(this.filePath);
    const arr = Array.isArray(data.historyByAgentId[agentId]) ? data.historyByAgentId[agentId] : [];
    return arr.slice(-200);
  }

  async appendHistory(agentId: string, messages: Array<Pick<AgentMessage, "role" | "content">>): Promise<AgentMessage[]> {
    const data = await readStoreFile(this.filePath);
    const prev = Array.isArray(data.historyByAgentId[agentId]) ? data.historyByAgentId[agentId] : [];
    const clean = messages
      .map((m) => ({
        id: makeId("msg"),
        role: m.role,
        content: String(m.content || "").trim().slice(0, 8000),
        createdAtMs: nowMs(),
      }))
      .filter((m) => m.content);
    const next = [...prev, ...clean].slice(-400);
    data.historyByAgentId[agentId] = next;
    const idx = data.agents.findIndex((a) => a.id === agentId);
    if (idx >= 0) data.agents[idx].updatedAtMs = nowMs();
    await writeStoreFile(this.filePath, data);
    return next;
  }

  async replaceHistory(agentId: string, messages: Array<Pick<AgentMessage, "role" | "content">>): Promise<AgentMessage[]> {
    const data = await readStoreFile(this.filePath);
    const next = messages
      .map((m) => ({
        id: makeId("msg"),
        role: m.role,
        content: String(m.content || "").trim().slice(0, 8000),
        createdAtMs: nowMs(),
      }))
      .filter((m) => m.content)
      .slice(-400);
    data.historyByAgentId[agentId] = next;
    const idx = data.agents.findIndex((a) => a.id === agentId);
    if (idx >= 0) data.agents[idx].updatedAtMs = nowMs();
    await writeStoreFile(this.filePath, data);
    return next;
  }

  async importHistoryFromText(args: { agentId: string; text: string; mode?: "append" | "replace" }): Promise<AgentMessage[]> {
    const lines = String(args.text || "")
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(-200);
    const parsed: Array<Pick<AgentMessage, "role" | "content">> = lines.map((line) => {
      const lower = line.toLowerCase();
      if (lower.startsWith("assistant:") || lower.startsWith("ai:")) {
        return { role: "assistant", content: line.replace(/^[^:]+:\s*/, "") };
      }
      if (lower.startsWith("system:")) {
        return { role: "system", content: line.replace(/^[^:]+:\s*/, "") };
      }
      return { role: "user", content: line.replace(/^[^:]+:\s*/, "") };
    });
    if (args.mode === "replace") return this.replaceHistory(args.agentId, parsed);
    return this.appendHistory(args.agentId, parsed);
  }

  async isPaymentTxUsed(agentId: string, txHash: string): Promise<boolean> {
    const data = await readStoreFile(this.filePath);
    const normalized = String(txHash || "").trim().toLowerCase();
    if (!normalized) return false;
    const items = Array.isArray(data.usedPaymentTxByAgentId[agentId]) ? data.usedPaymentTxByAgentId[agentId] : [];
    return items.includes(normalized);
  }

  async markPaymentTxUsed(agentId: string, txHash: string): Promise<void> {
    const data = await readStoreFile(this.filePath);
    const normalized = String(txHash || "").trim().toLowerCase();
    if (!normalized) return;
    const prev = Array.isArray(data.usedPaymentTxByAgentId[agentId]) ? data.usedPaymentTxByAgentId[agentId] : [];
    if (prev.includes(normalized)) return;
    data.usedPaymentTxByAgentId[agentId] = [...prev, normalized].slice(-1000);
    await writeStoreFile(this.filePath, data);
  }
}

let singleton: AgentStore | null = null;
export function getAgentStore(): AgentStore {
  if (!singleton) singleton = new AgentStore();
  return singleton;
}
