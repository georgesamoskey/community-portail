"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import {
  markFullscreenOnboardingSeen,
} from "@/lib/retention";
import { Btn } from "@/lib/ui";
import { cx } from "@/lib/cx";

const SLIDES = [
  {
    key: "community",
    titleKey: "onboarding.slide1Title" as const,
    bodyKey: "onboarding.slide1Body" as const,
  },
  {
    key: "save",
    titleKey: "onboarding.slide2Title" as const,
    bodyKey: "onboarding.slide2Body" as const,
  },
  {
    key: "pay",
    titleKey: "onboarding.slide3Title" as const,
    bodyKey: "onboarding.slide3Body" as const,
  },
];

export default function OnboardingPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const last = index >= SLIDES.length - 1;
  const slide = SLIDES[index]!;

  const finish = () => {
    markFullscreenOnboardingSeen();
    router.replace("/app");
  };

  return (
    <main className="relative flex min-h-dvh flex-col">
      <div aria-hidden className="pointer-events-none absolute inset-0 mobile-trust-gradient" />
      <div className="relative z-10 flex flex-1 flex-col px-5 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={finish}
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

        <Btn
          className="w-full !bg-white !text-brand-700 hover:!bg-white/95"
          onClick={() => {
            if (last) finish();
            else setIndex((i) => i + 1);
          }}
        >
          {last ? t("onboarding.start") : t("common.next")}
        </Btn>
      </div>
    </main>
  );
}
