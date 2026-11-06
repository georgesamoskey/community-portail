"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { markFullscreenOnboardingSeen, markChecklist } from "@/lib/retention";
import { Btn } from "@/lib/ui";
import { cx } from "@/lib/cx";

const SLIDES = [
  {
    key: "circle",
    titleKey: "onboarding.slide1Title" as const,
    bodyKey: "onboarding.slide1Body" as const,
    ctaKey: "onboarding.slide1Cta" as const,
    href: "/app/tontines",
    checklist: "opened_tontine" as const,
  },
  {
    key: "invite",
    titleKey: "onboarding.slide2Title" as const,
    bodyKey: "onboarding.slide2Body" as const,
    ctaKey: "onboarding.slide2Cta" as const,
    href: "/app/invitations",
    checklist: "invited_someone" as const,
  },
  {
    key: "cotise",
    titleKey: "onboarding.slide3Title" as const,
    bodyKey: "onboarding.slide3Body" as const,
    ctaKey: "onboarding.slide3Cta" as const,
    href: "/app/contributions?declare=1",
    checklist: "paid_or_cotised" as const,
  },
];

export default function OnboardingPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const last = index >= SLIDES.length - 1;
  const slide = SLIDES[index]!;

  const finish = (href = "/app") => {
    markFullscreenOnboardingSeen();
    router.replace(href);
  };

  const primary = () => {
    if (slide.checklist) markChecklist(slide.checklist);
    if (last) {
      finish(slide.href);
      return;
    }
    markFullscreenOnboardingSeen();
    router.push(slide.href);
  };

  return (
    <main className="relative flex min-h-dvh flex-col">
      <div aria-hidden className="pointer-events-none absolute inset-0 mobile-trust-gradient" />
      <div className="relative z-10 flex flex-1 flex-col px-5 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => finish()}
          className="self-end text-sm font-semibold text-white/80"
        >
          {t("onboarding.skip")}
        </button>

        <div className="flex flex-1 flex-col items-center justify-center text-center text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.png"
            alt=""
            className="mb-8 h-20 w-20 rounded-full bg-white/15 p-2 shadow-lift ring-2 ring-white/30"
          />
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/70">
            {index + 1}/{SLIDES.length}
          </p>
          <h1 className="max-w-sm font-display text-3xl font-bold tracking-tight">
            {t(slide.titleKey)}
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/80">
            {t(slide.bodyKey)}
          </p>
        </div>

        <div className="flex justify-center gap-2 py-6">
          {SLIDES.map((s, i) => (
            <button
              key={s.key}
              type="button"
              aria-label={s.key}
              onClick={() => setIndex(i)}
              className={cx(
                "h-2 rounded-full transition-all",
                i === index ? "w-6 bg-white" : "w-2 bg-white/40",
              )}
            />
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Btn
            className="w-full !bg-white !text-brand-700 hover:!bg-white/95"
            onClick={primary}
          >
            {t(slide.ctaKey)}
          </Btn>
          {!last ? (
            <button
              type="button"
              className="text-sm font-semibold text-white/85"
              onClick={() => setIndex((i) => i + 1)}
            >
              {t("common.next")}
            </button>
          ) : (
            <button
              type="button"
              className="text-sm font-semibold text-white/85"
              onClick={() => finish()}
            >
              {t("onboarding.enter")}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
