"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n/context";
import { useBff } from "@/lib/use-bff";
import { useAction } from "@/lib/use-action";
import { normalizeList } from "@/lib/portal-api";
import {
  Alert,
  Badge,
  Btn,
  EmptyState,
  PageHeader,
  Panel,
} from "@/lib/ui";

type BadgeRow = {
  type?: string;
  name?: string;
  description?: string;
  icon?: string;
  earned?: boolean;
  earnedAt?: string | null;
};

type LeaderRow = {
  userId?: string;
  id?: string;
  totalPoints?: number;
  points?: number;
  currentStreak?: number;
  level?: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
};

export default function EngagementPage() {
  const { t } = useI18n();
  const me = useBff<Record<string, unknown>>("/engagement/me");
  const badges = useBff<{ badges?: BadgeRow[]; earned?: number; total?: number }>(
    "/engagement/me/badges",
  );
  const challenges = useBff<{ active?: unknown[]; completed?: unknown[] }>(
    "/engagement/me/challenges",
  );
  const board = useBff<unknown>("/engagement/leaderboard?limit=20");
  const streaks = useBff<unknown>("/engagement/leaderboard/streaks?limit=20");
  const credit = useBff<{
    score?: number | null;
    tier?: string | null;
    feeDiscount?: number;
    canCreateTontine?: boolean;
    canJoinPremium?: boolean;
    maxPayoutAmount?: number;
    reasons?: string[];
  }>("/engagement/me/credit");
  const trust = useBff<{
    found?: boolean;
    trustRank?: number;
    isTrustedInviter?: boolean;
  }>("/engagement/me/trust");
  const notifPreview = useBff<{
    type?: string;
    title?: string;
    body?: string;
    priority?: string;
  } | null>("/engagement/me/notifications/preview");
  const action = useAction();

  const boardList = useMemo(
    () =>
      normalizeList<LeaderRow>(board.data, [
        "items",
        "leaderboard",
        "data",
        "results",
      ]),
    [board.data],
  );
  const streakList = useMemo(
    () =>
      normalizeList<LeaderRow>(streaks.data, [
        "items",
        "leaderboard",
        "data",
        "results",
      ]),
    [streaks.data],
  );
  const badgeList = badges.data?.badges ?? [];

  const protect = () =>
    void action.mutate<{ success?: boolean; message?: string }>(
      "/engagement/me/protect-streak",
      { method: "POST" },
      {
        success: t("engagement.protectOk"),
        onDone: () => {
          void me.refresh();
        },
      },
    );

  const level = me.data?.level;
  const points = me.data?.totalPoints;
  const streak = me.data?.currentStreak;
  const atRisk = me.data?.streakAtRisk;

  const statCards = [
    { label: t("engagement.level"), value: me.loading ? "…" : String(level ?? "—") },
    { label: t("engagement.points"), value: me.loading ? "…" : String(points ?? "—") },
    {
      label: t("engagement.streak"),
      value: me.loading ? "…" : String(streak ?? "—"),
    },
    {
      label: t("engagement.score"),
      value: me.loading
        ? "…"
        : String(me.data?.engagementScore ?? "—"),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("engagement.title")}
        description={t("engagement.desc")}
        actions={
          <Btn variant="secondary" onClick={() => void me.refresh()}>
            {t("common.refresh")}
          </Btn>
        }
      />

      {(action.error || action.success) && (
        <Alert tone={action.error ? "rose" : "teal"}>
          {action.error ?? action.success}
        </Alert>
      )}
      {me.error && <Alert>{me.error}</Alert>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((k) => (
          <div
            key={k.label}
            className="rounded-2.5xl border border-ink/[0.06] bg-surface p-4 shadow-soft"
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-mute">
              {k.label}
            </p>
            <p className="mt-1 font-display text-3xl font-bold text-ink">
              {k.value}
            </p>
          </div>
        ))}
      </div>

      <Panel title={t("engagement.streak")}>
        <p className="text-sm text-ink-mute">
          {t("engagement.longest")} {String(me.data?.longestStreak ?? "—")}
          {atRisk ? ` ${t("engagement.atRisk")}` : ""}
        </p>
        <Btn className="mt-3" onClick={protect} disabled={action.busy}>
          {t("engagement.protect")}
        </Btn>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("engagement.credit")}>
          {credit.loading && (
            <p className="text-sm text-ink-mute">{t("common.loading")}</p>
          )}
          {credit.error && (
            <p className="text-sm text-ink-mute">{credit.error}</p>
          )}
          {credit.data && (
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-semibold">{t("engagement.creditScore")}: </span>
                {credit.data.score ?? "—"}
                {credit.data.tier ? ` · ${credit.data.tier}` : ""}
              </p>
              <p>
                <span className="font-semibold">{t("engagement.feeDiscount")}: </span>
                {((credit.data.feeDiscount ?? 0) * 100).toFixed(0)}%
              </p>
              <p>
                {credit.data.canCreateTontine
                  ? t("engagement.canCreateTontine")
                  : t("engagement.cannotCreateTontine")}
              </p>
              {(credit.data.reasons ?? []).slice(0, 2).map((r) => (
                <p key={r} className="text-xs text-ink-mute">
                  {r}
                </p>
              ))}
            </div>
          )}
        </Panel>
        <Panel title={t("engagement.trust")}>
          {trust.loading && (
            <p className="text-sm text-ink-mute">{t("common.loading")}</p>
          )}
          {trust.data?.found ? (
            <div className="space-y-2 text-sm">
              <p>
                TrustRank:{" "}
                <span className="font-mono font-semibold">
                  {Number(trust.data.trustRank ?? 0).toFixed(3)}
                </span>
              </p>
              {trust.data.isTrustedInviter ? (
                <Badge tone="ok">{t("engagement.trustedInviter")}</Badge>
              ) : (
                <p className="text-xs text-ink-mute">
                  {t("engagement.trustGrowing")}
                </p>
              )}
            </div>
          ) : (
            !trust.loading && (
              <p className="text-sm text-ink-mute">{t("engagement.trustEmpty")}</p>
            )
          )}
        </Panel>
      </div>

      <Panel title={t("engagement.nextNotif")}>
        {notifPreview.loading && (
          <p className="text-sm text-ink-mute">{t("common.loading")}</p>
        )}
        {notifPreview.data?.title ? (
          <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-3 text-sm">
            <p className="text-[11px] font-bold uppercase text-ink-mute">
              {notifPreview.data.type} · {notifPreview.data.priority}
            </p>
            <p className="mt-1 font-semibold text-ink">{notifPreview.data.title}</p>
            <p className="mt-1 text-ink-mute">{notifPreview.data.body}</p>
          </div>
        ) : (
          !notifPreview.loading && (
            <EmptyState>{t("engagement.noNotifPreview")}</EmptyState>
          )
        )}
      </Panel>

      <Panel
        title={t("engagement.badges", {
          earned: badges.data?.earned ?? 0,
          total: badges.data?.total ?? badgeList.length,
        })}
      >
        {badges.loading && (
          <p className="text-sm text-ink-mute">{t("common.loading")}</p>
        )}
        {badgeList.length === 0 && !badges.loading ? (
          <EmptyState>{t("engagement.noBadges")}</EmptyState>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {badgeList.map((b) => (
              <li
                key={b.type}
                className={`rounded-xl border p-3 text-sm ${
                  b.earned
                    ? "border-brand-200 bg-brand-50"
                    : "border-ink/[0.06] bg-surface-sunken/40 opacity-60"
                }`}
              >
                <p className="font-semibold text-ink">
                  {b.icon ? `${b.icon} ` : ""}
                  {b.name ?? b.type}
                </p>
                <p className="mt-1 text-xs text-ink-mute">{b.description}</p>
                {b.earned ? (
                  <Badge tone="ok">{t("engagement.earned")}</Badge>
                ) : (
                  <Badge>{t("engagement.locked")}</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("engagement.challenges")}>
          {challenges.loading && (
            <p className="text-sm text-ink-mute">{t("common.loading")}</p>
          )}
          <pre className="max-h-56 overflow-auto rounded-xl bg-surface-sunken/50 p-3 text-xs">
            {JSON.stringify(challenges.data ?? {}, null, 2)}
          </pre>
        </Panel>
        <Panel title={t("engagement.lbPoints")}>
          {board.loading && <p className="text-sm text-ink-mute">…</p>}
          {boardList.length === 0 && !board.loading ? (
            <EmptyState>{t("engagement.lbEmpty")}</EmptyState>
          ) : (
            <ol className="space-y-2">
              {boardList.map((r, i) => (
                <li
                  key={r.userId ?? r.id ?? i}
                  className="flex justify-between text-sm"
                >
                  <span>
                    #{i + 1}{" "}
                    {r.fullName ??
                      (`${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() ||
                        (r.userId ?? r.id)?.slice(0, 8) ||
                        "—")}
                  </span>
                  <span className="font-semibold">
                    {t("engagement.pts", {
                      n: r.totalPoints ?? r.points ?? "—",
                    })}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <Panel title={t("engagement.lbStreaks")}>
        {streakList.length === 0 && !streaks.loading ? (
          <EmptyState>{t("engagement.noData")}</EmptyState>
        ) : (
          <ol className="space-y-2">
            {streakList.map((r, i) => (
              <li
                key={r.userId ?? r.id ?? i}
                className="flex justify-between text-sm"
              >
                <span>
                  #{i + 1}{" "}
                  {r.fullName ??
                    (`${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() ||
                      (r.userId ?? r.id)?.slice(0, 8) ||
                      "—")}
                </span>
                <span className="font-semibold">
                  {t("engagement.days", { n: r.currentStreak ?? "—" })}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}
