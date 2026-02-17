import { BriefResult } from "@/lib/api";
import { ResultCard } from "./ResultCard";
import { AlertTriangle, CheckCircle2, ExternalLink, Info, ShieldAlert, Sparkles, XCircle } from "lucide-react";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { pickLocale, type LocaleCode } from "@/lib/i18n";

function riskMeta(score: number, locale: LocaleCode) {
  if (score >= 80) {
    return {
      label: pickLocale(locale, { en: "High Risk", "zh-CN": "高风险", "zh-TW": "高風險", ko: "고위험" }),
      color: "text-red-400 border-red-500/40 bg-red-500/10",
    };
  }
  if (score >= 55) {
    return {
      label: pickLocale(locale, { en: "Medium Risk", "zh-CN": "中风险", "zh-TW": "中風險", ko: "중위험" }),
      color: "text-amber-300 border-amber-400/40 bg-amber-400/10",
    };
  }
  return {
    label: pickLocale(locale, { en: "Lower Risk", "zh-CN": "相对低风险", "zh-TW": "相對低風險", ko: "상대적 저위험" }),
    color: "text-emerald-300 border-emerald-400/40 bg-emerald-400/10",
  };
}

function sourceMeta(status: "live" | "fallback" | "disabled") {
  if (status === "live") return "text-emerald-300 border-emerald-400/35 bg-emerald-500/10";
  if (status === "fallback") return "text-amber-200 border-amber-400/35 bg-amber-500/10";
  return "text-white/50 border-white/15 bg-white/5";
}

function sourceName(id: NonNullable<BriefResult["runtime"]>["sources"][number]["id"], locale: LocaleCode): string {
  const map: Record<string, string> = {
    bsc_rpc: pickLocale(locale, { en: "RPC Node", "zh-CN": "链上节点", "zh-TW": "鏈上節點", ko: "RPC 노드" }),
    dexscreener: pickLocale(locale, { en: "Market Data", "zh-CN": "市场数据", "zh-TW": "市場數據", ko: "시장 데이터" }),
    moralis: pickLocale(locale, { en: "Holder Data", "zh-CN": "持仓数据", "zh-TW": "持倉數據", ko: "보유 데이터" }),
    frontrun: pickLocale(locale, { en: "Address Profile", "zh-CN": "地址画像", "zh-TW": "地址畫像", ko: "주소 프로필" }),
    memeradar: pickLocale(locale, { en: "Tag Signals", "zh-CN": "标签信号", "zh-TW": "標籤信號", ko: "태그 신호" }),
    arkham: pickLocale(locale, { en: "Intel Labels", "zh-CN": "情报标签", "zh-TW": "情報標籤", ko: "인텔 라벨" }),
    gmgn: pickLocale(locale, { en: "Trade Profile", "zh-CN": "交易画像", "zh-TW": "交易畫像", ko: "거래 프로필" }),
    bscscan: pickLocale(locale, { en: "Explorer", "zh-CN": "链上浏览器", "zh-TW": "鏈上瀏覽器", ko: "익스플로러" }),
    openrouter: pickLocale(locale, { en: "Text Summary", "zh-CN": "文本总结", "zh-TW": "文本總結", ko: "텍스트 요약" }),
  };
  return map[id] || id;
}

function statusName(status: "live" | "fallback" | "disabled", locale: LocaleCode): string {
  if (status === "live") return pickLocale(locale, { en: "live", "zh-CN": "可用", "zh-TW": "可用", ko: "가동" });
  if (status === "fallback") return pickLocale(locale, { en: "fallback", "zh-CN": "回退", "zh-TW": "回退", ko: "폴백" });
  return pickLocale(locale, { en: "disabled", "zh-CN": "未启用", "zh-TW": "未啟用", ko: "비활성" });
}

