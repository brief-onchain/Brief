"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, ArrowRight, Bot, Radar, FileSearch, ShieldCheck } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Image from "next/image";
import { pickLocale, type LocaleCode } from "@/lib/i18n";

interface HeroProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
  locale: LocaleCode;
}

export function Hero({ onSearch, isLoading, locale }: HeroProps) {
  const [query, setQuery] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const pipelineRef = useRef<HTMLDivElement>(null);
  const pipelineProgressRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(titleRef.current, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.2 })
      .fromTo(subtitleRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, "-=0.6")
      .fromTo(formRef.current, { y: 20, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.8 }, "-=0.6")
      .fromTo(pipelineRef.current, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, "-=0.45")
      .fromTo(suggestionsRef.current, { opacity: 0 }, { opacity: 1, duration: 0.8 }, "-=0.4");

    gsap.fromTo(".hero-chip", { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.08, delay: 0.35, ease: "power2.out" });

    gsap.to(pipelineRef.current, {
      y: -3,
      duration: 2.8,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }, { scope: containerRef });

  useEffect(() => {
    if (!isLoading) return;
    const id = window.setInterval(() => {
      setStepIndex((s) => (s + 1) % 4);
    }, 900);
    return () => window.clearInterval(id);
  }, [isLoading]);

  useEffect(() => {
    if (!pipelineProgressRef.current) return;
    const targetWidth = isLoading ? `${(stepIndex + 1) * 25}%` : "0%";
    gsap.to(pipelineProgressRef.current, {
      width: targetWidth,
      duration: 0.45,
      ease: "power2.out",
    });
  }, [isLoading, stepIndex]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setStepIndex(0);
      onSearch(query.trim());
    }
  };

  const badgeText = pickLocale(locale, {
    en: "Onchain Research Entry",
    "zh-CN": "链上研究入口",
    "zh-TW": "鏈上研究入口",
    ko: "온체인 리서치 입구",
  });
  const titleTop = pickLocale(locale, {
    en: "Smart Briefing for BNB Chain",
    "zh-CN": "面向 BNB 链的智能简报",
    "zh-TW": "面向 BNB 鏈的智能簡報",
    ko: "BNB 체인을 위한 스마트 브리핑",
  });
  const titleBottom = pickLocale(locale, {
    en: "One input, direct conclusions",
    "zh-CN": "输入一次，直接出研究结论",
    "zh-TW": "輸入一次，直接出研究結論",
    ko: "한 번 입력으로 바로 결론",
  });
  const subtitle = pickLocale(locale, {
    en: "A one-shot AI entry for onchain analysis. It auto-identifies addresses, evaluates risk, gathers evidence, and returns a single integrated brief.",
    "zh-CN": "这是一个一把出结果的 AI 链上研究入口。输入后自动完成地址识别、风险评估、证据整理，并一次性输出综合简报。",
    "zh-TW": "這是一個一把出結果的 AI 鏈上研究入口。輸入後自動完成地址識別、風險評估、證據整理，並一次性輸出綜合簡報。",
    ko: "온체인 분석을 한 번에 끝내는 AI 엔트리입니다. 입력하면 주소 식별, 위험 평가, 증거 정리를 자동으로 수행해 종합 브리핑을 반환합니다.",
  });
  const inputPlaceholder = pickLocale(locale, {
    en: "Enter 0x address / token contract / question with address",
    "zh-CN": "输入 0x 地址 / 代币合约 / 带地址的问题（例：这个地址风险高吗 0x...）",
    "zh-TW": "輸入 0x 地址 / 代幣合約 / 帶地址的問題（例：這個地址風險高嗎 0x...）",
    ko: "0x 주소 / 토큰 컨트랙트 / 주소가 포함된 질문 입력",
  });
  const startText = pickLocale(locale, {
    en: "Start",
    "zh-CN": "开始分析",
    "zh-TW": "開始分析",
    ko: "분석 시작",
  });
  const stepTexts = [
    pickLocale(locale, { en: "Input parsing", "zh-CN": "输入解析", "zh-TW": "輸入解析", ko: "입력 파싱" }),
    pickLocale(locale, { en: "Onchain query", "zh-CN": "链上查询", "zh-TW": "鏈上查詢", ko: "온체인 조회" }),
    pickLocale(locale, { en: "Risk modeling", "zh-CN": "风险建模", "zh-TW": "風險建模", ko: "리스크 모델링" }),
    pickLocale(locale, { en: "Evidence curation", "zh-CN": "证据整理", "zh-TW": "證據整理", ko: "증거 정리" }),
  ];
  const tryText = pickLocale(locale, {
    en: "Try:",
    "zh-CN": "试试：",
    "zh-TW": "試試：",
    ko: "예시:",
  });

  const suggestions = [
    {
      label: pickLocale(locale, {
        en: "WBNB (Example)",
        "zh-CN": "WBNB（示例）",
        "zh-TW": "WBNB（示例）",
        ko: "WBNB (예시)",
      }),
      value: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    },
    {
      label: pickLocale(locale, {
        en: "Question with address",
        "zh-CN": "把问题里带上地址",
        "zh-TW": "把問題裡帶上地址",
        ko: "질문에 주소 포함",
      }),
      value: pickLocale(locale, {
        en: "Is this contract risky? 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
        "zh-CN": "这个合约风险大吗？0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
        "zh-TW": "這個合約風險大嗎？0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
        ko: "이 컨트랙트 위험한가요? 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      }),
    },
  ];

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-10">
      <div className="space-y-6 max-w-4xl relative">
        <div className="mx-auto mb-3 w-fit rounded-full border border-primary/25 bg-primary/10 px-4 py-2 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-secondary/90">
            <Image src="/brief-logo-vc.svg" alt={badgeText} width={20} height={20} unoptimized className="logo-halo h-5 w-5 rounded-sm" />
            {badgeText}
          </div>
        </div>
        <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 hidden -translate-x-1/2 opacity-20 md:block">
          <Image src="/brief-logo-vc.svg" alt="" width={180} height={180} unoptimized className="logo-halo h-44 w-44 object-contain" />
        </div>
        <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold font-heading tracking-tight text-white leading-[1.1]">
          {titleTop} <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-primary">{titleBottom}</span>
        </h1>
        <p ref={subtitleRef} className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
          {subtitle}
        </p>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="w-full max-w-3xl relative group">
        <div className="relative w-full transition-all duration-300 transform group-hover:scale-[1.01]">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/26 via-secondary/16 to-primary/24 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative bg-card/70 backdrop-blur-xl border border-primary/20 rounded-2xl shadow-2xl overflow-hidden flex items-center p-2 ring-1 ring-primary/12 focus-within:ring-primary/50 transition-all">
            <Search className="ml-4 text-muted-foreground h-6 w-6" />
            <Input
              type="text"
              placeholder={inputPlaceholder}
              className="flex-1 border-none bg-transparent h-14 text-lg px-4 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="lg"
              className="rounded-full px-8 h-12 font-medium text-base bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40"
              disabled={isLoading || !query.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  {startText} <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </div>
        </div>
      </form>

      <div ref={pipelineRef} className="w-full max-w-3xl rounded-xl border border-primary/20 bg-card/55 backdrop-blur-md px-4 py-3 text-left shadow-lg shadow-primary/5">
        <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
          <div className={`hero-chip inline-flex items-center gap-1 ${stepIndex === 0 && isLoading ? "text-primary" : ""}`}>
            <Bot className="h-3.5 w-3.5" />
            {stepTexts[0]}
          </div>
          <div className={`hero-chip inline-flex items-center gap-1 ${stepIndex === 1 && isLoading ? "text-primary" : ""}`}>
            <FileSearch className="h-3.5 w-3.5" />
            {stepTexts[1]}
          </div>
          <div className={`hero-chip inline-flex items-center gap-1 ${stepIndex === 2 && isLoading ? "text-primary" : ""}`}>
            <Radar className="h-3.5 w-3.5" />
            {stepTexts[2]}
          </div>
          <div className={`hero-chip inline-flex items-center gap-1 ${stepIndex === 3 && isLoading ? "text-primary" : ""}`}>
            <ShieldCheck className="h-3.5 w-3.5" />
            {stepTexts[3]}
          </div>
        </div>
        <div className="mt-2 h-1 w-full rounded-full bg-white/10 overflow-hidden">
          <div ref={pipelineProgressRef} className="h-full w-0 bg-gradient-to-r from-primary to-secondary" />
        </div>
      </div>

      <div ref={suggestionsRef} className="flex flex-wrap justify-center gap-3 text-sm text-muted-foreground">
        <span className="py-1">{tryText}</span>
        {suggestions.map((item, i) => (
          <button
            key={i}
            onClick={() => {
              if (!item.value) return;
              setStepIndex(0);
              setQuery(item.value);
              onSearch(item.value);
            }}
            className="hero-chip px-3 py-1 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 hover:border-primary/30 hover:text-primary transition-all duration-200"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
