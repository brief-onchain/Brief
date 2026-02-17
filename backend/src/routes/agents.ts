import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { isAddress } from "viem";
import { analyzeBrief } from "../services/briefService.js";
import { getAgentStore, type AgentRole } from "../services/agentStore.js";
import { readNfaContractMeta, readNfaOnchainConfig, verifyRentFundingTx } from "../services/nfaOnchain.js";
import { normalizeLocale, pickLocaleText, type Locale, type LocaleTextMap } from "../services/i18n.js";

const CreateAgentBodySchema = z.object({
  ownerAddress: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(240).optional().default(""),
  rules: z.string().trim().max(4000).optional().default(""),
  visibility: z.enum(["private", "public"]).optional().default("private"),
  rentPriceWei: z.string().trim().max(80).optional().default("0"),
  nfaContract: z.string().trim().max(100).optional().default(""),
  nfaTokenId: z.string().trim().max(80).optional().default(""),
});

const UpdateAgentBodySchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  description: z.string().trim().max(240).optional(),
  rules: z.string().trim().max(4000).optional(),
  visibility: z.enum(["private", "public"]).optional(),
  rentPriceWei: z.string().trim().max(80).optional(),
  nfaContract: z.string().trim().max(100).optional(),
  nfaTokenId: z.string().trim().max(80).optional(),
});

const HistoryImportBodySchema = z.object({
  mode: z.enum(["append", "replace"]).optional().default("append"),
  text: z.string().trim().max(120000).optional().default(""),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().trim().max(8000),
      })
    )
    .optional()
    .default([]),
});

const RunAgentBodySchema = z.object({
  query: z.string().trim().min(1).max(4000),
  lang: z
    .string()
    .optional()
    .transform((v) => normalizeLocale(v)),
  saveHistory: z.boolean().optional().default(true),
  callerAddress: z.string().trim().max(100).optional().default(""),
  paymentTxHash: z.string().trim().max(80).optional().default(""),
});

function envStr(key: string): string {
  return String(process.env[key] || "").trim();
}

function 文(lang: Locale, map: LocaleTextMap<string>): string {
  return pickLocaleText(lang, map);
}

async function runAgentNarrative(args: {
  lang: Locale;
  agentName: string;
  agentRules: string;
  query: string;
  brief: {
    riskScore: number;
    tldr: string;
    explanation: string;
    findings: Array<{ text: string }>;
    address: string;
  };
  history: Array<{ role: AgentRole; content: string }>;
}): Promise<string> {
  const apiKey = envStr("OPENROUTER_API_KEY") || envStr("AI_API_KEY");
  const fallback = () => {
    const prefix = args.lang === "zh-CN" || args.lang === "zh-TW" ? `【${args.agentName}】` : `[${args.agentName}]`;
    return `${prefix} ${args.brief.tldr}\n\n${args.brief.explanation}`;
  };
  if (!apiKey) return fallback();

  const model = envStr("OPENROUTER_MODEL_ID") || envStr("AI_MODEL") || "x-ai/grok-4-fast";
  const base = envStr("OPENROUTER_BASE_URL") || "https://openrouter.ai/api/v1";
  const historyText = args.history
    .slice(-8)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n")
    .slice(0, 3000);
  const facts = args.brief.findings.map((x) => `- ${x.text}`).join("\n");
  const promptByLang: Record<Locale, string> = {
    en: [
      "You are an onchain research agent. Generate a concise final answer based on agent rules and brief output.",
      "Keep it actionable and plain language.",
      `Agent: ${args.agentName}`,
      `Rules: ${args.agentRules || "(none)"}`,
      `User input: ${args.query}`,
      `Address: ${args.brief.address}`,
      `Risk score: ${args.brief.riskScore}`,
      `TLDR: ${args.brief.tldr}`,
      `Facts: ${facts}`,
      `History:\n${historyText || "(none)"}`,
    ].join("\n"),
    "zh-CN": [
      "你是链上研究 Agent。请基于给定 agent 规则和简报，输出简洁的最终回答。",
      "要求：中文、可执行、不空话；不要暴露系统内部模块名。",
      `Agent 名称: ${args.agentName}`,
      `Agent 规则: ${args.agentRules || "(无)"}`,
      `用户输入: ${args.query}`,
      `地址: ${args.brief.address}`,
      `风险分: ${args.brief.riskScore}`,
      `简报TLDR: ${args.brief.tldr}`,
      `关键事实: ${facts}`,
      `历史对话(节选):\n${historyText || "(无)"}`,
    ].join("\n"),
    "zh-TW": [
      "你是鏈上研究 Agent。請基於給定 agent 規則和簡報，輸出簡潔的最終回答。",
      "要求：繁體中文、可執行、不空話；不要暴露系統內部模組名。",
      `Agent 名稱: ${args.agentName}`,
      `Agent 規則: ${args.agentRules || "(無)"}`,
      `使用者輸入: ${args.query}`,
      `地址: ${args.brief.address}`,
      `風險分: ${args.brief.riskScore}`,
      `簡報TLDR: ${args.brief.tldr}`,
      `關鍵事實: ${facts}`,
      `歷史對話(節選):\n${historyText || "(無)"}`,
    ].join("\n"),
    ko: [
      "당신은 온체인 리서치 Agent입니다. 주어진 agent 규칙과 브리프를 바탕으로 간결한 최종 답변을 생성하세요.",
      "요구사항: 한국어, 실행 가능한 내용, 군더더기 없는 표현. 내부 모듈명은 노출하지 마세요.",
      `Agent 이름: ${args.agentName}`,
      `Agent 규칙: ${args.agentRules || "(없음)"}`,
      `사용자 입력: ${args.query}`,
      `주소: ${args.brief.address}`,
      `위험 점수: ${args.brief.riskScore}`,
      `브리프 TLDR: ${args.brief.tldr}`,
      `핵심 사실: ${facts}`,
      `대화 이력(요약):\n${historyText || "(없음)"}`,
    ].join("\n"),
  };
  const prompt = promptByLang[args.lang];

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 420,
        messages: [{ role: "user", content: prompt }],
      }),
      cache: "no-store",
      signal: ctrl.signal,
    });
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok || !json) return fallback();
    const first = Array.isArray(json.choices) && json.choices.length ? (json.choices[0] as Record<string, unknown>) : null;
    const msg = first?.message as Record<string, unknown> | undefined;
    const content = typeof msg?.content === "string" ? msg.content.trim() : "";
    return content || fallback();
  } catch {
    return fallback();
  } finally {
    clearTimeout(timer);
  }
}

