"use client";

import { type CountryCode } from "@/lib/i18n/config";
import { countryOptions, countryFlag } from "@/lib/country-flag";
import { cx } from "@/lib/cx";

type Props = {
  value: CountryCode;
  onChange: (code: CountryCode) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  showDial?: boolean;
};

/**
 * Sélecteur pays : drapeau une seule fois (à gauche).
 * Les <option> n’incluent PAS le drapeau (sinon double affichage).
 */
export function CountrySelect({
  value,
  onChange,
  disabled,
  id,
  className,
  showDial = true,
}: Props) {
  const opts = countryOptions();

  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-base leading-none sm:left-3"
        aria-hidden
      >
        {countryFlag(value)}
      </span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as CountryCode)}
        className={cx(
          "w-full appearance-none rounded-xl border border-ink/[0.1] bg-surface py-2.5 pl-10 pr-8 text-sm font-semibold text-ink outline-none transition hover:border-brand-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:opacity-60",
          className,
        )}
      >
        {opts.map((o) => (
          <option key={o.code} value={o.code}>
            {showDial ? `${o.dial} · ${o.name}` : o.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Pastille compacte drapeau + code pays. */
export function CountryBadge({
  code,
  className,
}: {
  code?: string | null;
  className?: string;
}) {
  if (!code) return null;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-md bg-surface-sunken px-1.5 py-0.5 text-[11px] font-bold text-ink-soft",
        className,
      )}
      title={code}
    >
      <span aria-hidden>{countryFlag(code)}</span>
      <span>{code.toUpperCase()}</span>
    </span>
  );
}
