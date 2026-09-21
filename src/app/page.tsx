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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-xl shadow-lift"
          />
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
