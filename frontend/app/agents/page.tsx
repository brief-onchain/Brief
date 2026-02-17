"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { formatEther, parseEther } from "viem";
import { Bot, FileUp, Loader2, ShieldCheck, Wallet, Wrench } from "lucide-react";
import {
  createAgent,
  getOnchainConfig,
  getAgentHistory,
  importAgentHistory,
  listAgents,
  listPublicAgents,
  runAgent,
  updateAgent,
  type AgentMessage,
  type OnchainConfig,
  type AgentRecord,
  type AgentVisibility,
} from "@/lib/agents";
import type { BriefResult } from "@/lib/api";
import { createOnchainAgent, fundOnchainAgent, payAgentRent, withdrawOnchainAgent } from "@/lib/nfaOnchain";
import { LanguageSwitch } from "@/components/i18n/LanguageSwitch";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { pickLocale, toIntlLocale, type LocaleCode, type LocaleTextMap } from "@/lib/i18n";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
    };
  }
}

const 游客标识 = "guest-local";

function 短地址(a: string): string {
  const s = String(a || "").trim();
  if (!s) return "-";
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function 时间文本(ms: number, locale: LocaleCode): string {
  if (!Number.isFinite(ms) || ms <= 0) return "-";
  return new Date(ms).toLocaleString(toIntlLocale(locale), { hour12: false });
}

function 可见性文本(v: AgentVisibility, locale: LocaleCode): string {
  return v === "public"
    ? pickLocale(locale, { en: "Public", "zh-CN": "公开", "zh-TW": "公開", ko: "공개" })
    : pickLocale(locale, { en: "Private", "zh-CN": "仅自己", "zh-TW": "僅自己", ko: "비공개" });
}

function 角色文本(role: AgentMessage["role"], locale: LocaleCode): string {
  if (role === "assistant") return pickLocale(locale, { en: "Assistant", "zh-CN": "助手", "zh-TW": "助手", ko: "어시스턴트" });
  if (role === "system") return pickLocale(locale, { en: "System", "zh-CN": "系统", "zh-TW": "系統", ko: "시스템" });
  return pickLocale(locale, { en: "User", "zh-CN": "用户", "zh-TW": "使用者", ko: "사용자" });
}

function 安全转Wei(v: string, locale: LocaleCode): string {
  try {
    const s = String(v || "0").trim() || "0";
    return parseEther(s).toString();
  } catch {
    throw new Error(
      pickLocale(locale, {
        en: "Invalid amount format, expected like 0.001",
        "zh-CN": "金额格式无效，请输入如 0.001",
        "zh-TW": "金額格式無效，請輸入如 0.001",
        ko: "금액 형식이 올바르지 않습니다. 0.001 형식으로 입력하세요.",
      })
    );
  }
}

function 安全转Bnb(v: string | undefined): string {
  try {
    return formatEther(BigInt(String(v || "0").trim() || "0"));
  } catch {
    return "0";
  }
}

function 是否大于零(v: string | undefined): boolean {
  try {
    return BigInt(String(v || "0").trim() || "0") > 0n;
  } catch {
    return false;
  }
}

function 租金文本(v: string | undefined, locale: LocaleCode): string {
  return 是否大于零(v)
    ? `${安全转Bnb(v)} BNB/${pickLocale(locale, { en: "run", "zh-CN": "次", "zh-TW": "次", ko: "회" })}`
    : pickLocale(locale, { en: "Free", "zh-CN": "免费", "zh-TW": "免費", ko: "무료" });
}

export default function AgentsPage() {
  const rootRef = useRef<HTMLElement>(null);
  const { locale } = useLocale();
  const 文 = <T,>(map: LocaleTextMap<T>) => pickLocale(locale, map);

  const 默认名称 = 文({ en: "Standard Analyst", "zh-CN": "标准分析助手", "zh-TW": "標準分析助手", ko: "기본 분석 에이전트" });
  const 默认描述 = 文({ en: "Prioritizes concise conclusions with evidence", "zh-CN": "偏向快速给结论和证据", "zh-TW": "偏向快速給結論與證據", ko: "빠른 결론과 증거를 우선합니다" });
  const 默认规则 = 文({
    en: "Give conclusion first, then 3 key evidence points; avoid jargon and keep it user-friendly.",
    "zh-CN": "先给结论，再给3条关键证据；避免术语堆砌，面向普通用户。",
    "zh-TW": "先給結論，再給3條關鍵證據；避免術語堆砌，面向普通用戶。",
    ko: "결론을 먼저 제시하고 핵심 증거 3개를 제시하세요. 전문용어를 줄이고 일반 사용자 친화적으로 작성하세요.",
  });

  const [钱包地址, set钱包地址] = useState("");
  const [我的助手, set我的助手] = useState<AgentRecord[]>([]);
  const [公开助手, set公开助手] = useState<AgentRecord[]>([]);
  const [选中助手ID, set选中助手ID] = useState("");

  const [草稿名称, set草稿名称] = useState(默认名称);
  const [草稿描述, set草稿描述] = useState(默认描述);
  const [草稿规则, set草稿规则] = useState(默认规则);
  const [草稿租金Bnb, set草稿租金Bnb] = useState("0");
  const [草稿可见性, set草稿可见性] = useState<AgentVisibility>("private");

  const [输入问题, set输入问题] = useState("");
  const [输出文本, set输出文本] = useState("");
  const [输出简报, set输出简报] = useState<BriefResult | null>(null);
  const [历史记录, set历史记录] = useState<AgentMessage[]>([]);
  const [导入文本, set导入文本] = useState("");

  const [忙碌状态, set忙碌状态] = useState("");
  const [错误文本, set错误文本] = useState("");
  const [链上配置, set链上配置] = useState<OnchainConfig>({ enabled: false, chainId: 56 });
  const [充值金额Bnb, set充值金额Bnb] = useState("0.001");
  const [提取金额Bnb, set提取金额Bnb] = useState("0.0005");

  const 当前拥有者 = useMemo(() => (钱包地址 || 游客标识).toLowerCase(), [钱包地址]);
  const 选中助手 = useMemo(() => [...我的助手, ...公开助手].find((a) => a.id === 选中助手ID) || null, [我的助手, 公开助手, 选中助手ID]);

  useGSAP(
    () => {
      if (!rootRef.current) return;
      gsap.fromTo(
        rootRef.current.querySelectorAll("[data-块]"),
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power2.out", stagger: 0.06 }
      );
      gsap.to("[data-光球-a]", { x: 20, y: -12, duration: 8, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.to("[data-光球-b]", { x: -16, y: 14, duration: 9, repeat: -1, yoyo: true, ease: "sine.inOut" });
    },
    { scope: rootRef }
  );

  async function 刷新助手(owner = 当前拥有者) {
    const [mine, pub] = await Promise.all([listAgents(owner), listPublicAgents()]);
    const owned = mine.filter((a) => a.ownerAddress === owner.toLowerCase());
    set我的助手(owned);
    set公开助手(pub);
    const 仍然存在 = [...owned, ...pub].some((a) => a.id === 选中助手ID);
    if (!仍然存在) set选中助手ID(owned[0]?.id || pub[0]?.id || "");
  }

  useEffect(() => {
    刷新助手(当前拥有者).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [当前拥有者]);

  useEffect(() => {
    getOnchainConfig()
      .then((cfg) => set链上配置(cfg))
      .catch(() => set链上配置({ enabled: false, chainId: 56 }));
  }, []);

  useEffect(() => {
    if (!选中助手ID) {
      set历史记录([]);
      return;
    }
    getAgentHistory(选中助手ID)
      .then(set历史记录)
      .catch(() => set历史记录([]));
  }, [选中助手ID]);

  useEffect(() => {
    if (!选中助手) return;
    set草稿名称(选中助手.name || 默认名称);
    set草稿描述(选中助手.description || 默认描述);
    set草稿规则(选中助手.rules || 默认规则);
    set草稿租金Bnb(安全转Bnb(选中助手.rentPriceWei));
    set草稿可见性(选中助手.visibility || "private");
  }, [选中助手, 默认名称, 默认描述, 默认规则]);

  async function 连接钱包() {
    try {
      set错误文本("");
      set忙碌状态("钱包");
      if (!window.ethereum) throw new Error(文({ en: "Wallet not detected", "zh-CN": "未检测到钱包", "zh-TW": "未檢測到錢包", ko: "지갑이 감지되지 않았습니다" }));
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      const addr = String(accounts?.[0] || "").toLowerCase();
      if (!addr) throw new Error(文({ en: "Failed to get wallet address", "zh-CN": "未获取到钱包地址", "zh-TW": "未取得錢包地址", ko: "지갑 주소를 가져오지 못했습니다" }));
      set钱包地址(addr);
      await 刷新助手(addr);
    } catch (e) {
      set错误文本(e instanceof Error ? e.message : 文({ en: "Wallet connection failed", "zh-CN": "钱包连接失败", "zh-TW": "錢包連接失敗", ko: "지갑 연결 실패" }));
    } finally {
      set忙碌状态("");
    }
  }

  async function 确保可运行助手(): Promise<string> {
    if (选中助手) return 选中助手.id;
    if (我的助手.length) {
      const id = 我的助手[0].id;
      set选中助手ID(id);
      return id;
    }
    const created = await createAgent({
      ownerAddress: 当前拥有者,
      name: 默认名称,
      description: 默认描述,
      rules: 默认规则,
      visibility: "private",
      rentPriceWei: "0",
    });
    await 刷新助手(当前拥有者);
    set选中助手ID(created.id);
    return created.id;
  }

  async function 新建助手() {
    try {
      set错误文本("");
      set忙碌状态("新建");
      const rentPriceWei = 安全转Wei(草稿租金Bnb, locale);
      const created = await createAgent({
        ownerAddress: 当前拥有者,
        name: 草稿名称 || 默认名称,
        description: 草稿描述,
        rules: 草稿规则 || 默认规则,
        visibility: 草稿可见性,
        rentPriceWei,
      });
      await 刷新助手(当前拥有者);
      set选中助手ID(created.id);
    } catch (e) {
      set错误文本(e instanceof Error ? e.message : 文({ en: "Create failed", "zh-CN": "新建失败", "zh-TW": "建立失敗", ko: "생성 실패" }));
    } finally {
      set忙碌状态("");
    }
  }

  async function 保存助手() {
    if (!选中助手) return;
    if (选中助手.ownerAddress !== 当前拥有者) {
      set错误文本(文({ en: "You can only edit your own agents", "zh-CN": "只能编辑自己创建的助手", "zh-TW": "只能編輯自己建立的助手", ko: "본인이 만든 에이전트만 수정할 수 있습니다" }));
      return;
    }
    try {
      set错误文本("");
      set忙碌状态("保存");
      const rentPriceWei = 安全转Wei(草稿租金Bnb, locale);
      const updated = await updateAgent(选中助手.id, {
        name: 草稿名称,
        description: 草稿描述,
        rules: 草稿规则,
        visibility: 草稿可见性,
        rentPriceWei,
      });
      await 刷新助手(当前拥有者);
      set选中助手ID(updated.id);
    } catch (e) {
      set错误文本(e instanceof Error ? e.message : 文({ en: "Save failed", "zh-CN": "保存失败", "zh-TW": "儲存失敗", ko: "저장 실패" }));
    } finally {
      set忙碌状态("");
    }
  }

  async function 运行分析() {
    if (!输入问题.trim()) return;
    try {
      set错误文本("");
      const 助手ID = await 确保可运行助手();
      const 当前助手 = [...我的助手, ...公开助手].find((a) => a.id === 助手ID) || null;
      const 需要支付 = Boolean(当前助手) && 当前助手?.visibility === "public" && 是否大于零(当前助手?.rentPriceWei) && 当前助手?.ownerAddress !== 当前拥有者;

      let paymentTxHash = "";
      if (需要支付) {
        if (!钱包地址) throw new Error(文({ en: "This public agent is paid. Connect wallet first.", "zh-CN": "该公开助手需要付费调用，请先连接钱包", "zh-TW": "該公開助手需要付費調用，請先連接錢包", ko: "이 공개 에이전트는 유료입니다. 먼저 지갑을 연결하세요." }));
        if (!当前助手?.nfaContract || !当前助手.nfaTokenId) throw new Error(文({ en: "This public agent is not bound to onchain payment info.", "zh-CN": "该公开助手未绑定链上收款信息，暂不可调用", "zh-TW": "該公開助手未綁定鏈上收款資訊，暫不可調用", ko: "이 공개 에이전트는 온체인 수납 정보가 연결되지 않았습니다." }));
        set忙碌状态("支付");
        const paid = await payAgentRent({
          contract: 当前助手.nfaContract,
          tokenId: 当前助手.nfaTokenId,
          amountWei: String(当前助手.rentPriceWei || "0"),
          chainId: Number(链上配置.chainId || 56),
          rpcUrl: 链上配置.rpcUrl,
          locale,
        });
        paymentTxHash = paid.txHash;
      }

      set忙碌状态("运行");
      const out = await runAgent(助手ID, {
        query: 输入问题.trim(),
        lang: locale,
        saveHistory: true,
        callerAddress: 钱包地址 || "",
        paymentTxHash,
      });
      set输出文本(out.message || "");
      set输出简报(out.brief || null);
      set输入问题("");
      const items = await getAgentHistory(助手ID);
      set历史记录(items);
    } catch (e) {
      set错误文本(e instanceof Error ? e.message : 文({ en: "Run failed", "zh-CN": "运行失败", "zh-TW": "執行失敗", ko: "실행 실패" }));
    } finally {
      set忙碌状态("");
    }
  }

  async function 上链创建助手() {
    if (!选中助手) return;
    if (选中助手.ownerAddress !== 当前拥有者) {
      set错误文本(文({ en: "You can only create onchain binding for your own agent", "zh-CN": "只能为自己的助手创建链上绑定", "zh-TW": "只能為自己的助手建立鏈上綁定", ko: "본인 에이전트만 온체인 바인딩을 생성할 수 있습니다" }));
      return;
    }
    if (!钱包地址) {
      set错误文本(文({ en: "Connect wallet first", "zh-CN": "请先连接钱包", "zh-TW": "請先連接錢包", ko: "먼저 지갑을 연결하세요" }));
      return;
    }
    if (!链上配置.enabled || !链上配置.contract) {
      set错误文本(文({ en: "Backend onchain contract is not configured", "zh-CN": "后台未配置链上合约地址", "zh-TW": "後端未配置鏈上合約地址", ko: "백엔드 온체인 컨트랙트가 설정되지 않았습니다" }));
      return;
    }
    try {
      set错误文本("");
      set忙碌状态("上链创建");
      const res = await createOnchainAgent({
        contract: 链上配置.contract,
        chainId: Number(链上配置.chainId || 56),
        rpcUrl: 链上配置.rpcUrl,
        metadataURI: `brief://agent/${选中助手.id}`,
        locale,
      });
      if (!res.tokenId) throw new Error(文({ en: "tokenId not parsed, please retry later", "zh-CN": "未解析到链上 tokenId，请稍后重试", "zh-TW": "未解析到鏈上 tokenId，請稍後重試", ko: "온체인 tokenId를 파싱하지 못했습니다. 잠시 후 다시 시도하세요" }));
      await updateAgent(选中助手.id, {
        nfaContract: 链上配置.contract,
        nfaTokenId: res.tokenId,
      });
      await 刷新助手(当前拥有者);
      set输出文本(
        文({
          en: `Onchain Agent created: Token #${res.tokenId}\nTx: ${res.txHash}`,
          "zh-CN": `链上 Agent 创建成功：Token #${res.tokenId}\n交易哈希：${res.txHash}`,
          "zh-TW": `鏈上 Agent 建立成功：Token #${res.tokenId}\n交易哈希：${res.txHash}`,
          ko: `온체인 Agent 생성 성공: Token #${res.tokenId}\n트랜잭션 해시: ${res.txHash}`,
        })
      );
    } catch (e) {
      set错误文本(e instanceof Error ? e.message : 文({ en: "Onchain create failed", "zh-CN": "链上创建失败", "zh-TW": "鏈上建立失敗", ko: "온체인 생성 실패" }));
    } finally {
      set忙碌状态("");
    }
  }

  async function 给助手充值() {
    if (!选中助手) return;
    if (!选中助手.nfaContract || !选中助手.nfaTokenId) {
      set错误文本(文({ en: "Current agent is not bound to onchain token", "zh-CN": "当前助手未绑定链上 token，无法充值", "zh-TW": "當前助手未綁定鏈上 token，無法充值", ko: "현재 에이전트가 온체인 token에 바인딩되지 않아 충전할 수 없습니다" }));
      return;
    }
    try {
      set错误文本("");
      set忙碌状态("充值");
      const res = await fundOnchainAgent({
        contract: 选中助手.nfaContract,
        tokenId: 选中助手.nfaTokenId,
        amountWei: 安全转Wei(充值金额Bnb, locale),
        chainId: Number(链上配置.chainId || 56),
        rpcUrl: 链上配置.rpcUrl,
        locale,
      });
      set输出文本(
        文({
          en: `Funded: ${充值金额Bnb} BNB\nTx: ${res.txHash}`,
          "zh-CN": `充值成功：${充值金额Bnb} BNB\n交易哈希：${res.txHash}`,
          "zh-TW": `充值成功：${充值金额Bnb} BNB\n交易哈希：${res.txHash}`,
          ko: `충전 성공: ${充值金额Bnb} BNB\n트랜잭션 해시: ${res.txHash}`,
        })
      );
    } catch (e) {
      set错误文本(e instanceof Error ? e.message : 文({ en: "Funding failed", "zh-CN": "充值失败", "zh-TW": "充值失敗", ko: "충전 실패" }));
    } finally {
      set忙碌状态("");
    }
  }

  async function 从助手提取() {
    if (!选中助手) return;
    if (选中助手.ownerAddress !== 当前拥有者) {
      set错误文本(文({ en: "You can only withdraw from your own agent", "zh-CN": "只能从自己的助手提取", "zh-TW": "只能從自己的助手提取", ko: "본인 에이전트에서만 출금할 수 있습니다" }));
      return;
    }
    if (!选中助手.nfaContract || !选中助手.nfaTokenId) {
      set错误文本(文({ en: "Current agent is not bound to onchain token", "zh-CN": "当前助手未绑定链上 token，无法提取", "zh-TW": "當前助手未綁定鏈上 token，無法提取", ko: "현재 에이전트가 온체인 token에 바인딩되지 않아 출금할 수 없습니다" }));
      return;
    }
    try {
      set错误文本("");
      set忙碌状态("提取");
      const res = await withdrawOnchainAgent({
        contract: 选中助手.nfaContract,
        tokenId: 选中助手.nfaTokenId,
        amountWei: 安全转Wei(提取金额Bnb, locale),
        chainId: Number(链上配置.chainId || 56),
        rpcUrl: 链上配置.rpcUrl,
        locale,
      });
      set输出文本(
        文({
          en: `Withdrawn: ${提取金额Bnb} BNB\nTx: ${res.txHash}`,
          "zh-CN": `提取成功：${提取金额Bnb} BNB\n交易哈希：${res.txHash}`,
          "zh-TW": `提取成功：${提取金额Bnb} BNB\n交易哈希：${res.txHash}`,
          ko: `출금 성공: ${提取金额Bnb} BNB\n트랜잭션 해시: ${res.txHash}`,
        })
      );
    } catch (e) {
      set错误文本(e instanceof Error ? e.message : 文({ en: "Withdraw failed", "zh-CN": "提取失败", "zh-TW": "提取失敗", ko: "출금 실패" }));
    } finally {
      set忙碌状态("");
    }
  }

  async function 导入历史(mode: "append" | "replace") {
    if (!选中助手) return;
    try {
      set忙碌状态("导入");
      set错误文本("");
      const items = await importAgentHistory(选中助手.id, { mode, text: 导入文本 });
      set历史记录(items);
      set导入文本("");
    } catch (e) {
      set错误文本(e instanceof Error ? e.message : 文({ en: "Import failed", "zh-CN": "导入失败", "zh-TW": "導入失敗", ko: "가져오기 실패" }));
    } finally {
      set忙碌状态("");
    }
  }

  return (
    <main ref={rootRef} className="brief-bg min-h-screen p-4 md:p-10 text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
        <div data-光球-a className="absolute -left-24 top-20 h-80 w-80 rounded-full bg-primary/16 blur-3xl" />
        <div data-光球-b className="absolute -right-24 bottom-16 h-96 w-96 rounded-full bg-secondary/15 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl space-y-5">
        <section data-块 className="rounded-2xl border border-white/10 bg-black/25 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 border border-primary/35">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{文({ en: "Research Studio (Lite)", "zh-CN": "智能研究台（极简）", "zh-TW": "智能研究台（極簡）", ko: "리서치 스튜디오 (라이트)" })}</h1>
                <p className="text-sm text-white/60">{文({ en: "One input, one clear answer. Guest mode works out of the box.", "zh-CN": "默认只做一件事：输入一次，直接输出结论。游客模式可直接用。", "zh-TW": "預設只做一件事：輸入一次，直接輸出結論。訪客模式可直接用。", ko: "한 번 입력하면 바로 결론을 출력합니다. 게스트 모드로도 바로 사용 가능합니다." })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitch />
              <Link href="/" className="rounded-full border border-white/20 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10">
                {文({ en: "Home", "zh-CN": "返回首页", "zh-TW": "返回首頁", ko: "홈" })}
              </Link>
              <Link href="/guide" className="rounded-full border border-primary/25 px-3 py-1.5 text-sm text-primary/90 hover:bg-primary/10">
                {文({ en: "Guide", "zh-CN": "新手玩法说明", "zh-TW": "新手玩法說明", ko: "가이드" })}
              </Link>
              <button
                onClick={连接钱包}
                className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/15 px-4 py-1.5 text-sm text-primary hover:bg-primary/22"
              >
                {忙碌状态 === "钱包" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                {钱包地址 ? 短地址(钱包地址) : 文({ en: "Connect Wallet", "zh-CN": "连接钱包", "zh-TW": "連接錢包", ko: "지갑 연결" })}
              </button>
            </div>
          </div>
        </section>

        <section data-块 className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="text-xs uppercase tracking-wider text-white/60">{文({ en: "Current Agent", "zh-CN": "当前助手", "zh-TW": "當前助手", ko: "현재 에이전트" })}</div>
            <select value={选中助手ID} onChange={(e) => set选中助手ID(e.target.value)} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm">
              {!我的助手.length && !公开助手.length ? <option value="">{文({ en: "Default agent will be auto-created", "zh-CN": "将自动创建默认助手", "zh-TW": "將自動建立預設助手", ko: "기본 에이전트가 자동 생성됩니다" })}</option> : null}
              {我的助手.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}（{文({ en: "Mine", "zh-CN": "我的", "zh-TW": "我的", ko: "내 것" })}）
                </option>
              ))}
              {公开助手.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}（{文({ en: "Public", "zh-CN": "公开", "zh-TW": "公開", ko: "공개" })}）
                </option>
              ))}
            </select>
            <span className="text-xs text-white/45">{文({ en: "Guest mode works without wallet connection.", "zh-CN": "未连钱包时使用游客助手，不影响分析。", "zh-TW": "未連錢包時使用訪客助手，不影響分析。", ko: "지갑 미연결 상태에서도 게스트 에이전트로 분석할 수 있습니다." })}</span>
            {选中助手 && 选中助手.visibility === "public" && 是否大于零(选中助手.rentPriceWei) && 选中助手.ownerAddress !== 当前拥有者 ? (
              <span className="text-xs text-amber-200">{文({ en: `This public agent charges per run: ${租金文本(选中助手.rentPriceWei, locale)} (payment starts automatically before run)`, "zh-CN": `该公开助手按次收费：${租金文本(选中助手.rentPriceWei, locale)}（运行前会自动发起支付）`, "zh-TW": `該公開助手按次收費：${租金文本(选中助手.rentPriceWei, locale)}（執行前會自動發起支付）`, ko: `이 공개 에이전트는 실행당 과금됩니다: ${租金文本(选中助手.rentPriceWei, locale)} (실행 전 자동 결제)` })}</span>
            ) : null}
          </div>
          <div className="flex gap-2">
            <input
              value={输入问题}
              onChange={(e) => set输入问题(e.target.value)}
              placeholder={文({ en: "Enter address, token contract, or a question with address", "zh-CN": "输入地址、代币合约，或带地址的问题", "zh-TW": "輸入地址、代幣合約，或帶地址的問題", ko: "주소, 토큰 컨트랙트 또는 주소가 포함된 질문을 입력하세요" })}
              className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm"
            />
            <button onClick={运行分析} disabled={!输入问题.trim() || Boolean(忙碌状态)} className="rounded-xl border border-primary/35 bg-primary/15 px-5 py-3 text-sm text-primary disabled:opacity-50">
              {忙碌状态 === "支付"
                ? 文({ en: "Paying...", "zh-CN": "支付中...", "zh-TW": "支付中...", ko: "결제 중..." })
                : 忙碌状态 === "运行"
                  ? 文({ en: "Running...", "zh-CN": "分析中...", "zh-TW": "分析中...", ko: "분석 중..." })
                  : 文({ en: "Analyze", "zh-CN": "开始分析", "zh-TW": "開始分析", ko: "분석 시작" })}
            </button>
          </div>
        </section>

        {输出文本 || 输出简报 ? (
          <section data-块 className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
            <div className="mb-2 text-xs uppercase tracking-wider text-primary/80">{文({ en: "Result", "zh-CN": "分析结果", "zh-TW": "分析結果", ko: "분석 결과" })}</div>
            {输出文本 ? <div className="whitespace-pre-wrap text-sm text-white/90">{输出文本}</div> : null}
            {输出简报 ? (
              <div className="mt-3 rounded-lg border border-white/10 bg-black/35 p-3 text-sm text-white/85">
                <div className="font-medium">{文({ en: "Conclusion", "zh-CN": "结论", "zh-TW": "結論", ko: "결론" })}：{输出简报.tldr}</div>
                <div className="mt-1 text-white/70">{文({ en: "Address", "zh-CN": "地址", "zh-TW": "地址", ko: "주소" })}：{输出简报.address}</div>
                <div className="text-white/70">{文({ en: "Risk Score", "zh-CN": "风险分", "zh-TW": "風險分", ko: "위험 점수" })}：{输出简报.riskScore}</div>
              </div>
            ) : null}
          </section>
        ) : null}

        <section data-块 className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-wider text-white/60">
            <ShieldCheck className="h-3.5 w-3.5" />
            {文({ en: "History", "zh-CN": "历史记录", "zh-TW": "歷史記錄", ko: "기록" })}
          </div>
          <div className="max-h-72 space-y-2 overflow-auto rounded-lg border border-white/10 bg-black/25 p-2">
            {历史记录.map((m) => (
              <div key={m.id} className="rounded-md border border-white/10 bg-black/25 px-2 py-1.5 text-sm">
                <div className="mb-1 text-[11px] uppercase text-white/45">
                  {角色文本(m.role, locale)} · {时间文本(m.createdAtMs, locale)}
                </div>
                <div className="whitespace-pre-wrap text-white/85">{m.content}</div>
              </div>
            ))}
            {!历史记录.length ? <div className="text-xs text-white/45">{文({ en: "No history yet.", "zh-CN": "暂无历史。", "zh-TW": "暫無歷史。", ko: "아직 기록이 없습니다." })}</div> : null}
          </div>
        </section>

        <section data-块 className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-2 text-xs uppercase tracking-wider text-white/60">{文({ en: "My Agents (Optional)", "zh-CN": "我的助手（可选）", "zh-TW": "我的助手（可選）", ko: "내 에이전트 (선택)" })}</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input value={草稿名称} onChange={(e) => set草稿名称(e.target.value)} placeholder={文({ en: "Agent Name", "zh-CN": "助手名称", "zh-TW": "助手名稱", ko: "에이전트 이름" })} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm" />
            <input value={草稿描述} onChange={(e) => set草稿描述(e.target.value)} placeholder={文({ en: "One-line Description", "zh-CN": "一句话描述", "zh-TW": "一句話描述", ko: "한 줄 설명" })} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm" />
            <input value={草稿租金Bnb} onChange={(e) => set草稿租金Bnb(e.target.value)} placeholder={文({ en: "Run Rent (BNB, e.g. 0.001)", "zh-CN": "调用租金(BNB，如 0.001)", "zh-TW": "調用租金(BNB，如 0.001)", ko: "실행 요금(BNB, 예: 0.001)" })} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm" />
          </div>
          <textarea value={草稿规则} onChange={(e) => set草稿规则(e.target.value)} rows={3} placeholder={文({ en: "Output style rules", "zh-CN": "输出风格规则", "zh-TW": "輸出風格規則", ko: "출력 스타일 규칙" })} className="mt-3 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select value={草稿可见性} onChange={(e) => set草稿可见性(e.target.value as AgentVisibility)} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm">
              <option value="private">{文({ en: "Private", "zh-CN": "仅自己可见", "zh-TW": "僅自己可見", ko: "비공개" })}</option>
              <option value="public">{文({ en: "Public", "zh-CN": "公开共享", "zh-TW": "公開共享", ko: "공개" })}</option>
            </select>
            <button onClick={新建助手} className="rounded-lg border border-primary/35 bg-primary/15 px-3 py-2 text-sm text-primary">
              {忙碌状态 === "新建" ? 文({ en: "Creating...", "zh-CN": "创建中...", "zh-TW": "建立中...", ko: "생성 중..." }) : 文({ en: "Create Agent", "zh-CN": "新建助手", "zh-TW": "建立助手", ko: "에이전트 생성" })}
            </button>
            <button onClick={保存助手} disabled={!选中助手} className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/85 disabled:opacity-50">
              {忙碌状态 === "保存" ? 文({ en: "Saving...", "zh-CN": "保存中...", "zh-TW": "儲存中...", ko: "저장 중..." }) : 文({ en: "Save Current", "zh-CN": "保存当前助手", "zh-TW": "儲存當前助手", ko: "현재 저장" })}
            </button>
          </div>
          <div className="mt-2 text-xs text-white/55">
            {文({ en: "Onchain Binding", "zh-CN": "链上绑定", "zh-TW": "鏈上綁定", ko: "온체인 바인딩" })}：{选中助手?.nfaTokenId ? `Token #${选中助手.nfaTokenId}` : 文({ en: "Not bound", "zh-CN": "未绑定", "zh-TW": "未綁定", ko: "미바인딩" })}
            {选中助手?.nfaContract ? ` · ${短地址(选中助手.nfaContract)}` : ""}
          </div>
          {我的助手.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {我的助手.map((a) => (
                <button
                  key={a.id}
                  onClick={() => set选中助手ID(a.id)}
                  className={`rounded-full border px-3 py-1 text-xs ${选中助手ID === a.id ? "border-primary/50 bg-primary/12 text-primary" : "border-white/15 bg-black/20 text-white/75"}`}
                >
                  {a.name}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <details data-块 className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <summary className="cursor-pointer list-none text-sm text-white/85 inline-flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            {文({ en: "Advanced (Optional)", "zh-CN": "高级功能（可选）", "zh-TW": "高級功能（可選）", ko: "고급 기능 (선택)" })}
          </summary>

          <div className="mt-4 space-y-4">
            <section className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="mb-2 text-xs uppercase tracking-wider text-white/60">{文({ en: "Onchain Loop (Create / Fund / Withdraw)", "zh-CN": "链上闭环（创建 / 充值 / 提取）", "zh-TW": "鏈上閉環（建立 / 充值 / 提取）", ko: "온체인 루프 (생성 / 충전 / 출금)" })}</div>
              <div className="text-xs text-white/55">
                {文({ en: "Contract", "zh-CN": "合约", "zh-TW": "合約", ko: "컨트랙트" })}：{链上配置.enabled && 链上配置.contract ? `${短地址(链上配置.contract)} (Chain ${链上配置.chainId})` : 文({ en: "Not configured", "zh-CN": "未配置", "zh-TW": "未配置", ko: "미설정" })}
                {链上配置.mintFeeBnb ? ` · ${文({ en: "Mint Fee", "zh-CN": "铸造费", "zh-TW": "鑄造費", ko: "민트 수수료" })} ${链上配置.mintFeeBnb} BNB` : ""}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                <button
                  onClick={上链创建助手}
                  disabled={!选中助手 || 选中助手.ownerAddress !== 当前拥有者 || !钱包地址}
                  className="rounded-lg border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200 disabled:opacity-50"
                >
                  {忙碌状态 === "上链创建" ? 文({ en: "Creating...", "zh-CN": "创建中...", "zh-TW": "建立中...", ko: "생성 중..." }) : 文({ en: "Create Onchain Agent", "zh-CN": "创建链上 Agent", "zh-TW": "建立鏈上 Agent", ko: "온체인 Agent 생성" })}
                </button>
                <input value={充值金额Bnb} onChange={(e) => set充值金额Bnb(e.target.value)} placeholder={文({ en: "Fund BNB", "zh-CN": "充值 BNB", "zh-TW": "充值 BNB", ko: "충전 BNB" })} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs" />
                <button
                  onClick={给助手充值}
                  disabled={!选中助手?.nfaTokenId || !钱包地址}
                  className="rounded-lg border border-sky-300/30 bg-sky-400/10 px-3 py-2 text-xs text-sky-200 disabled:opacity-50"
                >
                  {忙碌状态 === "充值" ? 文({ en: "Funding...", "zh-CN": "充值中...", "zh-TW": "充值中...", ko: "충전 중..." }) : 文({ en: "Fund Current Agent", "zh-CN": "给当前 Agent 充值", "zh-TW": "給當前 Agent 充值", ko: "현재 Agent 충전" })}
                </button>
                <input value={提取金额Bnb} onChange={(e) => set提取金额Bnb(e.target.value)} placeholder={文({ en: "Withdraw BNB", "zh-CN": "提取 BNB", "zh-TW": "提取 BNB", ko: "출금 BNB" })} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs" />
                <button
                  onClick={从助手提取}
                  disabled={!选中助手?.nfaTokenId || !钱包地址 || 选中助手?.ownerAddress !== 当前拥有者}
                  className="rounded-lg border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200 disabled:opacity-50"
                >
                  {忙碌状态 === "提取" ? 文({ en: "Withdrawing...", "zh-CN": "提取中...", "zh-TW": "提取中...", ko: "출금 중..." }) : 文({ en: "Withdraw from Current Agent", "zh-CN": "从当前 Agent 提取", "zh-TW": "從當前 Agent 提取", ko: "현재 Agent에서 출금" })}
                </button>
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-wider text-white/60">
                <FileUp className="h-3.5 w-3.5" />
                {文({ en: "Import History", "zh-CN": "导入历史对话", "zh-TW": "導入歷史對話", ko: "대화 이력 가져오기" })}
              </div>
              <textarea
                value={导入文本}
                onChange={(e) => set导入文本(e.target.value)}
                rows={4}
                placeholder={文({ en: "Import line by line, e.g.\nuser: analyze this address\nassistant: high risk", "zh-CN": "支持按行导入，示例：\nuser: 分析这个地址\nassistant: 风险高", "zh-TW": "支援按行導入，示例：\nuser: 分析這個地址\nassistant: 風險高", ko: "줄 단위로 가져오기 지원\n예: user: 이 주소 분석\nassistant: 고위험" })}
                className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
              />
              <div className="mt-2 flex gap-2">
                <button onClick={() => 导入历史("append")} disabled={!选中助手} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80 disabled:opacity-50">
                  {文({ en: "Append", "zh-CN": "追加导入", "zh-TW": "追加導入", ko: "추가 가져오기" })}
                </button>
                <button onClick={() => 导入历史("replace")} disabled={!选中助手} className="rounded-lg border border-amber-300/30 px-3 py-1.5 text-xs text-amber-200 disabled:opacity-50">
                  {文({ en: "Replace", "zh-CN": "覆盖导入", "zh-TW": "覆蓋導入", ko: "덮어쓰기" })}
                </button>
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="mb-2 text-xs uppercase tracking-wider text-white/60">{文({ en: "Public Agents", "zh-CN": "公开助手列表", "zh-TW": "公開助手列表", ko: "공개 에이전트 목록" })}</div>
              <div className="max-h-48 space-y-2 overflow-auto">
                {公开助手.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => set选中助手ID(a.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${选中助手ID === a.id ? "border-secondary/50 bg-secondary/12" : "border-white/10 bg-black/25"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{a.name}</span>
                      <span className="text-[11px] text-white/55">{可见性文本(a.visibility, locale)} · {租金文本(a.rentPriceWei, locale)}</span>
                    </div>
                    <div className="mt-1 text-xs text-white/50">{文({ en: "Owner", "zh-CN": "创建者", "zh-TW": "建立者", ko: "생성자" })}：{短地址(a.ownerAddress)}</div>
                  </button>
                ))}
                {!公开助手.length ? <div className="text-xs text-white/45">{文({ en: "No public agents yet.", "zh-CN": "暂无公开助手。", "zh-TW": "暫無公開助手。", ko: "공개 에이전트가 없습니다." })}</div> : null}
              </div>
            </section>
          </div>
        </details>

        {错误文本 ? <div data-块 className="rounded-xl border border-red-400/35 bg-red-500/10 px-4 py-2 text-sm text-red-200">{错误文本}</div> : null}
      </div>
    </main>
  );
}
