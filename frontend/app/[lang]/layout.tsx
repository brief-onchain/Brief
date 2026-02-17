import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocaleCode, pickLocale, SUPPORTED_LOCALES, type LocaleCode } from "@/lib/i18n";

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale: LocaleCode = isLocaleCode(lang) ? lang : "zh-CN";

  return {
    title: pickLocale(locale, {
      en: "Brief | Onchain Research",
      "zh-CN": "简报 | 链上研究",
      "zh-TW": "簡報 | 鏈上研究",
      ko: "Brief | 온체인 리서치",
    }),
    description: pickLocale(locale, {
      en: "Analyze any BNB Chain address or contract and generate a concise brief instantly.",
      "zh-CN": "输入任意地址、合约或问题，一键生成链上结论。",
      "zh-TW": "輸入任意地址、合約或問題，一鍵生成鏈上結論。",
      ko: "BNB 체인 주소/컨트랙트/질문을 입력하면 간결한 온체인 브리프를 즉시 생성합니다.",
    }),
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocaleCode(lang)) notFound();
  return children;
}
