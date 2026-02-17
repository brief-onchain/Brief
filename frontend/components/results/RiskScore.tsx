import { ResultCard } from "./ResultCard";
import { cn } from "@/lib/utils";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { pickLocale } from "@/lib/i18n";

interface RiskScoreProps {
  score: number;
}

export function RiskScore({ score }: RiskScoreProps) {
  const { locale } = useLocale();
  let color = "text-green-500";
  let label = pickLocale(locale, { en: "Low Risk", "zh-CN": "低风险", "zh-TW": "低風險", ko: "저위험" });

  if (score > 80) {
    color = "text-red-500";
    label = pickLocale(locale, { en: "High Risk", "zh-CN": "高风险", "zh-TW": "高風險", ko: "고위험" });
  } else if (score > 50) {
    color = "text-yellow-500";
    label = pickLocale(locale, { en: "Medium Risk", "zh-CN": "中风险", "zh-TW": "中風險", ko: "중위험" });
  }

  const scoreRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo(scoreRef.current, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.8, ease: "elastic.out(1, 0.5)", delay: 0.2 });
  }, { scope: scoreRef });

  return (
    <ResultCard title={pickLocale(locale, { en: "Risk Score", "zh-CN": "风险评分", "zh-TW": "風險評分", ko: "위험 점수" })} className="border-l-transparent bg-gradient-to-br from-card to-card/50">
      <div className="flex items-center gap-6 p-2">
        <div ref={scoreRef} className={cn("text-7xl font-bold font-mono tracking-tighter drop-shadow-lg", color)}>
          {score}
        </div>
        <div className="flex flex-col gap-1">
          <span className={cn("text-2xl font-bold uppercase tracking-wide", color)}>{label}</span>
          <span className="text-sm text-muted-foreground leading-relaxed max-w-[280px]">
            {pickLocale(locale, {
              en: "Conservative estimate based on public onchain data. Verify with evidence links.",
              "zh-CN": "基于公开链上数据的保守评估，建议结合证据链接自行复核。",
              "zh-TW": "基於公開鏈上數據的保守評估，建議結合證據連結自行復核。",
              ko: "공개 온체인 데이터를 기반으로 한 보수적 평가입니다. 증거 링크로 재확인하세요.",
            })}
          </span>
        </div>
      </div>
    </ResultCard>
  );
}
