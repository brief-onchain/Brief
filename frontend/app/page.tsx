"use client";

import { useState, useRef } from "react";
import { Hero } from "@/components/hero/Hero";
import { ResultStream } from "@/components/results/ResultStream";
import { analyzeAddress, BriefResult } from "@/lib/api";
import { AnimatePresence, motion } from "framer-motion";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Image from "next/image";
import Link from "next/link";
import { LanguageSwitch } from "@/components/i18n/LanguageSwitch";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { pickLocale } from "@/lib/i18n";

export default function Home() {
  const [result, setResult] = useState<BriefResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const resultToolbarRef = useRef<HTMLDivElement>(null);
  const { locale } = useLocale();

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo(mainRef.current, { opacity: 0 }, { opacity: 1, duration: 0.9 })
      .fromTo(
        headerRef.current,
        { y: -18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7 },
        "-=0.45"
      )
      .fromTo(
        "[data-shell-ambient]",
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 1.1, stagger: 0.1 },
        "-=0.55"
      );

    gsap.to("[data-shell-aura-a]", {
      x: 24,
      y: -12,
      duration: 8,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
    gsap.to("[data-shell-aura-b]", {
      x: -18,
      y: 16,
      duration: 9,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
    gsap.to("[data-shell-dot]", {
      opacity: 0.35,
      duration: 0.9,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }, { scope: mainRef });

  useGSAP(() => {
    if (!result) return;
    if (!resultToolbarRef.current) return;
    gsap.fromTo(
      resultToolbarRef.current,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
    );
  }, { scope: mainRef, dependencies: [result] });

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      const data = await analyzeAddress(query, locale);
      setResult(data);
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : pickLocale(locale, {
              en: "Analysis failed, please try again.",
              "zh-CN": "分析失败，请重试",
              "zh-TW": "分析失敗，請重試",
              ko: "분석에 실패했습니다. 다시 시도해 주세요.",
            });
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const brandText = pickLocale(locale, {
    en: "BRIEF",
    "zh-CN": "简报",
    "zh-TW": "簡報",
    ko: "브리프",
  });
  const assistantModeText = pickLocale(locale, {
    en: "Assistant Mode",
    "zh-CN": "助手模式",
    "zh-TW": "助手模式",
    ko: "어시스턴트 모드",
  });
  const guideText = pickLocale(locale, {
    en: "Guide",
    "zh-CN": "新手玩法说明",
    "zh-TW": "新手玩法說明",
    ko: "가이드",
  });
  const hackathonText = pickLocale(locale, {
    en: "BNB Chain Hackathon",
    "zh-CN": "BNB 链黑客松",
    "zh-TW": "BNB 鏈黑客松",
    ko: "BNB 체인 해커톤",
  });
  const newAnalysisText = pickLocale(locale, {
    en: "New Analysis",
    "zh-CN": "新建分析",
    "zh-TW": "新增分析",
    ko: "새 분석",
  });
  const addressText = pickLocale(locale, {
    en: "Address",
    "zh-CN": "地址",
    "zh-TW": "地址",
    ko: "주소",
  });

  return (
    <main ref={mainRef} className="brief-bg flex min-h-screen flex-col items-center justify-between p-4 md:p-24 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
        <div data-shell-ambient data-shell-aura-a className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-primary/14 blur-3xl" />
        <div data-shell-ambient data-shell-aura-b className="absolute -right-16 bottom-24 h-80 w-80 rounded-full bg-secondary/12 blur-3xl" />
      </div>

      <div ref={headerRef} className="z-50 w-full max-w-6xl flex items-center justify-between font-mono text-sm absolute top-0 left-1/2 transform -translate-x-1/2 p-6 md:p-8">
        <div className="flex items-center gap-3 bg-card/55 backdrop-blur-md px-4 py-2 rounded-full border border-primary/20 hover:border-primary/35 transition-colors cursor-default shadow-lg shadow-primary/8">
          <Image src="/brief-logo-vc.svg" alt={brandText} width={22} height={22} unoptimized className="logo-halo h-[22px] w-[22px] rounded-sm" />
          <div data-shell-dot className="w-2 h-2 rounded-full bg-primary" />
          <span className="font-heading font-bold text-lg tracking-wider text-white">{brandText}</span>
          <span className="text-white/20">|</span>
          <span className="text-muted-foreground font-medium">{assistantModeText}</span>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <LanguageSwitch />
          <Link
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-md border border-primary/15 hover:bg-card/70 hover:border-primary/35 transition-all text-muted-foreground hover:text-primary text-xs font-semibold"
            href="/guide"
          >
            {guideText}
          </Link>
          <a
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-md border border-primary/15 hover:bg-card/70 hover:border-primary/35 transition-all text-muted-foreground hover:text-primary text-xs uppercase tracking-wider font-semibold"
            href="https://dorahacks.io/hackathon/goodvibes/detail"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            {hackathonText}
          </a>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!result && (
          <motion.div
            key="hero"
            exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
            className="w-full flex-1 flex flex-col justify-center items-center z-10 mt-20 md:mt-0"
          >
            <Hero onSearch={handleSearch} isLoading={isLoading} locale={locale} />
          </motion.div>
        )}

        {result && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full pt-28 pb-10 z-10"
          >
            <div ref={resultToolbarRef} data-result-toolbar className="max-w-4xl mx-auto mb-10 flex items-center justify-between">
              <button
                onClick={() => setResult(null)}
                className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors px-4 py-2 rounded-full hover:bg-white/5"
              >
                <span className="group-hover:-translate-x-1 transition-transform">←</span>
                {newAnalysisText}
              </button>
              <div className="flex flex-col items-end">
                <span className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{addressText}</span>
                <h2 className="text-xl md:text-2xl font-mono font-medium text-white tracking-tight">
                  {result.address.slice(0, 6)}...{result.address.slice(-4)}
                </h2>
                {result.entity?.title && (
                  <div className="mt-1 text-xs text-white/60">
                    {result.entity.title}
                    {result.entity.subtitle ? <span className="text-white/30"> · {result.entity.subtitle}</span> : null}
                  </div>
                )}
              </div>
            </div>
            <ResultStream result={result} locale={locale} />
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-destructive/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl border border-white/10 z-50 animate-in fade-in slide-in-from-bottom-4">
          {error}
        </div>
      )}
    </main>
  );
}
