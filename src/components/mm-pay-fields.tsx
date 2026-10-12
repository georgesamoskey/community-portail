"use client";

import { useEffect, useMemo, useState } from "react";
import { Field, inputClass } from "@/lib/ui";
import { useBff } from "@/lib/use-bff";
import { useI18n } from "@/lib/i18n/context";
import { normalizeList } from "@/lib/portal-api";
import { countryLabel } from "@/lib/country-flag";
import { normalizeCountry } from "@/lib/i18n/config";
import {
  marketCurrencies,
  marketDial,
  providerLabel,
  providerOptionKey,
  providerSlug,
  providersPath,
  railSlug,
  retargetPhone,
  type MmProvider,
} from "@/lib/mm-market";

type Props = {
  country: string;
  capability: "collection" | "disbursement";
  provider: string;
  onProvider: (slug: string) => void;
  phone: string;
  onPhone: (phone: string) => void;
  currency?: string;
  onCurrency?: (currency: string) => void;
};

/** Opérateur, indicatif et devise suivent le pays choisi. */
export function MmPayFields({
  country,
  capability,
  provider,
  onProvider,
  phone,
  onPhone,
  currency,
  onCurrency,
}: Props) {
  const { t } = useI18n();
  const code = country ? normalizeCountry(country) : "";
  const res = useBff<unknown>(code ? providersPath(code, capability) : null);
  const list = useMemo(
    () => normalizeList<MmProvider>(res.data, ["items", "providers", "data"]),
    [res.data],
  );
  const [picked, setPicked] = useState(provider);
  const selected =
    list.find((item) => providerOptionKey(item) === picked) ??
    list.find((item) => providerSlug(item) === railSlug(provider)) ??
    null;
  const dial = code ? marketDial(code) : "";
  const currencies = code ? marketCurrencies(code, selected) : [];
  const activeCurrency = currencies.includes(currency ?? "")
    ? (currency as string)
    : (currencies[0] ?? "");

  useEffect(() => {
    if (!list.length) return;
    const current = list.find((item) => providerOptionKey(item) === picked);
    if (current) {
      const slug = providerOptionKey(current);
      if (slug !== provider) onProvider(slug);
      return;
    }
    const first = providerOptionKey(list[0]);
    if (!first) return;
    setPicked(first);
    onProvider(first);
  }, [list, picked, provider, onProvider]);

  useEffect(() => {
    if (!onCurrency || !activeCurrency || activeCurrency === currency) return;
    onCurrency(activeCurrency);
  }, [activeCurrency, currency, onCurrency]);

  useEffect(() => {
    if (!dial) return;
    const next = retargetPhone(phone, dial);
    if (next !== phone) onPhone(next);
    // Le numéro n’est relu qu’au changement d’indicatif.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dial]);

  return (
    <>
      {code ? (
        <p className="text-xs font-semibold text-ink-mute">
          {countryLabel(code, { withDial: true })}
          {activeCurrency ? ` · ${activeCurrency}` : ""}
        </p>
      ) : null}
      <Field label={t("payments.currency")}>
        <select
          className={inputClass}
          value={activeCurrency}
          disabled={!onCurrency || currencies.length < 2}
          onChange={(e) => onCurrency?.(e.target.value)}
        >
          {currencies.map((cur) => (
            <option key={cur} value={cur}>
              {cur}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("tontines.phoneE164")}>
        <input
          className={inputClass}
          value={phone}
          onChange={(e) => onPhone(e.target.value)}
          placeholder={dial || "+"}
          inputMode="tel"
          autoComplete="tel"
        />
      </Field>
      <Field label={t("payments.operator")}>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("payments.operator")}>
          {list.map((item) => {
            const key = providerOptionKey(item);
            const on = picked === key;
            return (
              <button
                key={key}
                type="button"
                className={
                  on
                    ? "rounded-full border border-brand-600 bg-brand-50 px-3 py-2 text-sm font-bold text-brand-800"
                    : "rounded-full border border-ink/15 bg-surface px-3 py-2 text-sm font-semibold text-ink"
                }
                onClick={() => {
                  setPicked(key);
                  if (key) onProvider(key);
                }}
              >
                {providerLabel(item)}
              </button>
            );
          })}
        </div>
      </Field>
    </>
  );
}
