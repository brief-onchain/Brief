export const SUPPORTED_LOCALES = ["en", "zh-CN", "zh-TW", "ko"] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number];

export type LocaleTextMap<T> = {
  en: T;
  "zh-CN": T;
  "zh-TW"?: T;
  ko: T;
};

export function normalizeLocale(input?: string | null): LocaleCode {
  const raw = String(input || "").trim().toLowerCase();
  if (!raw) return "zh-CN";

  if (raw === "en" || raw.startsWith("en-")) return "en";
  if (raw === "ko" || raw === "kr" || raw.startsWith("ko-")) return "ko";
  if (raw === "zh-tw" || raw === "zh-hant" || raw.startsWith("zh-hk") || raw.startsWith("zh-mo")) return "zh-TW";
  if (raw === "zh" || raw === "cn" || raw === "zh-cn" || raw === "zh-hans" || raw.startsWith("zh-")) return "zh-CN";
  return "zh-CN";
}

export function pickLocale<T>(locale: LocaleCode, map: LocaleTextMap<T>): T {
  if (locale === "zh-TW") return map["zh-TW"] ?? map["zh-CN"];
  if (locale === "ko") return map.ko;
  if (locale === "en") return map.en;
  return map["zh-CN"];
}

export function toIntlLocale(locale: LocaleCode): string {
  if (locale === "zh-CN") return "zh-CN";
  if (locale === "zh-TW") return "zh-TW";
  if (locale === "ko") return "ko-KR";
  return "en-US";
}

export function localeLabel(locale: LocaleCode): string {
  if (locale === "en") return "English";
  if (locale === "zh-CN") return "简体中文";
  if (locale === "zh-TW") return "繁體中文";
  return "한국어";
}

export function isZhLocale(locale: LocaleCode): boolean {
  return locale === "zh-CN" || locale === "zh-TW";
}