function safeId(p: unknown): string {
  return String(p || "").trim();
}

function safeWei(v: string | undefined): bigint {
  try {
    return BigInt(String(v || "0").trim() || "0");
  } catch {
    return 0n;
  }
}

function lower(s: string): string {
  return String(s || "").trim().toLowerCase();
}

export async function registerAgentRoutes(app: FastifyInstance) {
  const store = getAgentStore();

  app.get("/api/agents", async (req, reply) => {
    try {
      const q = (req as any).query ?? {};
      const ownerAddress = typeof q.ownerAddress === "string" ? q.ownerAddress : "";
      const includePublic = String(q.includePublic ?? "1") !== "0";
      const list = await store.listAgents({ ownerAddress, includePublic });
      return reply.status(200).send({ items: list });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "agents_list_failed";
      return reply.status(400).send({ error: msg });
    }
  });

  app.get("/api/agents/public", async (_req, reply) => {
    try {
      const list = await store.listPublicAgents();
      return reply.status(200).send({ items: list });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "agents_public_failed";
      return reply.status(400).send({ error: msg });
    }
  });

  app.get("/api/agents/onchain-config", async (_req, reply) => {
    try {
      const cfg = readNfaOnchainConfig();
      if (!cfg.enabled || !cfg.contract) {
        return reply.status(200).send({
          enabled: false,
          chainId: cfg.chainId,
        });
      }
      const meta = await readNfaContractMeta(cfg);
      return reply.status(200).send({
        enabled: true,
        chainId: cfg.chainId,
        rpcUrl: cfg.rpcUrl,
        contract: cfg.contract,
        contractName: meta?.name || null,
        contractSymbol: meta?.symbol || null,
        mintFeeWei: meta?.mintFeeWei || null,
        mintFeeBnb: meta?.mintFeeBnb || null,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "agent_onchain_config_failed";
      return reply.status(400).send({ error: msg });
    }
  });

  app.post("/api/agents", async (req, reply) => {
    try {
      const body = CreateAgentBodySchema.parse((req as any).body ?? {});
      const created = await store.createAgent(body);
      return reply.status(200).send({ item: created });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "agent_create_failed";
      return reply.status(400).send({ error: msg });
    }
  });

  app.get("/api/agents/:id", async (req, reply) => {
    try {
      const id = safeId((req as any).params?.id);
      const item = await store.getAgent(id);
      if (!item) return reply.status(404).send({ error: "agent_not_found" });
      return reply.status(200).send({ item });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "agent_get_failed";
      return reply.status(400).send({ error: msg });
    }
  });

  app.patch("/api/agents/:id", async (req, reply) => {
    try {
      const id = safeId((req as any).params?.id);
      const body = UpdateAgentBodySchema.parse((req as any).body ?? {});
      const item = await store.updateAgent(id, body);
      if (!item) return reply.status(404).send({ error: "agent_not_found" });
      return reply.status(200).send({ item });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "agent_update_failed";
      return reply.status(400).send({ error: msg });
    }
  });

  app.get("/api/agents/:id/history", async (req, reply) => {
    try {
      const id = safeId((req as any).params?.id);
      const item = await store.getAgent(id);
      if (!item) return reply.status(404).send({ error: "agent_not_found" });
      const items = await store.getHistory(id);
      return reply.status(200).send({ items });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "agent_history_get_failed";
      return reply.status(400).send({ error: msg });
    }
  });

  app.post("/api/agents/:id/history/import", async (req, reply) => {
    try {
      const id = safeId((req as any).params?.id);
      const item = await store.getAgent(id);
      if (!item) return reply.status(404).send({ error: "agent_not_found" });
      const body = HistoryImportBodySchema.parse((req as any).body ?? {});
      const fromMessages = body.messages.length > 0 ? (body.mode === "replace" ? store.replaceHistory(id, body.messages) : store.appendHistory(id, body.messages)) : null;
      const fromText = body.text ? store.importHistoryFromText({ agentId: id, text: body.text, mode: body.mode }) : null;
      const items = fromMessages ? await fromMessages : fromText ? await fromText : await store.getHistory(id);
      return reply.status(200).send({ items });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "agent_history_import_failed";
      return reply.status(400).send({ error: msg });
    }
  });

  app.post("/api/agents/:id/run", async (req, reply) => {
    try {
      const id = safeId((req as any).params?.id);
      const item = await store.getAgent(id);
      if (!item) return reply.status(404).send({ error: "agent_not_found" });
      const body = RunAgentBodySchema.parse((req as any).body ?? {});
      const history = await store.getHistory(id);
      const caller = lower(body.callerAddress);
      const owner = lower(item.ownerAddress);
      const rentWei = safeWei(item.rentPriceWei);

      const shouldPayForRun = item.visibility === "public" && rentWei > 0n && caller !== owner;
      const paymentTxHash = String(body.paymentTxHash || "").trim();

      if (shouldPayForRun) {
        if (!caller || !isAddress(caller)) {
          return reply.status(400).send({
            error: 文(body.lang, {
              en: "This public agent requires wallet address for payment verification",
              "zh-CN": "该公开 Agent 需要钱包地址用于付费校验",
              "zh-TW": "該公開 Agent 需要錢包地址用於付費校驗",
              ko: "이 공개 Agent는 결제 검증을 위해 지갑 주소가 필요합니다",
            }),
          });
        }
        if (!item.nfaContract || !item.nfaTokenId) {
          return reply.status(400).send({
            error: 文(body.lang, {
              en: "This public agent is not bound to onchain payment info",
              "zh-CN": "该公开 Agent 未绑定链上收款信息，暂不可调用",
              "zh-TW": "該公開 Agent 未綁定鏈上收款資訊，暫不可調用",
              ko: "이 공개 Agent는 온체인 수납 정보가 연결되지 않아 호출할 수 없습니다",
            }),
          });
        }
        if (!paymentTxHash) {
          return reply.status(400).send({
            error: 文(body.lang, {
              en: "Missing payment transaction hash, please complete onchain payment first",
              "zh-CN": "缺少支付交易哈希，请先完成链上支付",
              "zh-TW": "缺少支付交易哈希，請先完成鏈上支付",
              ko: "결제 트랜잭션 해시가 없습니다. 먼저 온체인 결제를 완료하세요",
            }),
          });
        }
        const used = await store.isPaymentTxUsed(id, paymentTxHash);
        if (used) {
          return reply.status(400).send({
            error: 文(body.lang, {
              en: "This payment transaction has already been used. Please pay again before calling",
              "zh-CN": "该支付交易已被使用，请重新支付后再调用",
              "zh-TW": "該支付交易已被使用，請重新支付後再調用",
              ko: "이 결제 트랜잭션은 이미 사용되었습니다. 다시 결제 후 호출하세요",
            }),
          });
        }
        const verify = await verifyRentFundingTx({
          config: readNfaOnchainConfig(),
          expectedContract: item.nfaContract,
          expectedTokenId: item.nfaTokenId,
          expectedCaller: caller,
          minAmountWei: rentWei.toString(),
          txHash: paymentTxHash,
          lang: body.lang,
        });
        if (!verify.ok) {
          return reply.status(400).send({ error: verify.error });
        }
      }

      const brief = await analyzeBrief({ query: body.query, lang: body.lang });
      const message = await runAgentNarrative({
        lang: body.lang,
        agentName: item.name,
        agentRules: item.rules,
        query: body.query,
        brief: {
          address: brief.address,
          riskScore: brief.riskScore,
          tldr: brief.tldr,
          explanation: brief.explanation,
          findings: brief.findings,
        },
        history: history.map((h) => ({ role: h.role, content: h.content })),
      });

      if (body.saveHistory) {
        await store.appendHistory(id, [
          { role: "user", content: body.query },
          { role: "assistant", content: message },
        ]);
      }
      if (shouldPayForRun && paymentTxHash) {
        await store.markPaymentTxUsed(id, paymentTxHash);
      }

      return reply.status(200).send({
        agent: item,
        message,
        brief,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "agent_run_failed";
      return reply.status(400).send({ error: msg });
    }
  });
}
