import { ResultCard } from "./ResultCard";
import { Evidence } from "@/lib/api";
import { ExternalLink, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { pickLocale } from "@/lib/i18n";

interface EvidenceLinksProps {
  evidence: Evidence[];
}

export function EvidenceLinks({ evidence }: EvidenceLinksProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { locale } = useLocale();

  useGSAP(() => {
    if (!containerRef.current) return;

    gsap.fromTo(containerRef.current.children, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, delay: 0.4, ease: "back.out(1.7)" });
  }, { scope: containerRef });

  return (
    <ResultCard title={pickLocale(locale, { en: "Evidence & Sources", "zh-CN": "证据与来源", "zh-TW": "證據與來源", ko: "증거 및 출처" })} delay={0.2} className="h-full">
      <div ref={containerRef} className="flex flex-wrap gap-3">
        {evidence.map((item, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            asChild
            className="gap-2 h-9 px-4 bg-background/50 border-primary/20 hover:border-primary/50 hover:bg-primary/10 transition-all duration-200"
          >
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              <Link2 className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">{item.label}</span>
              {item.value && <span className="text-muted-foreground ml-1 font-mono text-xs">({item.value})</span>}
              <ExternalLink className="h-3 w-3 opacity-50 ml-1" />
            </a>
          </Button>
        ))}
      </div>
    </ResultCard>
  );
}