function evidenceName(label: string, locale: LocaleCode): string {
  const map: Record<string, string> = {
    BscScan: pickLocale(locale, { en: "Explorer", "zh-CN": "链上浏览器", "zh-TW": "鏈上瀏覽器", ko: "익스플로러" }),
    DEX: pickLocale(locale, { en: "Liquidity Pool", "zh-CN": "交易池", "zh-TW": "交易池", ko: "유동성 풀" }),
    Pair: pickLocale(locale, { en: "Pair", "zh-CN": "交易对", "zh-TW": "交易對", ko: "페어" }),
    Creator: pickLocale(locale, { en: "Creator", "zh-CN": "部署者", "zh-TW": "部署者", ko: "배포자" }),
    "Creation Tx": pickLocale(locale, { en: "Creation Tx", "zh-CN": "创建交易", "zh-TW": "建立交易", ko: "생성 트랜잭션" }),
    Arkham: pickLocale(locale, { en: "Intel Labels", "zh-CN": "情报标签", "zh-TW": "情報標籤", ko: "인텔 라벨" }),
    GMGN: pickLocale(locale, { en: "Trade Profile", "zh-CN": "交易画像", "zh-TW": "交易畫像", ko: "거래 프로필" }),
    "GMGN Token": pickLocale(locale, { en: "Trade Profile", "zh-CN": "交易画像", "zh-TW": "交易畫像", ko: "거래 프로필" }),
    "Token Holders": pickLocale(locale, { en: "Holder Distribution", "zh-CN": "持币分布", "zh-TW": "持幣分佈", ko: "홀더 분포" }),
    Owner: pickLocale(locale, { en: "Contract Owner", "zh-CN": "合约所有者", "zh-TW": "合約所有者", ko: "컨트랙트 소유자" }),
    "Address Label Source": pickLocale(locale, { en: "Address Profile", "zh-CN": "地址画像", "zh-TW": "地址畫像", ko: "주소 프로필" }),
  };
  return map[label] || label;
}

