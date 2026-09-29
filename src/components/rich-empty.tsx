"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n/context";
import { Btn } from "@/lib/ui";
import { cx } from "@/lib/cx";

/** Empty state riche avec titre, hint et CTA optionnel. */
export function RichEmpty({
  title,
  hint,
  actionLabel,
  onAction,
  href,
  icon,
  className,
}: {
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  href?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "rounded-2.5xl border border-dashed border-ink/10 bg-surface/70 px-6 py-10 text-center shadow-soft",
        className,
      )}
    >
      {icon ? (
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-mint-600 text-white shadow-lift">
          {icon}
        </div>
      ) : null}
      <p className="font-display text-base font-bold text-ink">{title}</p>
      {hint ? (
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-mute">
          {hint}
        </p>
      ) : null}
      {actionLabel && (onAction || href) ? (
        href ? (
          <a
            href={href}
            className="mt-4 inline-flex rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-lift"
          >
            {actionLabel}
          </a>
        ) : (
          <Btn className="mt-4" onClick={onAction}>
            {actionLabel}
          </Btn>
        )
      ) : null}
    </div>
  );
}

/** Boundary client pour pages portal. */
export function PortalErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
        !
      </div>
      <h1 className="mt-4 font-display text-xl font-bold text-ink">
        {t("errors.title")}
      </h1>
      <p className="mt-2 text-sm text-ink-mute">{t("errors.hint")}</p>
      <Btn className="mt-5" onClick={reset}>
        {t("errors.retry")}
      </Btn>
    </div>
  );
}
