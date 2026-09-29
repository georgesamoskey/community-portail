"use client";

import Link from "next/link";
import { cx } from "@/lib/cx";
import { Badge, money, statusTone } from "@/lib/ui";
import { haptic } from "@/lib/native";

/** Header gradient coins arrondis — ISO HomeHeader / ProfileSummary Android. */
export function MobileHero({
  children,
  className,
  compact,
}: {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <section
      className={cx(
        "mobile-trust-gradient overflow-hidden text-white shadow-lift",
        compact
          ? "rounded-2xl p-4"
          : "rounded-b-[1.75rem] rounded-t-2xl p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="px-0.5 text-xs font-bold uppercase tracking-wider text-ink-mute">
      {children}
    </h2>
  );
}

export type ContributionLike = {
  id: string;
  title?: string;
  name?: string;
  status?: string;
  currentAmount?: number;
  collectedAmount?: number;
  targetAmount?: number;
  goalAmount?: number;
  currency?: string;
};

/** Carte cagnotte — densite ModernContributionCard Android. */
export function ContributionCard({
  item,
  href,
}: {
  item: ContributionLike;
  href?: string;
}) {
  const label = item.title ?? item.name ?? item.id.slice(0, 8);
  const current = Number(item.currentAmount ?? item.collectedAmount ?? 0);
  const target = Number(item.targetAmount ?? item.goalAmount ?? 0);
  const pct =
    target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const to = href ?? `/app/contributions/${item.id}`;

  return (
    <Link
      href={to}
      onClick={() => haptic("selection")}
      className="native-pressable block rounded-2xl border border-ink/[0.06] bg-surface p-4 shadow-soft transition hover:border-brand-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{label}</p>
          <p className="mt-0.5 text-xs text-ink-mute">
            {money(current, item.currency ?? "BIF")}
            {target > 0 ? ` / ${money(target, item.currency ?? "BIF")}` : ""}
          </p>
        </div>
        {item.status ? (
          <Badge tone={statusTone(item.status)}>{item.status}</Badge>
        ) : null}
      </div>
      {target > 0 ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-mint-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
    </Link>
  );
}

export function SettingsRow({
  href,
  title,
  subtitle,
  onClick,
  danger,
}: {
  href?: string;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  const className = cx(
    "flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-ink/[0.03]",
    danger && "text-rose-700",
  );
  const body = (
    <>
      <div className="min-w-0">
        <p
          className={cx(
            "text-sm font-semibold",
            danger ? "text-rose-700" : "text-ink",
          )}
        >
          {title}
        </p>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-ink-mute">{subtitle}</p>
        ) : null}
      </div>
      <span className="text-ink-faint" aria-hidden>
        ›
      </span>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className={cx(className, "native-pressable")}
        onClick={() => haptic("selection")}
      >
        {body}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        haptic("selection");
        onClick?.();
      }}
      className={cx(className, "native-pressable")}
    >
      {body}
    </button>
  );
}

/** FAB flottant Extended — ISO Android. */
export function TabFab({
  href,
  label,
  onClick,
}: {
  href?: string;
  label: string;
  onClick?: () => void;
}) {
  const className =
    "fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-40 inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-4 py-3.5 text-sm font-bold text-white shadow-lift transition hover:bg-brand-600 md:bottom-8";
  const inner = (
    <>
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 5v14M5 12h14"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
        />
      </svg>
      {label}
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className={cx(className, "native-pressable")}
        aria-label={label}
        onClick={() => haptic("medium")}
      >
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        haptic("medium");
        onClick?.();
      }}
      className={cx(className, "native-pressable")}
      aria-label={label}
    >
      {inner}
    </button>
  );
}

export function QuickChip({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-full border border-ink/[0.08] bg-surface px-3.5 py-1.5 text-xs font-bold text-ink-soft transition hover:border-brand-300 hover:text-brand-700"
    >
      {children}
    </Link>
  );
}

export function MobileEmpty({
  title,
  hint,
  actionHref,
  actionLabel,
}: {
  title: string;
  hint?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-ink/10 bg-surface/80 px-6 py-10 text-center">
      <p className="font-display text-base font-bold text-ink">{title}</p>
      {hint ? <p className="mt-1 text-sm text-ink-mute">{hint}</p> : null}
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-lift"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
