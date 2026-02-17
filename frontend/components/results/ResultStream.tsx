import { BriefResult } from "@/lib/api";
import { OneShotBrief } from "./OneShotBrief";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { LocaleCode } from "@/lib/i18n";

interface ResultStreamProps {
  result: BriefResult;
  locale: LocaleCode;
}

export function ResultStream({ result, locale }: ResultStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.registerPlugin(ScrollTrigger);
    const blocks = gsap.utils.toArray<HTMLElement>("[data-stream-block]", containerRef.current);
    blocks.forEach((block, idx) => {
      gsap.fromTo(
        block,
        { opacity: 0, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          ease: "power2.out",
          delay: idx * 0.05,
          scrollTrigger: {
            trigger: block,
            start: "top 86%",
            once: true,
          },
        }
      );
    });
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="w-full max-w-4xl mx-auto space-y-8 pb-32">
      <div data-stream-block>
        <OneShotBrief result={result} locale={locale} />
      </div>
    </div>
  );
}
