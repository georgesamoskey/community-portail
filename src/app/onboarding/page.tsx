"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import {
  checklistProgress,
  loadChecklist,
  markChecklist,
  markFullscreenOnboardingSeen,
  ONBOARDING_STEPS,
  type OnboardingKey,
} from "@/lib/retention";
import { Btn } from "@/lib/ui";
import { cx } from "@/lib/cx";

export default function OnboardingPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [checklist, setChecklist] = useState(loadChecklist);
  const progress = checklistProgress(checklist);

  useEffect(() => {
    setChecklist(loadChecklist());
  }, []);

  const finish = () => {
    markFullscreenOnboardingSeen();
    router.replace("/app");
  };

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-lg flex-col justify-center px-4 py-10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icon.png"
        alt=""
        className="mx-auto mb-6 h-16 w-16 rounded-2xl shadow-lift"
      />
      <h1 className="text-center font-display text-3xl font-bold tracking-tight text-ink">
        {t("onboarding.title")}
      </h1>
      <p className="mt-2 text-center text-sm text-ink-mute">
        {t("onboarding.subtitle", { done: progress.done, total: progress.total })}
      </p>

      <ul className="mt-8 space-y-3">
        {ONBOARDING_STEPS.map((step) => {
          const done = checklist[step.key as OnboardingKey];
          return (
            <li key={step.key}>
              <Link
                href={step.href}
                onClick={() => {
                  markFullscreenOnboardingSeen();
                  if (step.key === "joined_chat") markChecklist("joined_chat");
                }}
                className={cx(
                  "flex items-center justify-between rounded-2xl border px-4 py-3.5 transition",
                  done
                    ? "border-mint-200 bg-mint-50 text-mint-800"
                    : "border-ink/[0.08] bg-surface hover:border-brand-200",
                )}
              >
                <span className="text-sm font-semibold">
                  {t(`home.${step.titleKey}`)}
                </span>
                <span className="text-xs font-bold uppercase tracking-wide opacity-70">
                  {done ? t("common.done") : t("common.go")}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-10 flex flex-col gap-2">
        <Btn onClick={finish} className="w-full justify-center">
          {progress.pct >= 100
            ? t("onboarding.enter")
            : t("onboarding.skip")}
        </Btn>
        <Link
          href="/app/chat"
          onClick={() => markFullscreenOnboardingSeen()}
          className="text-center text-sm font-semibold text-brand-600"
        >
          {t("home.openChat")}
        </Link>
      </div>
    </main>
  );
}
