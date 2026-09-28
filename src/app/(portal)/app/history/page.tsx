"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { ContributionsHistory } from "@/components/contributions-history";

function HistoryInner() {
  const { t } = useI18n();
  const router = useRouter();
  const search = useSearchParams();

  useEffect(() => {
    if (search.get("tab") === "cagnottes") {
      router.replace("/app/contributions");
    }
  }, [search, router]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
          {t("nav.history")}
        </h1>
        <p className="mt-1 text-sm text-ink-mute">{t("history.desc")}</p>
      </div>
      <ContributionsHistory />
    </div>
  );
}

export default function HistoryPage() {
  const { t } = useI18n();
  return (
    <Suspense fallback={<p className="text-sm text-ink-mute">{t("common.loading")}</p>}>
      <HistoryInner />
    </Suspense>
  );
}
