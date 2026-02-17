"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { extractLocaleFromPathname, normalizeLocale, withLocalePrefix, type LocaleCode } from "@/lib/i18n";

const STORAGE_KEY = "brief_locale";

type LocaleContextValue = {
  locale: LocaleCode;
  setLocale: (next: LocaleCode) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readLocaleFromUrl(): LocaleCode | null {
  if (typeof window === "undefined") return null;
  const fromPath = extractLocaleFromPathname(window.location.pathname);
  if (fromPath) return fromPath;
  const raw = new URLSearchParams(window.location.search).get("lang");
  if (!raw) return null;
  return normalizeLocale(raw);
}

function detectInitialLocale(): LocaleCode {
  if (typeof window === "undefined") return "zh-CN";
  const fromQuery = new URLSearchParams(window.location.search).get("lang");
  if (fromQuery) return normalizeLocale(fromQuery);
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved) return normalizeLocale(saved);
  const nav = navigator.language || "";
  return normalizeLocale(nav);
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [locale, setLocale] = useState<LocaleCode>(() => {
    const fromPath = extractLocaleFromPathname(pathname || "");
    if (fromPath) return fromPath;
    return detectInitialLocale();
  });

  useEffect(() => {
    const fromPath = extractLocaleFromPathname(pathname || "");
    if (fromPath && fromPath !== locale) {
      setLocale(fromPath);
    }
  }, [pathname, locale]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;

    const url = new URL(window.location.href);
    let changed = false;
    const targetPath = withLocalePrefix(url.pathname, locale);
    if (url.pathname !== targetPath) {
      url.pathname = targetPath;
      changed = true;
    }
    if (url.searchParams.has("lang")) {
      url.searchParams.delete("lang");
      changed = true;
    }

    if (changed) {
      const q = url.searchParams.toString();
      const next = `${url.pathname}${q ? `?${q}` : ""}${url.hash}`;
      window.history.replaceState(window.history.state, "", next);
    }
  }, [locale]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPopstate = () => {
      const fromUrl = readLocaleFromUrl();
      if (!fromUrl) return;
      setLocale(fromUrl);
    };
    window.addEventListener("popstate", onPopstate);
    return () => window.removeEventListener("popstate", onPopstate);
  }, []);

  const value = useMemo<LocaleContextValue>(() => ({ locale, setLocale }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside LocaleProvider");
  return value;
}
