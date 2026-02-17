import { ResultCard } from "./ResultCard";
import { Sparkles } from "lucide-react";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { pickLocale } from "@/lib/i18n";

interface ExplanationProps {
  text: string;
}

export function Explanation({ text }: ExplanationProps) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const { locale } = useLocale();

  useGSAP(() => {
    gsap.fromTo(textRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 1, delay: 0.5, ease: "power2.out" });
  }, { scope: textRef });

  return (
    <ResultCard
      title={pickLocale(locale, { en: "Explanation", "zh-CN": "人话解释", "zh-TW": "白話解釋", ko: "설명" })}
      delay={0.3}
      className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 shadow-lg shadow-primary/5"
    >
      <div className="flex gap-5 p-2">
        <div className="flex-shrink-0 mt-1 p-2 bg-primary/10 rounded-full h-fit">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
        </div>
        <p ref={textRef} className="text-lg md:text-xl leading-relaxed text-foreground/90 font-medium font-sans">
          {text}
        </p>
      </div>
    </ResultCard>
  );
}
