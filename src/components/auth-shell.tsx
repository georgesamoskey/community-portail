"use client";

import Link from "next/link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { PwaInstallPrompt } from "@/components/offline-ui";
import { useI18n } from "@/lib/i18n/context";

/** Shell auth ISO Android LoginScreen : gradient plein + carte blanche. */
export function AuthShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { messages } = useI18n();
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mobile-trust-gradient"
      />
      <header className="relative z-10 flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 rounded-full bg-white/15 p-1 shadow-lift ring-2 ring-white/30"
          />
          <span className="font-display text-lg font-bold tracking-tight">
            {messages.brand}
          </span>
        </Link>
        <div className="rounded-xl bg-white/15 px-1 py-0.5 backdrop-blur">
          <LocaleSwitcher compact />
        </div>
      </header>
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-8 pt-2 sm:px-6">
        <div className="rounded-[1.75rem] border border-white/20 bg-surface p-5 shadow-lift sm:p-6">
          {children}
        </div>
      </main>
      {footer ? (
        <footer className="relative z-10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-xs text-white/70">
          {footer}
        </footer>
      ) : null}
      <PwaInstallPrompt />
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

export function AuthModeChips({
  mode,
  onChange,
  passwordLabel,
  otpLabel,
}: {
  mode: "password" | "otp";
  onChange: (m: "password" | "otp") => void;
  passwordLabel: string;
  otpLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Mode de connexion"
      className="mb-5 flex gap-1 rounded-2xl bg-surface-sunken p-1"
    >
      {(["password", "otp"] as const).map((m) => {
        const active = mode === m;
        return (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(m)}
            className={
              active
                ? "min-h-11 flex-1 rounded-xl bg-brand-500 px-3 py-2.5 text-sm font-bold text-white shadow-soft"
                : "min-h-11 flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-mute transition hover:text-ink"
            }
          >
            {m === "password" ? passwordLabel : otpLabel}
          </button>
        );
      })}
    </div>
  );
}