function shortAddress(addr: string): string {
  const s = String(addr || "").trim();
  if (!s) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function findingIcon(type: BriefResult["findings"][number]["type"]) {
  if (type === "critical") return <XCircle className="h-4 w-4 text-red-400" />;
  if (type === "warning") return <AlertTriangle className="h-4 w-4 text-amber-300" />;
  if (type === "success") return <CheckCircle2 className="h-4 w-4 text-emerald-300" />;
  return <Info className="h-4 w-4 text-sky-300" />;
}

export function OneShotBrief({ result, locale }: { result: BriefResult; locale: LocaleCode }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const risk = riskMeta(result.riskScore, locale);
  const meme = result.enrich?.meme;
  const hasMemeSignals = Boolean(
    meme &&
      (typeof meme.whaleTop10Pct === "number" ||
        (meme.suspiciousHolderCount || 0) > 0 ||
        Boolean(meme.devAddress) ||
        (meme.newWalletHolderCount || 0) > 0)
  );
  const runtimeMode =
    result.runtime?.mode === "enhanced"
      ? pickLocale(locale, { en: "Enhanced", "zh-CN": "增强模式", "zh-TW": "增強模式", ko: "강화 모드" })
      : pickLocale(locale, { en: "Fallback", "zh-CN": "回退模式", "zh-TW": "回退模式", ko: "폴백 모드" });

  useGSAP(() => {
    if (!bodyRef.current) return;
    gsap.fromTo(
      bodyRef.current.querySelectorAll("[data-oneshot-block]"),
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: "power2.out" }
    );
    gsap.fromTo(
      bodyRef.current.querySelectorAll("[data-oneshot-chip]"),
      { opacity: 0, scale: 0.94 },
      { opacity: 1, scale: 1, duration: 0.3, stagger: 0.02, delay: 0.2, ease: "back.out(1.4)" }
    );
  }, { scope: bodyRef });

  return (
    <ResultCard
      title={pickLocale(locale, { en: "One-Shot Brief", "zh-CN": "一键简报", "zh-TW": "一鍵簡報", ko: "원샷 브리프" })}
      className="border-l-primary/70 bg-gradient-to-br from-card via-card/90 to-primary/5"
    >
      <div ref={bodyRef} className="space-y-5">
        <section data-oneshot-block className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/15 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-widest text-white/60">
              {pickLocale(locale, { en: "Address", "zh-CN": "地址", "zh-TW": "地址", ko: "주소" })}
            </div>
            <div className={`rounded-full border px-2.5 py-1 text-xs ${risk.color}`}>{risk.label}</div>
          </div>
          <div className="break-all font-mono text-sm text-white/90">{result.address}</div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
            <ShieldAlert className="h-3.5 w-3.5" />
            {pickLocale(locale, { en: "Risk Score", "zh-CN": "风险分", "zh-TW": "風險分", ko: "위험 점수" })}：{result.riskScore}
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80">
            {pickLocale(locale, { en: "Data Mode", "zh-CN": "数据模式", "zh-TW": "數據模式", ko: "데이터 모드" })}：{runtimeMode}
          </div>
        </section>

        <section data-oneshot-block className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/60">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {pickLocale(locale, { en: "Summary", "zh-CN": "结论摘要", "zh-TW": "結論摘要", ko: "요약" })}
          </div>
          <p className="text-lg font-semibold leading-relaxed text-white/95">{result.tldr}</p>
        </section>

        <section data-oneshot-block className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="mb-2 text-xs uppercase tracking-widest text-white/60">
            {pickLocale(locale, { en: "Explanation", "zh-CN": "人话解释", "zh-TW": "白話解釋", ko: "설명" })}
          </div>
          <p className="text-base leading-relaxed text-white/85">{result.explanation}</p>
        </section>

        <section data-oneshot-block className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 text-xs uppercase tracking-widest text-white/60">
            {pickLocale(locale, { en: "Key Findings", "zh-CN": "关键结论", "zh-TW": "關鍵結論", ko: "핵심 결론" })}
          </div>
          <div className="space-y-2.5">
            {result.findings.map((f, idx) => (
              <div key={`${f.type}-${idx}`} className="flex items-start gap-2.5 rounded-lg bg-black/15 px-3 py-2">
                <span className="mt-0.5">{findingIcon(f.type)}</span>
                <span className="text-sm leading-relaxed text-white/90">{f.text}</span>
              </div>
            ))}
          </div>
        </section>

        {hasMemeSignals ? (
          <section data-oneshot-block className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 text-xs uppercase tracking-widest text-white/60">
              {pickLocale(locale, { en: "Meme Core Signals", "zh-CN": "Meme 核心信号", "zh-TW": "Meme 核心信號", ko: "Meme 핵심 신호" })}
            </div>
            <div className="space-y-2.5 text-sm text-white/90">
              {typeof meme?.whaleTop10Pct === "number" ? (
                <div className="rounded-lg bg-black/15 px-3 py-2">
                  {pickLocale(locale, {
                    en: `Whale concentration (Top10): ${meme.whaleTop10Pct.toFixed(2)}%`,
                    "zh-CN": `Whale 集中度（Top10）：${meme.whaleTop10Pct.toFixed(2)}%`,
                    "zh-TW": `Whale 集中度（Top10）：${meme.whaleTop10Pct.toFixed(2)}%`,
                    ko: `Whale 집중도(Top10): ${meme.whaleTop10Pct.toFixed(2)}%`,
                  })}
                </div>
              ) : null}
              {meme?.topHolderDetails?.length ? (
                <div className="rounded-lg bg-black/15 px-3 py-2">
                  <div className="mb-2 text-xs text-white/60">
                    {pickLocale(locale, {
                      en: "Top Holder Addresses",
                      "zh-CN": "Top 持币地址",
                      "zh-TW": "Top 持幣地址",
                      ko: "상위 홀더 주소",
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {meme.topHolderDetails.slice(0, 10).map((h) => (
                      <a
                        key={h.address}
                        href={`https://bscscan.com/address/${h.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs text-primary hover:bg-primary/20"
                      >
                        <span>#{h.rank || "-"}</span>
                        <span>{shortAddress(h.address)}</span>
                        {typeof h.pctOfSupply === "number" ? <span className="text-white/65">({h.pctOfSupply.toFixed(2)}%)</span> : null}
                        {h.isNewWallet ? (
                          <span className="rounded-full border border-amber-300/35 bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-200">
                            {pickLocale(locale, { en: "New", "zh-CN": "新钱包", "zh-TW": "新錢包", ko: "신규" })}
                          </span>
                        ) : null}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
              {(meme?.suspiciousHolderCount || 0) > 0 ? (
                <div className="rounded-lg bg-black/15 px-3 py-2">
                  {pickLocale(locale, {
                    en: `Suspicious holder cluster: ${meme?.suspiciousHolderCount}`,
                    "zh-CN": `可疑地址聚类数量：${meme?.suspiciousHolderCount}`,
                    "zh-TW": `可疑地址聚類數量：${meme?.suspiciousHolderCount}`,
                    ko: `의심 주소 군집 수: ${meme?.suspiciousHolderCount}`,
                  })}
                </div>
              ) : null}
              {meme?.devAddress ? (
                <div className="rounded-lg bg-black/15 px-3 py-2">
                  {pickLocale(locale, {
                    en: `Dev trace (lite): ${meme.devAddress}`,
                    "zh-CN": `Dev Trace（轻量）：${meme.devAddress}`,
                    "zh-TW": `Dev Trace（輕量）：${meme.devAddress}`,
                    ko: `Dev Trace(라이트): ${meme.devAddress}`,
                  })}
                  {meme.devInTopHolders ? (
                    <span className="ml-2 text-amber-300">
                      {pickLocale(locale, {
                        en: "(also in top holders)",
                        "zh-CN": "（同时位于 Top 持币地址）",
                        "zh-TW": "（同時位於 Top 持幣地址）",
                        ko: "(상위 홀더에도 포함)",
                      })}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {(meme?.newWalletHolderCount || 0) > 0 ? (
                <div className="rounded-lg bg-black/15 px-3 py-2">
                  {pickLocale(locale, {
                    en: `New wallets in top holders: ${meme?.newWalletHolderCount}`,
                    "zh-CN": `Top 持币中的新钱包：${meme?.newWalletHolderCount}`,
                    "zh-TW": `Top 持幣中的新錢包：${meme?.newWalletHolderCount}`,
                    ko: `상위 홀더 내 신규 지갑: ${meme?.newWalletHolderCount}`,
                  })}
                  {(meme?.newWalletAddresses?.length || 0) > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(meme?.newWalletAddresses || []).slice(0, 10).map((a) => (
                        <a
                          key={a}
                          href={`https://bscscan.com/address/${a}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-amber-300/35 bg-amber-400/10 px-2.5 py-1 text-xs text-amber-200 hover:bg-amber-400/20"
                        >
                          <span>{shortAddress(a)}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <section data-oneshot-block className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 text-xs uppercase tracking-widest text-white/60">
            {pickLocale(locale, { en: "Evidence & Sources", "zh-CN": "证据与来源", "zh-TW": "證據與來源", ko: "증거 및 출처" })}
          </div>
          <div className="flex flex-wrap gap-2">
            {result.evidence.map((e, idx) => (
              <a
                key={`${e.label}-${idx}`}
                href={e.url}
                target="_blank"
                rel="noopener noreferrer"
                data-oneshot-chip
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs text-primary transition-colors hover:bg-primary/20"
              >
                <span>{evidenceName(e.label, locale)}</span>
                {e.value ? <span className="text-white/60">({e.value})</span> : null}
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        </section>

        {result.runtime?.sources?.length ? (
          <section data-oneshot-block className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 text-xs uppercase tracking-widest text-white/60">
              {pickLocale(locale, { en: "Source Status", "zh-CN": "数据源状态", "zh-TW": "數據源狀態", ko: "소스 상태" })}
            </div>
            <div className="flex flex-wrap gap-2">
              {result.runtime.sources.map((s) => (
                <span
                  key={s.id}
                  data-oneshot-chip
                  title={s.note || ""}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${sourceMeta(s.status)}`}
                >
                  {sourceName(s.id, locale)}
                  <span className="uppercase text-[10px] opacity-80">{statusName(s.status, locale)}</span>
                </span>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </ResultCard>
  );
}
