"use client";

import Link from "next/link";
import { useMemo, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowRight, Bot, FileSearch, ShieldCheck, Sparkles, Wallet, Wrench } from "lucide-react";
import { LanguageSwitch } from "@/components/i18n/LanguageSwitch";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { pickLocale } from "@/lib/i18n";

export default function GuidePage() {
  const rootRef = useRef<HTMLElement>(null);
  const { locale } = useLocale();

  const quickSteps = useMemo(
    () => [
      {
        title: pickLocale(locale, { en: "1) Enter Input", "zh-CN": "1) 直接输入", "zh-TW": "1) 直接輸入", ko: "1) 바로 입력" }),
        desc: pickLocale(locale, {
          en: "On the home page, input a wallet address, token contract address, or a question with an address.",
          "zh-CN": "在首页输入钱包地址、代币合约地址，或直接问问题并带上地址。",
          "zh-TW": "在首頁輸入錢包地址、代幣合約地址，或直接問問題並帶上地址。",
          ko: "홈에서 지갑 주소, 토큰 컨트랙트 주소 또는 주소가 포함된 질문을 입력하세요.",
        }),
        icon: FileSearch,
      },
      {
        title: pickLocale(locale, { en: "2) Get Result", "zh-CN": "2) 一次拿结果", "zh-TW": "2) 一次拿結果", ko: "2) 결과 받기" }),
        desc: pickLocale(locale, {
          en: "The system auto-detects address type, queries onchain data, and returns readable conclusions and evidence.",
          "zh-CN": "系统自动做地址识别、链上查询、风险整理，输出可读结论与证据。",
          "zh-TW": "系統自動做地址識別、鏈上查詢、風險整理，輸出可讀結論與證據。",
          ko: "시스템이 주소 식별, 온체인 조회, 위험 정리를 자동 수행하고 읽기 쉬운 결론과 증거를 제공합니다.",
        }),
        icon: Bot,
      },
      {
        title: pickLocale(locale, { en: "3) Inspect Details", "zh-CN": "3) 再看细节", "zh-TW": "3) 再看細節", ko: "3) 세부 확인" }),
        desc: pickLocale(locale, {
          en: "Read conclusions first, then key evidence, without learning heavy blockchain jargon first.",
          "zh-CN": "先看结论，再看关键证据，不需要先学复杂区块链术语。",
          "zh-TW": "先看結論，再看關鍵證據，不需要先學複雜區塊鏈術語。",
          ko: "결론을 먼저 보고 핵심 증거를 확인하세요. 복잡한 블록체인 용어를 먼저 배울 필요는 없습니다.",
        }),
        icon: ShieldCheck,
      },
    ],
    [locale]
  );

  const advancedLines = useMemo(
    () => [
      pickLocale(locale, { en: "Create multiple agents (e.g., meme sniper, contract check, wallet profile).", "zh-CN": "创建多个助手（例如：土狗狙击、合约体检、钱包画像）。", "zh-TW": "建立多個助手（例如：土狗狙擊、合約體檢、錢包畫像）。", ko: "여러 에이전트를 만들 수 있습니다 (예: 밈 스나이퍼, 컨트랙트 점검, 지갑 프로필)." }),
      pickLocale(locale, { en: "Set an agent to public and configure pay-per-run rent (BNB).", "zh-CN": "把助手设为公开，并设置按次租金（BNB）。", "zh-TW": "把助手設為公開，並設定按次租金（BNB）。", ko: "에이전트를 공개로 설정하고 실행당 요금(BNB)을 지정하세요." }),
      pickLocale(locale, { en: "When others call your public agent, payment is automatic and can be withdrawn onchain.", "zh-CN": "别人调用你的公开助手时自动支付，你可以在链上提取。", "zh-TW": "他人調用你的公開助手時會自動支付，你可以在鏈上提取。", ko: "다른 사용자가 공개 에이전트를 호출하면 자동 결제되며 온체인에서 출금할 수 있습니다." }),
      pickLocale(locale, { en: "You can import chat history as style/context when needed.", "zh-CN": "需要时可导入历史对话，作为助手风格与上下文。", "zh-TW": "需要時可導入歷史對話，作為助手風格與上下文。", ko: "필요 시 대화 이력을 가져와 스타일/컨텍스트로 사용할 수 있습니다." }),
    ],
    [locale]
  );

  useGSAP(
    () => {
      if (!rootRef.current) return;
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      tl.fromTo("[data-guide-hero]", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 })
        .fromTo("[data-guide-card]", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.07 }, "-=0.35")
        .fromTo("[data-guide-block]", { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.06 }, "-=0.25");

      gsap.to("[data-guide-glow-a]", {
        x: 22,
        y: -16,
        duration: 8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to("[data-guide-glow-b]", {
        x: -18,
        y: 14,
        duration: 9,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    },
    { scope: rootRef }
  );

  return (
    <main ref={rootRef} className="brief-bg min-h-screen px-4 py-6 text-white md:px-8 md:py-10 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
        <div data-guide-glow-a className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />
        <div data-guide-glow-b className="absolute -right-20 bottom-12 h-96 w-96 rounded-full bg-secondary/12 blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl space-y-5">
        <section data-guide-hero className="rounded-2xl border border-white/10 bg-black/25 p-5 backdrop-blur-md md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs text-primary/90">
                <Sparkles className="h-3.5 w-3.5" />
                {pickLocale(locale, { en: "Quick Guide", "zh-CN": "新手玩法说明", "zh-TW": "新手玩法說明", ko: "빠른 가이드" })}
              </div>
              <h1 className="text-2xl font-bold tracking-tight md:text-4xl">
                {pickLocale(locale, { en: "How to Use Brief in One Page", "zh-CN": "一页看懂 Brief 怎么用", "zh-TW": "一頁看懂 Brief 怎麼用", ko: "한 페이지로 보는 Brief 사용법" })}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/65 md:text-base">
                {pickLocale(locale, {
                  en: "By default, you only need the single input box on home. Open advanced mode only when you want public paid agents.",
                  "zh-CN": "默认只需要首页一个输入框。只有你想做「公开收费助手」时，才需要进入进阶玩法。",
                  "zh-TW": "預設只需要首頁一個輸入框。只有你想做「公開收費助手」時，才需要進入進階玩法。",
                  ko: "기본적으로 홈의 입력창 하나면 충분합니다. 공개 유료 에이전트를 운영할 때만 고급 모드를 사용하세요.",
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitch />
              <Link href="/" className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 hover:bg-white/10">
                {pickLocale(locale, { en: "Back Home", "zh-CN": "返回首页", "zh-TW": "返回首頁", ko: "홈으로" })}
              </Link>
              <Link href="/agents" className="rounded-full border border-primary/35 bg-primary/15 px-4 py-2 text-sm text-primary hover:bg-primary/22">
                {pickLocale(locale, { en: "Open Agent Studio", "zh-CN": "打开 Agent Studio", "zh-TW": "打開 Agent Studio", ko: "Agent Studio 열기" })}
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {quickSteps.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} data-guide-card className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-primary/35 bg-primary/12">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm text-white/65">{item.desc}</p>
              </article>
            );
          })}
        </section>

        <section data-guide-block className="rounded-2xl border border-primary/25 bg-primary/10 p-4 md:p-5">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-primary/90">
            <Wallet className="h-3.5 w-3.5" />
            {pickLocale(locale, { en: "Paid Calls (Public Agents)", "zh-CN": "收费调用（公开助手）", "zh-TW": "收費調用（公開助手）", ko: "유료 호출 (공개 에이전트)" })}
          </div>
          <p className="mt-2 text-sm text-white/80">
            {pickLocale(locale, {
              en: "Pay-per-run is triggered only when an agent is set to Public + non-zero rent. Free flow still works without wallet connection.",
              "zh-CN": "仅当助手被设置为「公开 + 有租金」时，才会触发按次付费。普通用户不连接钱包也能正常用免费分析流程。",
              "zh-TW": "僅當助手被設定為「公開 + 有租金」時，才會觸發按次付費。普通用戶不連接錢包也能正常使用免費分析流程。",
              ko: "에이전트가 공개 + 유료로 설정된 경우에만 실행당 결제가 발생합니다. 무료 분석은 지갑 없이도 가능합니다.",
            })}
          </p>
          <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/75">
            {pickLocale(locale, {
              en: "Flow: choose public agent -> pay transaction -> backend verifies tx hash -> analysis result returned.",
              "zh-CN": "调用流程：选择公开助手 → 自动发起支付 → 后端校验交易哈希 → 返回分析结果。",
              "zh-TW": "調用流程：選擇公開助手 → 自動發起支付 → 後端校驗交易哈希 → 返回分析結果。",
              ko: "호출 흐름: 공개 에이전트 선택 -> 자동 결제 -> 백엔드 트랜잭션 해시 검증 -> 분석 결과 반환",
            })}
          </div>
        </section>

        <section data-guide-block className="rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5">
          <div className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-wider text-white/70">
            <Wrench className="h-3.5 w-3.5" />
            {pickLocale(locale, { en: "Advanced (Optional)", "zh-CN": "进阶玩法（可选）", "zh-TW": "進階玩法（可選）", ko: "고급 기능 (선택)" })}
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {advancedLines.map((line) => (
              <div key={line} className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-white/78">
                {line}
              </div>
            ))}
          </div>
        </section>

        <section data-guide-block className="rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5">
          <h3 className="text-base font-semibold">{pickLocale(locale, { en: "FAQ", "zh-CN": "常见问题", "zh-TW": "常見問題", ko: "자주 묻는 질문" })}</h3>
          <div className="mt-3 space-y-2">
            <details className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
              <summary className="cursor-pointer text-sm text-white/85">{pickLocale(locale, { en: "Do I need to connect a wallet?", "zh-CN": "必须连接钱包吗？", "zh-TW": "必須連接錢包嗎？", ko: "지갑 연결이 필수인가요?" })}</summary>
              <p className="mt-2 text-sm text-white/65">{pickLocale(locale, { en: "No. Free standard mode works without a wallet. Wallet is required only for paid public agents or onchain create/fund/withdraw.", "zh-CN": "不是。免费标准模式不需要钱包。只有你要调用收费公开助手或做链上创建/充值/提取时才需要。", "zh-TW": "不是。免費標準模式不需要錢包。只有你要調用收費公開助手或做鏈上建立/充值/提取時才需要。", ko: "아니요. 무료 표준 모드는 지갑이 필요 없습니다. 유료 공개 에이전트 호출이나 온체인 생성/충전/출금 시에만 필요합니다." })}</p>
            </details>
            <details className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
              <summary className="cursor-pointer text-sm text-white/85">{pickLocale(locale, { en: "What if fee logic needs updates?", "zh-CN": "如果收费逻辑后续要调整怎么办？", "zh-TW": "如果收費邏輯後續要調整怎麼辦？", ko: "요금 로직을 나중에 바꿔야 하면?" })}</summary>
              <p className="mt-2 text-sm text-white/65">{pickLocale(locale, { en: "The contract follows an upgradeable proxy path (UUPS), so implementation can be upgraded while preserving address.", "zh-CN": "合约采用可升级代理路线（UUPS）。需要修复或升级时，可以在保留地址的前提下升级实现。", "zh-TW": "合約採用可升級代理路線（UUPS）。需要修復或升級時，可以在保留地址的前提下升級實現。", ko: "컨트랙트는 업그레이드 가능한 프록시(UUPS)를 사용하므로 주소를 유지한 채 구현을 업그레이드할 수 있습니다." })}</p>
            </details>
            <details className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
              <summary className="cursor-pointer text-sm text-white/85">{pickLocale(locale, { en: "Where should beginners start?", "zh-CN": "小白应该从哪里开始？", "zh-TW": "小白應該從哪裡開始？", ko: "초보자는 어디서 시작하나요?" })}</summary>
              <p className="mt-2 text-sm text-white/65">{pickLocale(locale, { en: "Start with the home input box for one-shot conclusions, then build personalized agents in Agent Studio when needed.", "zh-CN": "先用首页输入框体验“一次输入直接出结论”。确认有价值后，再进 Agent Studio 做个性化助手。", "zh-TW": "先用首頁輸入框體驗「一次輸入直接出結論」。確認有價值後，再進 Agent Studio 做個性化助手。", ko: "먼저 홈 입력창으로 원샷 결론을 체험하고, 가치가 확인되면 Agent Studio에서 개인화 에이전트를 만드세요." })}</p>
            </details>
          </div>
        </section>

        <section data-guide-block className="rounded-2xl border border-white/10 bg-black/25 p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">{pickLocale(locale, { en: "Start Now", "zh-CN": "马上开始", "zh-TW": "馬上開始", ko: "지금 시작" })}</h3>
              <p className="text-sm text-white/65">{pickLocale(locale, { en: "Try standard mode first, then enable paid/onchain features when needed.", "zh-CN": "先体验标准模式；需要时再启用收费与链上玩法。", "zh-TW": "先體驗標準模式；需要時再啟用收費與鏈上玩法。", ko: "먼저 표준 모드를 체험하고 필요 시 유료/온체인 기능을 켜세요." })}</p>
            </div>
            <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/15 px-4 py-2 text-sm text-primary hover:bg-primary/22">
              {pickLocale(locale, { en: "Go to Home", "zh-CN": "去首页输入地址", "zh-TW": "去首頁輸入地址", ko: "홈으로 이동" })}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
