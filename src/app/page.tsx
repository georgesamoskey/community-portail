"use client";

import Link from "next/link";
import { SignInButton } from "@/components/sign-in-button";
import { useI18n } from "@/lib/i18n/context";

export default function HomePage() {
  const { t, messages } = useI18n();

  const features = [
    {
      title: t("landing.featChat"),
      text: t("landing.featChatDesc"),
      accent: "from-brand-500/15",
    },
    {
      title: t("landing.featMoney"),
      text: t("landing.featMoneyDesc"),
      accent: "from-mint-500/15",
    },
    {
      title: t("landing.featPay"),
      text: t("landing.featPayDesc"),
      accent: "from-ink/5",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <span className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-ink">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lift">
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M7 18.5 4 21V7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v8a2.5 2.5 0 0 1-2.5 2.5H7Z"
                stroke="currentColor"
                strokeWidth="1.75"
              />
            </svg>
          </span>
          {messages.brand}
        </span>
        <Link
          href="/login"
          className="text-sm font-semibold text-ink-soft hover:text-brand-600"
        >
          {t("landing.signIn")}
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex max-w-5xl flex-col gap-12 px-4 pb-20 pt-10 sm:px-6 sm:pt-16">
        <section className="social-rise max-w-2xl">
          <p className="font-display text-5xl font-bold tracking-tightest text-ink sm:text-6xl">
            {messages.brand}
          </p>
          <h1 className="mt-5 text-2xl font-medium leading-snug text-ink-soft sm:text-3xl">
            {t("landing.hero")}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-mute sm:text-lg">
            {t("landing.sub")}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <SignInButton
              label={t("landing.enterChat")}
              callbackUrl="/app/chat"
            />
            <Link
              href="/login"
              className="inline-flex items-center rounded-xl border border-ink/[0.1] bg-surface/90 px-5 py-2.5 text-sm font-semibold text-ink shadow-soft transition hover:border-brand-300"
            >
              {t("landing.signIn")}
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {features.map((card, i) => (
            <div
              key={card.title}
              className={`social-rise rounded-2.5xl border border-ink/[0.06] bg-gradient-to-br ${card.accent} to-surface p-5 shadow-soft`}
              style={{ animationDelay: `${100 + i * 80}ms` }}
            >
              <h2 className="font-display text-lg font-bold tracking-tight text-ink">
                {card.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-mute">
                {card.text}
              </p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
