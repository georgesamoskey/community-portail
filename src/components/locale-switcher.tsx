"use client";

import { LOCALE_META, type CountryCode, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/context";
import { CountrySelect } from "@/components/country-select";
import { cx } from "@/lib/cx";

/** Langue (et pays optionnel) — aussi dans /app. */
export function LocaleSwitcher({
  className,
  compact,
  /** Si false : langue seule (pas de pays). */
  showCountry = true,
}: {
  className?: string;
  compact?: boolean;
  showCountry?: boolean;
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
      {showCountry ? (
        <>
          <label className="sr-only" htmlFor="i18n-country">
            {t("common.country")}
          </label>
          <CountrySelect
            id="i18n-country"
            value={country}
            onChange={(c: CountryCode) => setCountry(c)}
            showDial={false}
            className={cx(
              "!rounded-lg !border-ink/[0.1] !py-1.5 !pl-8 !pr-6 !text-xs !font-semibold !shadow-none sm:!text-sm",
              compact && "!py-1 !text-[11px]",
            )}
          />
        </>
      ) : null}
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
