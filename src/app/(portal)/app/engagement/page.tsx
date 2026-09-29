"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useI18n } from "@/lib/i18n/context";
import { useBff } from "@/lib/use-bff";
import { useAction } from "@/lib/use-action";
import { normalizeList } from "@/lib/portal-api";
import { MemberAvatar } from "@/components/member-avatar";
import { cx } from "@/lib/cx";
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
  rank?: number;
  userId?: string;
  id?: string;
  totalPoints?: number;
  points?: number;
  currentStreak?: number;
  longestStreak?: number;
  level?: number;
  badgeCount?: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  avatar?: string | null;
};

type ChallengeRow = {
  id?: string;
  type?: string;
  title?: string;
  description?: string;
  target?: number;
  progress?: number;
  reward?: number;
  expiresAt?: string;
  startedAt?: string;
};

function leaderName(r: LeaderRow, fallback: string) {
  return (
    r.fullName ||
    `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() ||
    (r.userId ?? r.id)?.slice(0, 8) ||
    fallback
  );
}

function challengeTone(type?: string) {
  const t = (type ?? "").toLowerCase();
  if (t === "daily") return "bg-mint-50 text-mint-900 ring-mint-200";
  if (t === "weekly") return "bg-brand-50 text-brand-900 ring-brand-200";
  if (t === "monthly") return "bg-violet-50 text-violet-900 ring-violet-200";
  return "bg-amber-50 text-amber-900 ring-amber-200";
}

function daysLeft(iso?: string) {
  if (!iso) return null;
  const ms = Date.parse(iso) - Date.now();
  if (!Number.isFinite(ms)) return null;
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86_400_000);
}

export default function EngagementPage() {
  const { t } = useI18n();
  const { data: session } = useSession();
  const me = useBff<{
    level?: number;
    totalPoints?: number;
    currentStreak?: number;
    longestStreak?: number;
    streakAtRisk?: boolean;
    engagementScore?: number;
    id?: string;
    userId?: string;
  }>("/engagement/me");
  const badges = useBff<{ badges?: BadgeRow[]; earned?: number; total?: number }>(
    "/engagement/me/badges",
  );
  const challenges = useBff<{
    active?: ChallengeRow[];
    completed?: number;
    completedCount?: number;
  }>("/engagement/me/challenges");
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

  const myUserId =
    (me.data as { userId?: string } | undefined)?.userId ??
    session?.user?.id ??
    undefined;

  const boardList = useMemo(() => {
    const list = Array.isArray(board.data)
      ? (board.data as LeaderRow[])
      : normalizeList<LeaderRow>(board.data, [
          "items",
          "leaderboard",
          "data",
          "results",
        ]);
    return list;
  }, [board.data]);

  const streakList = useMemo(() => {
    const list = Array.isArray(streaks.data)
      ? (streaks.data as LeaderRow[])
      : normalizeList<LeaderRow>(streaks.data, [
          "items",
          "leaderboard",
          "data",
          "results",
        ]);
    return list;
  }, [streaks.data]);

  const activeChallenges = useMemo(() => {
    const raw = challenges.data?.active;
    return Array.isArray(raw) ? raw : [];
  }, [challenges.data]);

  const badgeList = badges.data?.badges ?? [];
  const completedCount =
    challenges.data?.completedCount ??
    (typeof challenges.data?.completed === "number"
      ? challenges.data.completed
      : 0);

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

  const myStreakRank = useMemo(() => {
    if (!myUserId) return null;
    const idx = streakList.findIndex((r) => r.userId === myUserId);
    return idx >= 0 ? idx + 1 : null;
  }, [streakList, myUserId]);

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
          <Btn
            variant="secondary"
            onClick={() => {
              void me.refresh();
              void challenges.refresh();
              void board.refresh();
              void streaks.refresh();
            }}
          >
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
          {myStreakRank ? ` · #${myStreakRank}` : ""}
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

      <Panel title={t("engagement.challenges")}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-ink-mute">
            {t("engagement.challengesDone", { n: completedCount })}
          </p>
        </div>
        {challenges.loading && (
          <p className="text-sm text-ink-mute">{t("common.loading")}</p>
        )}
        {challenges.error && <Alert>{challenges.error}</Alert>}
        {!challenges.loading && activeChallenges.length === 0 ? (
          <EmptyState>{t("engagement.challengesEmpty")}</EmptyState>
        ) : (
          <ul className="space-y-3">
            {activeChallenges.map((c) => {
              const target = Math.max(1, c.target ?? 1);
              const progress = Math.min(target, Math.max(0, c.progress ?? 0));
              const pct = Math.round((progress / target) * 100);
              const left = daysLeft(c.expiresAt);
              const typeKey = (c.type ?? "special").toLowerCase();
              const typeLabel = t(`engagement.challengeType.${typeKey}`);
              return (
                <li
                  key={c.id ?? `${c.title}-${c.startedAt}`}
                  className="rounded-2xl border border-ink/[0.06] bg-surface p-4 shadow-soft"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cx(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1",
                            challengeTone(c.type),
                          )}
                        >
                          {typeLabel}
                        </span>
                        {left != null ? (
                          <span className="text-[11px] font-medium text-ink-faint">
                            {left === 0
                              ? t("engagement.expiresToday")
                              : t("engagement.expiresIn", { n: left })}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 font-display text-base font-bold text-ink">
                        {c.title ?? c.id}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-mute">
                        {c.description}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-xl bg-mint-100 px-2.5 py-1 text-xs font-bold text-mint-900">
                      +{c.reward ?? 0} pts
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-[11px] font-semibold text-ink-mute">
                      <span>
                        {progress}/{target}
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ink/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-mint-500 transition-[width]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  {(c.id ?? "").includes("invite") ? (
                    <Link
                      href="/app/invitations"
                      className="mt-3 inline-flex text-xs font-bold text-brand-600 hover:underline"
                    >
                      {t("engagement.challengeInviteCta")} →
                    </Link>
                  ) : (c.id ?? "").includes("contribution") ||
                    (c.id ?? "").includes("cotis") ? (
                    <Link
                      href="/app/contributions"
                      className="mt-3 inline-flex text-xs font-bold text-brand-600 hover:underline"
                    >
                      {t("engagement.challengeContributeCta")} →
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("engagement.lbPoints")}>
          {board.loading && (
            <p className="text-sm text-ink-mute">{t("common.loading")}</p>
          )}
          {boardList.length === 0 && !board.loading ? (
            <EmptyState>{t("engagement.lbEmpty")}</EmptyState>
          ) : (
            <ol className="space-y-2">
              {boardList.map((r, i) => {
                const name = leaderName(r, t("common.member"));
                const mine = myUserId && r.userId === myUserId;
                return (
                  <li
                    key={r.userId ?? r.id ?? i}
                    className={cx(
                      "flex items-center gap-3 rounded-xl px-2 py-2 text-sm",
                      mine && "bg-brand-50 ring-1 ring-brand-200",
                    )}
                  >
                    <span className="w-6 shrink-0 text-center text-xs font-bold text-ink-faint">
                      #{r.rank ?? i + 1}
                    </span>
                    <MemberAvatar
                      name={name}
                      avatarUrl={r.avatar}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">
                        {name}
                        {mine ? ` · ${t("engagement.you")}` : ""}
                      </p>
                      <p className="text-[11px] text-ink-mute">
                        {t("engagement.levelShort", { n: r.level ?? 0 })}
                        {r.badgeCount
                          ? ` · ${t("engagement.badgeCount", { n: r.badgeCount })}`
                          : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-bold tabular-nums text-ink">
                      {t("engagement.pts", {
                        n: r.totalPoints ?? r.points ?? 0,
                      })}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>

        <Panel title={t("engagement.lbStreaks")}>
          {streaks.loading && (
            <p className="text-sm text-ink-mute">{t("common.loading")}</p>
          )}
          {streakList.length === 0 && !streaks.loading ? (
            <EmptyState>{t("engagement.noData")}</EmptyState>
          ) : (
            <ol className="space-y-2">
              {streakList.map((r, i) => {
                const name = leaderName(r, t("common.member"));
                const mine = myUserId && r.userId === myUserId;
                const days = r.currentStreak ?? 0;
                return (
                  <li
                    key={r.userId ?? r.id ?? i}
                    className={cx(
                      "flex items-center gap-3 rounded-xl px-2 py-2 text-sm",
                      mine && "bg-mint-50 ring-1 ring-mint-200",
                      i === 0 && !mine && "bg-amber-50/60",
                    )}
                  >
                    <span className="w-6 shrink-0 text-center text-xs font-bold text-ink-faint">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${r.rank ?? i + 1}`}
                    </span>
                    <MemberAvatar
                      name={name}
                      avatarUrl={r.avatar}
                      size="sm"
                      trustRing={days > 0}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">
                        {name}
                        {mine ? ` · ${t("engagement.you")}` : ""}
                      </p>
                      <p className="text-[11px] text-ink-mute">
                        {t("engagement.longestShort", {
                          n: r.longestStreak ?? days,
                        })}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-mint-100 px-2 py-1 text-xs font-bold tabular-nums text-mint-900">
                      🔥 {t("engagement.days", { n: days })}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
}
