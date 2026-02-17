import { ResultCard } from "./ResultCard";
import { Finding } from "@/lib/api";
import { AlertCircle, CheckCircle, Info, XCircle } from "lucide-react";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { pickLocale } from "@/lib/i18n";

interface KeyFindingsProps {
  findings: Finding[];
}

export function KeyFindings({ findings }: KeyFindingsProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const { locale } = useLocale();

  useGSAP(() => {
    if (!listRef.current) return;

    gsap.fromTo(listRef.current.children, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.1, delay: 0.3, ease: "power2.out" });
  }, { scope: listRef });

  const getIcon = (type: Finding["type"]) => {
    switch (type) {
      case "critical":
        return <XCircle className="text-destructive h-5 w-5 flex-shrink-0" />;
      case "warning":
        return <AlertCircle className="text-yellow-500 h-5 w-5 flex-shrink-0" />;
      case "success":
        return <CheckCircle className="text-green-500 h-5 w-5 flex-shrink-0" />;
      case "info":
        return <Info className="text-blue-500 h-5 w-5 flex-shrink-0" />;
    }
  };

  return (
    <ResultCard title={pickLocale(locale, { en: "Key Findings", "zh-CN": "关键结论", "zh-TW": "關鍵結論", ko: "핵심 결론" })} delay={0.1} className="h-full">
      <ul ref={listRef} className="space-y-4">
        {findings.map((finding, index) => (
          <li key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
            <span className="mt-0.5">{getIcon(finding.type)}</span>
            <span className="text-sm font-medium leading-relaxed">{finding.text}</span>
          </li>
        ))}
      </ul>
    </ResultCard>
  );
}
