import { ResultCard } from "./ResultCard";
import { Quote } from "lucide-react";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { pickLocale } from "@/lib/i18n";

export function Tldr({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { locale } = useLocale();

  useGSAP(() => {
    gsap.fromTo(ref.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out", delay: 0.15 });
  }, { scope: ref });

  return (
    <ResultCard
      title={pickLocale(locale, { en: "TL;DR", "zh-CN": "TL;DR", "zh-TW": "TL;DR", ko: "요약" })}
      delay={0.05}
      className="border-l-transparent bg-gradient-to-br from-primary/12 via-card/70 to-card/40 border-primary/15 shadow-lg shadow-primary/8"
    >
      <div ref={ref} className="flex items-start gap-4 p-1">
        <div className="flex-shrink-0 mt-0.5 p-2 rounded-full bg-primary/10 border border-primary/15">
          <Quote className="h-4 w-4 text-primary" />
        </div>
        <div className="text-base md:text-lg leading-relaxed text-foreground/95 font-semibold">{text}</div>
      </div>
    </ResultCard>
  );
}
