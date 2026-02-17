import { BriefResult } from "@/lib/api";
import { ResultCard } from "./ResultCard";
import { Bot, Link2, Radar, ShieldCheck } from "lucide-react";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { pickLocale } from "@/lib/i18n";

export function AgentSignals({ result }: { result: BriefResult }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { locale } = useLocale();
  const fr = result.enrich?.frontrun;
  const mr = result.enrich?.memeradar;
  const entityTags = result.entity?.tags ?? [];
  const frTags = fr?.tags ?? [];
  const mrTags = mr?.tags ?? [];
  const altCount = Array.isArray(fr?.altWallets) ? fr.altWallets.length : 0;

  useGSAP(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current.querySelectorAll("[data-signal-row]"),
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: "power2.out" }
    );
    gsap.fromTo(
      containerRef.current.querySelectorAll("[data-signal-tag]"),
      { opacity: 0, scale: 0.92 },
      { opacity: 1, scale: 1, duration: 0.35, stagger: 0.03, delay: 0.2, ease: "back.out(1.4)" }
    );
    gsap.to(containerRef.current.querySelectorAll("[data-signal-pulse]"), {
      opacity: 0.45,
      repeat: -1,
      yoyo: true,
      duration: 1,
      stagger: 0.18,
      ease: "sine.inOut",
    });
  }, { scope: containerRef });

  return (
    <ResultCard title={pickLocale(locale, { en: "Agent Signals", "zh-CN": "Agent 信号", "zh-TW": "Agent 信號", ko: "에이전트 시그널" })} delay={0.18} className="h-full">
      <div ref={containerRef} className="space-y-3 text-sm">
        <div data-signal-row className="flex items-center gap-2 text-white/80">
          <Bot data-signal-pulse className="h-4 w-4 text-primary" />
          <span>
            {pickLocale(locale, {
              en: "Model context: onchain public data + optional tag sources",
              "zh-CN": "模型上下文：链上公开数据 + 可选标签源",
              "zh-TW": "模型上下文：鏈上公開數據 + 可選標籤源",
              ko: "모델 컨텍스트: 온체인 공개 데이터 + 선택 태그 소스",
            })}
          </span>
        </div>

        {fr?.primaryLabel ? (
          <div data-signal-row className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <ShieldCheck data-signal-pulse className="mt-0.5 h-4 w-4 text-secondary" />
            <div>
              <div className="text-white/90">
                {pickLocale(locale, { en: "Frontrun Label", "zh-CN": "Frontrun 主标签", "zh-TW": "Frontrun 主標籤", ko: "Frontrun 라벨" })}：{fr.primaryLabel}
              </div>
              {fr.verified ? <div className="text-xs text-white/60">{pickLocale(locale, { en: "Status", "zh-CN": "状态", "zh-TW": "狀態", ko: "상태" })}: verified</div> : null}
            </div>
          </div>
        ) : null}

        {altCount > 0 ? (
          <div data-signal-row className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2">
            <Link2 data-signal-pulse className="mt-0.5 h-4 w-4 text-amber-300" />
            <div className="text-amber-100">
              {pickLocale(locale, {
                en: `Detected ${altCount} potentially related addresses (optional source)`,
                "zh-CN": `检测到 ${altCount} 个疑似关联地址（可选数据源）`,
                "zh-TW": `檢測到 ${altCount} 個疑似關聯地址（可選數據源）`,
                ko: `의심 연관 주소 ${altCount}개가 탐지되었습니다 (선택 데이터 소스)`,
              })}
            </div>
          </div>
        ) : null}

        <div data-signal-row className="space-y-2">
          <div className="flex items-center gap-2 text-white/70">
            <Radar data-signal-pulse className="h-4 w-4 text-primary" />
            <span>{pickLocale(locale, { en: "Tag Signals", "zh-CN": "标签信号", "zh-TW": "標籤信號", ko: "태그 신호" })}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {entityTags.map((t) => (
              <span key={`e-${t}`} data-signal-tag className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/80">
                {t}
              </span>
            ))}
            {frTags.slice(0, 6).map((t) => (
              <span key={`f-${t}`} data-signal-tag className="rounded-full border border-secondary/30 bg-secondary/10 px-2 py-1 text-xs text-secondary">
                FR:{t}
              </span>
            ))}
            {mrTags.slice(0, 6).map((t) => (
              <span key={`m-${t}`} data-signal-tag className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary">
                MR:{t}
              </span>
            ))}
            {entityTags.length + frTags.length + mrTags.length === 0 ? (
              <span data-signal-tag className="text-xs text-white/50">
                {pickLocale(locale, { en: "No extra tags", "zh-CN": "暂无额外标签", "zh-TW": "暫無額外標籤", ko: "추가 태그 없음" })}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </ResultCard>
  );
}
