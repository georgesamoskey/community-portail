"use client";

import { cx } from "@/lib/cx";
import { useI18n } from "@/lib/i18n/context";

export type TrustSignals = {
  currentStreak?: number;
  level?: number;
  streakAtRisk?: boolean;
  ambassador?: boolean;
};

/** Badges compacts de confiance (streak, niveau, ambassadeur). */
export function MemberTrustBadge({
  signals,
  className,
  size = "md",
}: {
  signals?: TrustSignals | null;
  className?: string;
  size?: "xs" | "md";
}) {
  const { t } = useI18n();
  if (!signals) return null;

  const streak = signals.currentStreak ?? 0;
  const level = signals.level ?? 0;
  const showStreak = streak > 0;
  const showLevel = level > 0;
  const showAmbassador = !!signals.ambassador;

  if (!showStreak && !showLevel && !showAmbassador) return null;

  const pill =
    size === "xs"
      ? "rounded px-1 py-px text-[9px] font-bold tabular-nums leading-none"
      : "rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums";

  return (
    <span
      className={cx(
        "inline-flex flex-wrap items-center gap-0.5",
        size === "xs" && "gap-0.5",
        className,
      )}
    >
      {showStreak ? (
        <span
          className={cx(
            pill,
            signals.streakAtRisk
              ? "bg-amber-100 text-amber-900"
              : "bg-mint-100 text-mint-900",
          )}
          title={t("home.streakDays", { n: streak })}
        >
          🔥{size === "xs" ? streak : ` ${streak}`}
        </span>
      ) : null}
      {showLevel ? (
        <span
          className={cx(pill, "bg-brand-100 text-brand-900")}
          title={t("home.levelPts", { level, pts: "—" })}
        >
          {size === "xs"
            ? `N${level}`
            : t("engagement.levelShort", { n: level })}
        </span>
      ) : null}
      {showAmbassador ? (
        <span
          className={cx(pill, "bg-violet-100 text-violet-900")}
          title={t("engagement.ambassadorBadge")}
        >
          ★
        </span>
      ) : null}
    </span>
  );
}
