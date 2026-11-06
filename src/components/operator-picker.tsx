"use client";

import { OperatorLogo } from "@/components/operator-logo";
import { resolveOperatorLogo } from "@/lib/pawapay-logos";
import {
  providerLabel,
  providerOptionKey,
  providerSlug,
  type MmProvider,
} from "@/lib/mm-market";
import { cx } from "@/lib/cx";

type Props = {
  providers: MmProvider[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
};

/** Grille d’opérateurs avec logos (sans téléphone / devise). */
export function OperatorPicker({ providers, value, onChange, className }: Props) {
  return (
    <div
      className={cx("grid grid-cols-2 gap-2 sm:grid-cols-3", className)}
      role="group"
    >
      {providers.map((item) => {
        const key = providerOptionKey(item);
        const on = value === key;
        const label = providerLabel(item);
        return (
          <button
            key={key}
            type="button"
            className={
              on
                ? "flex items-center gap-2 rounded-2xl border-2 border-brand-600 bg-brand-50 px-2.5 py-2 text-left"
                : "flex items-center gap-2 rounded-2xl border border-ink/15 bg-surface px-2.5 py-2 text-left hover:border-brand-400"
            }
            onClick={() => onChange(key)}
          >
            <OperatorLogo
              slug={providerSlug(item)}
              network={item.network}
              apiLogoUrl={resolveOperatorLogo({
                slug: providerSlug(item),
                network: item.network,
                apiLogoUrl: item.logoUrl,
              })}
              label={label}
              size="sm"
            />
            <span className="truncate text-xs font-bold text-ink">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
