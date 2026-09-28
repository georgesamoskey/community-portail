"use client";

import Link from "next/link";
import { useBff } from "@/lib/use-bff";
import { normalizeList } from "@/lib/portal-api";
import { useI18n } from "@/lib/i18n/context";
import { Badge, EmptyState, money, Panel, statusTone } from "@/lib/ui";
import { LocalDataHint } from "@/components/offline-ui";

type Row = {
  id?: string;
  amount?: number;
  montant?: number;
  status?: string;
  createdAt?: string;
  title?: string;
  contributionId?: string;
  currency?: string;
};

/** Liste « mes cotisations » — partagée Historique + onglet cagnottes. */
export function ContributionsHistory() {
  const { t } = useI18n();
  const cotisations = useBff<unknown>("/cotisations/my-cotisations?limit=50");
  const items = normalizeList<Row>(cotisations.data, [
    "items",
    "cotisations",
    "data",
  ]);

  return (
    <Panel title={t("pots.tabCotisations")}>
      <LocalDataHint show={cotisations.fromCache} />
      {cotisations.loading && !items.length ? (
        <p className="text-sm text-ink-mute">{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <EmptyState>
          <p className="font-semibold text-ink">{t("history.empty")}</p>
          <p className="mt-1 text-sm text-ink-mute">{t("history.emptyHint")}</p>
          <Link
            href="/app/contributions"
            className="mt-3 inline-block text-sm font-semibold text-brand-600"
          >
            {t("nav.contributions")}
          </Link>
        </EmptyState>
      ) : (
        <ul className="divide-y divide-ink/[0.06]">
          {items.map((row) => {
            const amount = row.montant ?? row.amount ?? 0;
            const href = row.contributionId
              ? `/app/contributions/${row.contributionId}${
                  row.id ? `?cotisation=${row.id}` : ""
                }`
              : "/app/contributions";
            return (
              <li key={row.id ?? `${row.contributionId}-${row.createdAt}`}>
                <Link
                  href={href}
                  className="flex items-center justify-between gap-3 py-3 transition hover:bg-ink/[0.02]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {row.title ||
                        t("pots.cotisationFallback", {
                          id: (row.id ?? "").slice(0, 8),
                        })}
                    </p>
                    <p className="text-xs text-ink-mute">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleString()
                        : "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-bold text-ink">
                      {money(amount, row.currency ?? "BIF")}
                    </span>
                    {row.status ? (
                      <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
