"use client";

import { localeLabel, SUPPORTED_LOCALES, type LocaleCode } from "@/lib/i18n";
import { useLocale } from "./LocaleProvider";

export function LanguageSwitch({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as LocaleCode)}
      className={`rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-xs text-white/85 outline-none transition-colors hover:border-primary/45 focus:border-primary/55 ${className}`.trim()}
      aria-label="Language"
    >
      {SUPPORTED_LOCALES.map((item) => (
        <option key={item} value={item}>
          {localeLabel(item)}
        </option>
      ))}
    </select>
  );
}
