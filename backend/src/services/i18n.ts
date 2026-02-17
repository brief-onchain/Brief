import { z } from "zod";

export const SupportedLocaleSchema = z.enum(["en", "zh-CN", "zh-TW", "ko"]);
export type Locale = z.infer<typeof SupportedLocaleSchema>;

export type LocaleTextMap<T> = {
  en: T;
  "zh-CN": T;
  "zh-TW"?: T;
  ko: T;
};

export function normalizeLocale(input?: string | null): Locale {
  const raw = String(input || "").trim().toLowerCase();
  if (!raw) return "zh-CN";

  if (raw === "en" || raw.startsWith("en-")) return "en";
  if (raw === "ko" || raw === "kr" || raw.startsWith("ko-")) return "ko";
  if (raw === "zh-tw" || raw === "zh-hant" || raw.startsWith("zh-hk") || raw.startsWith("zh-mo")) return "zh-TW";
  if (raw === "zh" || raw === "cn" || raw === "zh-cn" || raw === "zh-hans" || raw.startsWith("zh-")) return "zh-CN";
  return "zh-CN";
}

export function pickLocaleText<T>(locale: Locale, map: LocaleTextMap<T>): T {
  if (locale === "zh-TW") return map["zh-TW"] ?? map["zh-CN"];
  if (locale === "ko") return map.ko;
  if (locale === "en") return map.en;
  return map["zh-CN"];
}

export function isZhLocale(locale: Locale): boolean {
  return locale === "zh-CN" || locale === "zh-TW";
}

export function joinHumanList(locale: Locale, values: string[]): string {
  if (values.length === 0) return "";
  if (isZhLocale(locale)) return values.join("、");
  return values.join(", ");
}

export function sentenceJoin(locale: Locale, parts: string[]): string {
  if (isZhLocale(locale)) return parts.join("");
  return parts.join(" ");
}
