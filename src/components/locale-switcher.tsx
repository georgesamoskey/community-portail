"use client";

import { COUNTRY_META, LOCALE_META, type CountryCode, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/context";
import { cx } from "@/lib/cx";

export function LocaleSwitcher({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { locale, country, setLocale, setCountry, availableLocales, t } =
    useI18n();

  return (
    <div
      className={cx(
        "flex flex-wrap items-center gap-1.5",
        compact ? "text-xs" : "text-sm",
        className,
      )}
    >
      <label className="sr-only" htmlFor="i18n-country">
        {t("common.country")}
      </label>
      <select
        id="i18n-country"
        value={country}
        onChange={(e) => setCountry(e.target.value as CountryCode)}
        className="rounded-lg border border-ink/[0.1] bg-surface px-2 py-1.5 font-semibold text-ink-soft outline-none hover:border-brand-300"
        title={t("common.country")}
      >
        {(Object.keys(COUNTRY_META) as CountryCode[]).map((c) => (
          <option key={c} value={c}>
            {c} · {COUNTRY_META[c].name}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="i18n-locale">
        {t("common.language")}
      </label>
      <select
        id="i18n-locale"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="rounded-lg border border-ink/[0.1] bg-surface px-2 py-1.5 font-semibold text-ink-soft outline-none hover:border-brand-300"
        title={t("common.language")}
      >
        {availableLocales.map((l) => (
          <option key={l} value={l}>
            {LOCALE_META[l].nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
