"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  COUNTRY_META,
  COUNTRY_COOKIE,
  LOCALE_COOKIE,
  LOCALE_META,
  type CountryCode,
  type Locale,
  formatMoney,
  normalizeCountry,
  normalizeLocale,
} from "./config";
import { messages, tPath, type MessageTree } from "./messages";

type I18nContextValue = {
  locale: Locale;
  country: CountryCode;
  messages: MessageTree;
  t: (path: string, params?: Record<string, string | number>) => string;
  money: (amount: number | string | null | undefined, currency?: string) => string;
  setLocale: (locale: Locale) => void;
  setCountry: (country: CountryCode) => void;
  availableLocales: readonly Locale[];
};

const I18nContext = createContext<I18nContextValue | null>(null);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=31536000;samesite=lax`;
}

export function I18nProvider({
  children,
  initialLocale,
  initialCountry,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
  initialCountry?: CountryCode;
}) {
  const [country, setCountryState] = useState<CountryCode>(
    () =>
      normalizeCountry(
        initialCountry ??
          (typeof document !== "undefined"
            ? readCookie(COUNTRY_COOKIE)
            : null) ??
          "BI",
      ),
  );
  const [locale, setLocaleState] = useState<Locale>(() =>
    normalizeLocale(
      initialLocale ??
        (typeof document !== "undefined" ? readCookie(LOCALE_COOKIE) : null),
      country,
    ),
  );

  useEffect(() => {
    document.documentElement.lang = LOCALE_META[locale].bcp47;
  }, [locale]);

  const persistProfile = useCallback(async (nextLocale: Locale, nextCountry: CountryCode) => {
    try {
      await fetch("/api/eagaseke/users/preferences", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayPreferences: { language: nextLocale },
        }),
      });
      await fetch("/api/eagaseke/users/profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            preferredLanguage: nextLocale,
            country: nextCountry,
          },
        }),
      });
    } catch {
      /* offline / non connecté */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/eagaseke/users/me", {
          credentials: "include",
        });
        if (!res.ok || cancelled) return;
        const me = (await res.json()) as {
          profile?: { preferredLanguage?: string; country?: string };
        };
        const c = normalizeCountry(me.profile?.country);
        const loc = normalizeLocale(me.profile?.preferredLanguage, c);
        if (cancelled) return;
        setCountryState(c);
        setLocaleState(loc);
        writeCookie(COUNTRY_COOKIE, c);
        writeCookie(LOCALE_COOKIE, loc);
      } catch {
        /* invité */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback(
    (next: Locale) => {
      const loc = normalizeLocale(next, country);
      setLocaleState(loc);
      writeCookie(LOCALE_COOKIE, loc);
      void persistProfile(loc, country);
    },
    [country, persistProfile],
  );

  const setCountry = useCallback(
    (nextRaw: CountryCode) => {
      const next = normalizeCountry(nextRaw);
      setCountryState(next);
      writeCookie(COUNTRY_COOKIE, next);
      const loc = normalizeLocale(locale, next);
      setLocaleState(loc);
      writeCookie(LOCALE_COOKIE, loc);
      void persistProfile(loc, next);
    },
    [locale, persistProfile],
  );

  const tree = messages[locale] ?? messages.fr;

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      country,
      messages: tree as MessageTree,
      t: (path, params) => tPath(tree as MessageTree, path, params),
      money: (amount, currency) =>
        formatMoney(
          amount,
          currency ?? COUNTRY_META[country].currency,
          locale,
        ),
      setLocale,
      setCountry,
      availableLocales: COUNTRY_META[country].languages,
    }),
    [locale, country, tree, setLocale, setCountry],
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
