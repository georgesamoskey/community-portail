/** Référentiel multi-pays / multi-langues (aligné eagaseke). */

export const LOCALES = ["fr", "en", "rn", "sw"] as const;
export type Locale = (typeof LOCALES)[number];

export const COUNTRIES = ["BI", "CD", "RW", "TZ", "KE", "UG"] as const;
export type CountryCode = (typeof COUNTRIES)[number];

export const LOCALE_META: Record<
  Locale,
  { name: string; nativeName: string; bcp47: string }
> = {
  fr: { name: "French", nativeName: "Français", bcp47: "fr-FR" },
  en: { name: "English", nativeName: "English", bcp47: "en-GB" },
  rn: { name: "Kirundi", nativeName: "Ikirundi", bcp47: "rn-BI" },
  sw: { name: "Swahili", nativeName: "Kiswahili", bcp47: "sw-TZ" },
};

export const COUNTRY_META: Record<
  CountryCode,
  {
    name: string;
    currency: string;
    dial: string;
    languages: readonly Locale[];
    defaultLocale: Locale;
  }
> = {
  BI: {
    name: "Burundi",
    currency: "BIF",
    dial: "+257",
    languages: ["fr", "rn", "en"],
    defaultLocale: "fr",
  },
  CD: {
    name: "DR Congo",
    currency: "CDF",
    dial: "+243",
    languages: ["fr", "en"],
    defaultLocale: "fr",
  },
  RW: {
    name: "Rwanda",
    currency: "RWF",
    dial: "+250",
    languages: ["fr", "en", "rn"],
    defaultLocale: "fr",
  },
  TZ: {
    name: "Tanzania",
    currency: "TZS",
    dial: "+255",
    languages: ["en", "sw"],
    defaultLocale: "en",
  },
  KE: {
    name: "Kenya",
    currency: "KES",
    dial: "+254",
    languages: ["en", "sw"],
    defaultLocale: "en",
  },
  UG: {
    name: "Uganda",
    currency: "UGX",
    dial: "+256",
    languages: ["en", "sw"],
    defaultLocale: "en",
  },
};

export const LOCALE_COOKIE = "community_locale";
export const COUNTRY_COOKIE = "community_country";

export function isLocale(v: string | null | undefined): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}

export function isCountry(v: string | null | undefined): v is CountryCode {
  return !!v && (COUNTRIES as readonly string[]).includes(v.toUpperCase());
}

export function normalizeCountry(raw?: string | null): CountryCode {
  const c = (raw ?? "BI").toUpperCase();
  return isCountry(c) ? c : "BI";
}

export function normalizeLocale(
  raw?: string | null,
  country?: CountryCode,
): Locale {
  if (isLocale(raw ?? null)) {
    const loc = raw as Locale;
    if (country && !COUNTRY_META[country].languages.includes(loc)) {
      return COUNTRY_META[country].defaultLocale;
    }
    return loc;
  }
  return country
    ? COUNTRY_META[country].defaultLocale
    : "fr";
}

export function localeFromAcceptLanguage(
  header: string | null,
  country: CountryCode,
): Locale {
  const allowed = COUNTRY_META[country].languages;
  if (!header) return COUNTRY_META[country].defaultLocale;
  const prefs = header.split(",").map((p) => p.trim().split(";")[0].toLowerCase());
  for (const p of prefs) {
    const short = p.slice(0, 2) as Locale;
    if (allowed.includes(short)) return short;
  }
  return COUNTRY_META[country].defaultLocale;
}

export function formatMoney(
  amount: number | string | null | undefined,
  currency: string,
  locale: Locale,
): string {
  if (amount == null || amount === "") return "—";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(n)) return String(amount);
  try {
    return new Intl.NumberFormat(LOCALE_META[locale].bcp47, {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "BIF" || currency === "RWF" ? 0 : 2,
    }).format(n);
  } catch {
    return `${n.toLocaleString(LOCALE_META[locale].bcp47)} ${currency}`;
  }
}
