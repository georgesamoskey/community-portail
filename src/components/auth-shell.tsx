"use client";

import Link from "next/link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useI18n } from "@/lib/i18n/context";

/** Shell mobile-first plein écran — parité splash/login natif. */
export function AuthShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { messages } = useI18n();
  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_520px_at_8%_-8%,rgba(255,92,53,0.18),transparent_55%),radial-gradient(700px_420px_at_92%_4%,rgba(31,151,134,0.14),transparent_50%)]"
      />
      <header className="relative z-10 flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-xl shadow-lift"
          />
          <span className="font-display text-lg font-bold tracking-tight text-ink">
            {messages.brand}
          </span>
        </Link>
        <LocaleSwitcher compact />
      </header>
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-8 pt-4 sm:px-6">
        {children}
      </main>
      {footer ? (
        <footer className="relative z-10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-xs text-ink-mute">
          {footer}
        </footer>
      ) : null}
    </div>
  );
}

export function AuthField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold text-ink">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export const authInputClass =
  "w-full rounded-xl border border-ink/[0.1] bg-surface px-3.5 py-3 text-base text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 sm:text-sm";

export const authBtnClass =
  "inline-flex w-full items-center justify-center rounded-xl bg-brand-500 px-5 py-3.5 text-sm font-bold text-white shadow-lift transition hover:bg-brand-600 disabled:opacity-60";

export const authBtnSecondaryClass =
  "inline-flex w-full items-center justify-center rounded-xl border border-ink/[0.1] bg-surface px-5 py-3 text-sm font-semibold text-ink transition hover:bg-ink/[0.03]";
