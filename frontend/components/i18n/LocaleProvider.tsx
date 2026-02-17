"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { normalizeLocale, type LocaleCode } from "@/lib/i18n";

const STORAGE_KEY = "brief_locale";

type LocaleContextValue = {
  locale: LocaleCode;
  setLocale: (next: LocaleCode) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function detectInitialLocale(): LocaleCode {
  if (typeof window === "undefined") return "zh-CN";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved) return normalizeLocale(saved);
  const nav = navigator.language || "";
  return normalizeLocale(nav);
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<LocaleCode>("zh-CN");

  useEffect(() => {
    setLocale(detectInitialLocale());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LocaleContextValue>(() => ({ locale, setLocale }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside LocaleProvider");
  return value;
}
