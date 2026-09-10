"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { useBff } from "@/lib/use-bff";
import { normalizeList } from "@/lib/portal-api";
import { trackRecoEvent } from "@/lib/reco-track";
import { Alert, Badge, Btn, EmptyState, money, PageHeader } from "@/lib/ui";

type Row = {
  id?: string;
  title?: string;
  name?: string;
  status?: string;
  financialGoal?: number;
  currency?: string;
  description?: string;
  score?: number;
  algorithm?: string;
  reason?: string;
  country?: string;
};

type Invitee = {
  userId?: string;
  score?: number;
  algorithm?: string;
  displayLabel?: string;
};

export default function DiscoverPage() {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [invitedMarked, setInvitedMarked] = useState<Set<string>>(new Set());

  const publicCagnottes = useBff<unknown>("/contributions/public?limit=24");
  const feed = useBff<unknown>("/contributions/feed?limit=20");
  const recoC = useBff<unknown>("/recommendations/contributions");
  const recoT = useBff<unknown>("/recommendations/tontines");
  const invitees = useBff<unknown>("/recommendations/invitees?limit=8");

  const publicList = useMemo(
    () =>
      normalizeList<Row>(publicCagnottes.data, [
        "items",
        "contributions",
        "data",
      ]),
    [publicCagnottes.data],
  );
  const feedList = useMemo(
    () => normalizeList<Row>(feed.data, ["items", "contributions", "data"]),
    [feed.data],
  );
  const recoCList = useMemo(
    () =>
      normalizeList<Row>(recoC.data, [
        "items",
        "recommendations",
        "contributions",
        "data",
      ]).filter((r) => r.id && !dismissed.has(`c:${r.id}`)),
    [recoC.data, dismissed],
  );
  const recoTList = useMemo(
    () =>
      normalizeList<Row>(recoT.data, [
        "items",
        "recommendations",
        "tontines",
        "data",
      ]).filter((r) => r.id && !dismissed.has(`t:${r.id}`)),
    [recoT.data, dismissed],
  );
  const inviteeList = useMemo(() => {
    const raw = Array.isArray(invitees.data)
      ? (invitees.data as Invitee[])
      : normalizeList<Invitee>(invitees.data, ["items", "invitees", "data"]);
    return raw.filter((u) => u.userId && !invitedMarked.has(u.userId));
  }, [invitees.data, invitedMarked]);

  const onClickReco = (
    kind: "contribution" | "tontine",
    row: Row,
  ) => {
    if (!row.id) return;
    void trackRecoEvent({
      targetType: kind,
      targetId: row.id,
      eventType: "click",
      servedScore: row.score,
      algorithm: row.algorithm,
    });
  };

  const onRefuse = (kind: "contribution" | "tontine", row: Row) => {
    if (!row.id) return;
    void trackRecoEvent({
      targetType: kind,
      targetId: row.id,
      eventType: "refuse",
      servedScore: row.score,
      algorithm: row.algorithm,
    });
    setDismissed((prev) => new Set(prev).add(`${kind[0]}:${row.id}`));
  };

  const markInviteSent = (u: Invitee) => {
    if (!u.userId) return;
    void trackRecoEvent({
      targetType: "user",
      targetId: u.userId,
      eventType: "invite_sent",
      servedScore: u.score,
      algorithm: u.algorithm ?? "adamic_adar",
    });
    setInvitedMarked((prev) => new Set(prev).add(u.userId!));
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("discover.title")}
        description={t("discover.desc")}
      />

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold text-ink">
          {t("discover.suggestions")}
        </h2>
        {recoC.error && recoT.error ? (
          <Alert>{recoC.error}</Alert>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {recoCList.slice(0, 4).map((r, i) => (
            <RecoCard
              key={r.id ?? `c-${i}`}
              row={r}
              href={`/app/contributions/${r.id}`}
              kindLabel={t("discover.pot")}
              onOpen={() => onClickReco("contribution", r)}
              onRefuse={() => onRefuse("contribution", r)}
              refuseLabel={t("discover.refuse")}
            />
          ))}
          {recoTList.slice(0, 2).map((r, i) => (
            <RecoCard
              key={r.id ?? `t-${i}`}
              row={r}
              href={`/app/tontines/${r.id}`}
              kindLabel={t("nav.tontines")}
              onOpen={() => onClickReco("tontine", r)}
              onRefuse={() => onRefuse("tontine", r)}
              refuseLabel={t("discover.refuse")}
            />
          ))}
          {!recoC.loading &&
            !recoT.loading &&
            recoCList.length === 0 &&
            recoTList.length === 0 && (
              <EmptyState>{t("discover.noRecs")}</EmptyState>
            )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold text-ink">
          {t("discover.whoInvite")}
        </h2>
        <p className="text-sm text-ink-mute">{t("discover.whoInviteHint")}</p>
        {invitees.error && <Alert>{invitees.error}</Alert>}
        {inviteeList.length === 0 && !invitees.loading ? (
          <EmptyState>{t("discover.noInvitees")}</EmptyState>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {inviteeList.map((u) => (
              <li
                key={u.userId}
                className="flex items-center gap-3 rounded-2xl border border-ink/[0.06] bg-surface p-3 shadow-soft"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">
                  {u.displayLabel ?? "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">
                    {u.displayLabel ?? u.userId?.slice(0, 8)}
                  </p>
                  <p className="text-xs text-ink-mute">
                    {u.algorithm ?? "adamic_adar"}
                    {u.score != null
                      ? ` · ${(Number(u.score) * 100).toFixed(0)}%`
                      : ""}
                  </p>
                </div>
                <Btn
                  variant="secondary"
                  onClick={() => markInviteSent(u)}
                >
                  {t("discover.markInvited")}
                </Btn>
                <Link
                  href="/app/contributions"
                  className="text-xs font-semibold text-brand-700"
                >
                  {t("discover.inviteOnPot")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold text-ink">
          {t("discover.publicPots")}
        </h2>
        {publicCagnottes.loading && (
          <p className="text-sm text-ink-mute">{t("common.loading")}</p>
        )}
        {publicCagnottes.error && <Alert>{publicCagnottes.error}</Alert>}
        {!publicCagnottes.loading && publicList.length === 0 && (
          <EmptyState>{t("discover.noPublic")}</EmptyState>
        )}
        <ul className="grid gap-3 sm:grid-cols-2">
          {publicList.map((c, i) => (
            <li key={c.id ?? i}>
              <Link
                href={c.id ? `/app/contributions/${c.id}` : "/app/contributions"}
                className="block rounded-2.5xl border border-ink/[0.06] bg-surface p-4 shadow-soft hover:border-brand-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-ink">
                    {c.title ?? t("discover.pot")}
                  </p>
                  {c.status ? <Badge>{c.status}</Badge> : null}
                </div>
                {c.financialGoal != null && (
                  <p className="mt-1 text-sm text-ink-mute">
                    {t("discover.goal", {
                      amount: money(c.financialGoal, c.currency ?? "BIF"),
                    })}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold text-ink">
          {t("discover.feed")}
        </h2>
        {feed.loading && (
          <p className="text-sm text-ink-mute">{t("common.loading")}</p>
        )}
        {feed.error && (
          <p className="text-sm text-ink-mute">
            {t("discover.feedFail")} ({feed.error})
          </p>
        )}
        {feedList.length > 0 ? (
          <ul className="divide-y divide-ink/[0.06] overflow-hidden rounded-2.5xl border border-ink/[0.06] bg-surface">
            {feedList.map((c, i) => (
              <li key={c.id ?? i}>
                <Link
                  href={c.id ? `/app/contributions/${c.id}` : "#"}
                  className="block px-4 py-3 hover:bg-brand-50/50"
                >
                  <p className="font-medium text-ink">{c.title ?? "—"}</p>
                  <p className="text-xs text-ink-mute">{c.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          !feed.loading && <EmptyState>{t("discover.feedEmpty")}</EmptyState>
        )}
      </section>
    </div>
  );
}

function RecoCard({
  row,
  href,
  kindLabel,
  onOpen,
  onRefuse,
  refuseLabel,
}: {
  row: Row;
  href: string;
  kindLabel: string;
  onOpen: () => void;
  onRefuse: () => void;
  refuseLabel: string;
}) {
  return (
    <div className="rounded-2.5xl border border-ink/[0.06] bg-surface p-4 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={href}
          onClick={onOpen}
          className="min-w-0 flex-1 hover:text-brand-800"
        >
          <p className="font-semibold text-ink">
            {row.title ?? row.name ?? kindLabel}
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-ink-mute">
            {row.reason ?? row.description ?? ""}
          </p>
        </Link>
        <Badge>{kindLabel}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-ink-mute">
        {row.algorithm ? <span>{row.algorithm}</span> : null}
        {row.score != null ? (
          <span>· {(Number(row.score) * 100).toFixed(0)}%</span>
        ) : null}
        <button
          type="button"
          onClick={onRefuse}
          className="ml-auto font-semibold text-ink-mute hover:text-rose-700"
        >
          {refuseLabel}
        </button>
      </div>
    </div>
  );
}
