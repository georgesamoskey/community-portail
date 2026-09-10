"use client";

import Link from "next/link";
import { cx } from "@/lib/cx";
import {
  LOCALE_COOKIE,
  LOCALE_META,
  formatMoney,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n/config";

function cookieLocale(): Locale {
  if (typeof document === "undefined") return "fr";
  const m = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`),
  );
  return normalizeLocale(m ? decodeURIComponent(m[1]) : null);
}
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="social-rise">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-mute">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Alert({
  tone = "amber",
  children,
}: {
  tone?: "amber" | "rose" | "teal" | "sky";
  children: React.ReactNode;
}) {
  const styles = {
    amber: "bg-amber-50 text-amber-950 border-amber-200/80",
    rose: "bg-brand-50 text-brand-900 border-brand-200",
    teal: "bg-mint-50 text-mint-900 border-mint-200",
    sky: "bg-sky-50 text-sky-950 border-sky-200/80",
  }[tone];
  return (
    <div
      className={cx(
        "rounded-2xl border px-4 py-3 text-sm leading-relaxed",
        styles,
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2.5xl border border-dashed border-ink/10 bg-surface/60 px-8 py-10 text-center text-sm leading-relaxed text-ink-mute">
      {children}
    </div>
  );
}

export function Panel({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-2.5xl border border-ink/[0.06] bg-surface p-5 shadow-soft",
        className,
      )}
    >
      {title ? (
        <h2 className="mb-4 font-display text-lg font-semibold tracking-tight text-ink">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-ink-mute">
      {label}
      <div className="mt-1.5">{children}</div>
      {hint ? (
        <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-ink-faint">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-ink/[0.08] bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20";

export function Btn({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "mint";
}) {
  const styles = {
    primary:
      "bg-brand-500 text-white hover:bg-brand-600 shadow-lift active:scale-[0.98]",
    secondary:
      "border border-ink/[0.1] bg-surface text-ink hover:bg-brand-50 hover:border-brand-200",
    mint: "bg-mint-600 text-white hover:bg-mint-700 shadow-soft",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    ghost: "text-ink-soft hover:bg-ink/[0.04] hover:text-ink",
  }[variant];
  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
        styles,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "ok" | "warn" | "bad" | "info";
}) {
  const styles = {
    neutral: "bg-ink/[0.05] text-ink-soft",
    ok: "bg-mint-100 text-mint-800",
    warn: "bg-amber-100 text-amber-900",
    bad: "bg-brand-100 text-brand-800",
    info: "bg-sky-100 text-sky-900",
  }[tone];
  return (
    <span
      className={cx(
        "inline-flex rounded-lg px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        styles,
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(
  status?: string | null,
): "neutral" | "ok" | "warn" | "bad" | "info" {
  const s = (status ?? "").toLowerCase();
  if (
    ["active", "confirmed", "completed", "paid", "approved", "success"].some(
      (x) => s.includes(x),
    )
  )
    return "ok";
  if (
    ["pending", "invited", "processing", "draft", "open"].some((x) =>
      s.includes(x),
    )
  )
    return "warn";
  if (
    ["rejected", "cancelled", "canceled", "failed", "defaulted"].some((x) =>
      s.includes(x),
    )
  )
    return "bad";
  if (["closed", "archived"].some((x) => s.includes(x))) return "info";
  return "neutral";
}

export function money(
  amount: number | string | null | undefined,
  currency = "BIF",
): string {
  return formatMoney(amount, currency, cookieLocale());
}

export function formatDateTime(value: string | number | Date): string {
  try {
    const d = value instanceof Date ? value : new Date(value);
    return d.toLocaleString(LOCALE_META[cookieLocale()].bcp47);
  } catch {
    return String(value);
  }
}

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ id: T; label: string; hint?: string }>;
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      role="tablist"
      className="sticky top-[4.5rem] z-20 flex gap-1 overflow-x-auto rounded-2xl border border-ink/[0.06] bg-surface/95 p-1 shadow-soft backdrop-blur-md"
    >
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            title={t.hint}
            onClick={() => onChange(t.id)}
            className={cx(
              "whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition",
              active
                ? "bg-surface text-ink shadow-soft"
                : "text-ink-mute hover:text-ink",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function NextStepCard({
  title,
  description,
  href,
  cta,
  tone = "brand",
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
  tone?: "brand" | "mint" | "ink";
}) {
  const tones = {
    brand: "from-brand-500/15 via-surface to-surface border-brand-200/60",
    mint: "from-mint-500/15 via-surface to-surface border-mint-200/60",
    ink: "from-ink/5 via-surface to-surface border-ink/[0.08]",
  }[tone];
  return (
    <Link
      href={href}
      className={cx(
        "block rounded-2.5xl border bg-gradient-to-br p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift",
        tones,
      )}
    >
      <p className="font-display text-lg font-bold tracking-tight text-ink">
        {title}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-ink-mute">{description}</p>
      <span className="mt-4 inline-flex text-sm font-bold text-brand-600">
        {cta} →
      </span>
    </Link>
  );
}
