"use client";

import { Suspense, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useI18n } from "@/lib/i18n/context";
import { useBff } from "@/lib/use-bff";
import { normalizeList } from "@/lib/portal-api";
import { LocalDataHint } from "@/components/offline-ui";
import {
  ContributionCard,
  type ContributionLike,
  MobileEmpty,
  MobileHero,
  SectionLabel,
} from "@/components/mobile-iso";

function asBuckets(data: unknown): {
  created: ContributionLike[];
  participated: ContributionLike[];
} {
  if (!data || typeof data !== "object") {
    return { created: [], participated: [] };
  }
  const raw = data as Record<string, unknown>;
  if (Array.isArray(raw.created) || Array.isArray(raw.participated)) {
    return {
      created: (raw.created as ContributionLike[]) ?? [],
      participated: (raw.participated as ContributionLike[]) ?? [],
    };
  }
  const flat = normalizeList<ContributionLike>(data, [
    "items",
    "contributions",
    "data",
  ]);
  return { created: flat, participated: [] };
}

function HistoryInner() {
  const { t } = useI18n();
  const mine = useBff<unknown>("/contributions/my-contributions");
  const { created, participated } = useMemo(
    () => asBuckets(mine.data),
    [mine.data],
  );
  const all = [...created, ...participated];

  return (
    <div className="space-y-5 pb-8">
      <MobileHero compact>
        <h1 className="font-display text-xl font-bold tracking-tight">
          {t("nav.history")}
        </h1>
        <p className="mt-1 text-sm text-white/75">{t("history.desc")}</p>
      </MobileHero>

      <LocalDataHint show={mine.fromCache} />

      {mine.loading && all.length === 0 ? (
        <p className="text-sm text-ink-mute">{t("common.loading")}</p>
      ) : all.length === 0 ? (
        <MobileEmpty
          title={t("history.empty")}
          hint={t("history.emptyHint")}
          actionHref="/app/contributions"
          actionLabel={t("nav.contributions")}
        />
      ) : (
        <div className="space-y-6">
          {created.length > 0 ? (
            <section className="space-y-2">
              <SectionLabel>{t("history.sectionCreated")}</SectionLabel>
              <ul className="space-y-2">
                {created.map((c) => (
                  <li key={c.id}>
                    <ContributionCard item={c} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {participated.length > 0 ? (
            <section className="space-y-2">
              <SectionLabel>{t("history.sectionJoined")}</SectionLabel>
              <ul className="space-y-2">
                {participated.map((c) => (
                  <li key={c.id}>
                    <ContributionCard item={c} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const { t } = useI18n();
  return (
    <Suspense
      fallback={<p className="text-sm text-ink-mute">{t("common.loading")}</p>}
    >
      <HistoryInner />
    </Suspense>
  );
}
