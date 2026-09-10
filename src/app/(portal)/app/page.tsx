"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useBff } from "@/lib/use-bff";
import {
  initialsFrom,
  normalizeList,
  sortRoomsByActivity,
  type ChatRoom,
} from "@/lib/portal-api";
import { cx } from "@/lib/cx";
import { NextStepCard } from "@/lib/ui";
import {
  ONBOARDING_STEPS,
  checklistProgress,
  loadChecklist,
  markChecklist,
  touchLastVisit,
  type OnboardingKey,
} from "@/lib/retention";
import { useI18n } from "@/lib/i18n/context";
import { ViralGrowthCard } from "@/components/viral-growth-card";
import { LiveActivityList, type LiveActivityItem } from "@/components/live-activity-list";

export default function PortalHomePage() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const first =
    (session?.user?.name ?? session?.user?.preferred_username ?? "là")
      .split(/\s+/)[0] ?? "là";

  const roomsBff = useBff<unknown>("/chat/rooms");
  const liveToday = useBff<{ items?: LiveActivityItem[] }>(
    "/chat/live-activity/me?limit=12",
  );
  const unreadChat = useBff<{ count?: number }>("/chat/unread");
  const unreadNotif = useBff<{ count?: number }>("/notifications/unread/count");
  const invitations = useBff<unknown>("/invitations/my-invitations");
  const tontines = useBff<unknown>("/tontines/mine");
  const contributions = useBff<unknown>(
    "/contributions/my-contributions?limit=20",
  );
  const engagement = useBff<{
    currentStreak?: number;
    level?: number;
    totalPoints?: number;
    streakAtRisk?: boolean;
    stats?: { invitationsAccepted?: number };
  }>("/engagement/me");

  const [checklist, setChecklist] = useState(loadChecklist);
  const [visit, setVisit] = useState<{ daysSince?: number; returning: boolean }>(
    { returning: false },
  );

  useEffect(() => {
    setChecklist(loadChecklist());
    setVisit(touchLastVisit());
  }, []);

  const rooms = useMemo(() => {
    const list = Array.isArray(roomsBff.data)
      ? (roomsBff.data as ChatRoom[])
      : normalizeList<ChatRoom>(roomsBff.data, ["items", "rooms", "data"]);
    return sortRoomsByActivity(list).slice(0, 5);
  }, [roomsBff.data]);

  const inviteCount = useMemo(
    () =>
      normalizeList(invitations.data, ["items", "invitations", "data"]).length,
    [invitations.data],
  );
  const tontineCount = useMemo(
    () => normalizeList(tontines.data, ["items", "tontines", "data"]).length,
    [tontines.data],
  );
  const cagnotteCount = useMemo(
    () =>
      normalizeList(contributions.data, ["items", "contributions", "data"])
        .length,
    [contributions.data],
  );

  const chatUnread = unreadChat.data?.count ?? 0;
  const notifUnread = unreadNotif.data?.count ?? 0;
  const progress = checklistProgress(checklist);
  const showOnboarding = progress.pct < 100;

  const nextActions = useMemo(() => {
    const actions: Array<{
      title: string;
      description: string;
      href: string;
      cta: string;
      tone: "brand" | "mint" | "ink";
    }> = [];
    if (chatUnread > 0) {
      actions.push({
        title: t("home.msgPending", { n: chatUnread }),
        description: t("home.msgPendingDesc"),
        href: "/app/chat",
        cta: t("home.openChatCta"),
        tone: "brand",
      });
    }
    if (inviteCount > 0) {
      actions.push({
        title: t("home.invitesPending", { n: inviteCount }),
        description: t("home.invitesDesc"),
        href: "/app/invitations",
        cta: t("home.seeInvites"),
        tone: "mint",
      });
    }
    if (notifUnread > 0) {
      actions.push({
        title: t("home.alertsTitle"),
        description: t("home.alertsDesc"),
        href: "/app/notifications",
        cta: t("home.openAlerts"),
        tone: "ink",
      });
    }
    if (engagement.data?.streakAtRisk) {
      actions.push({
        title: t("home.streakDanger"),
        description: t("home.streakDangerDesc"),
        href: "/app/engagement",
        cta: t("home.protectStreak"),
        tone: "brand",
      });
    }
    if (actions.length === 0) {
      if (rooms.length > 0) {
        actions.push({
          title: t("home.continueChat"),
          description: t("home.continueChatDesc"),
          href: `/app/chat?room=${rooms[0].id}`,
          cta: t("home.resume"),
          tone: "brand",
        });
      } else {
        actions.push({
          title: t("home.firstCircle"),
          description: t("home.firstCircleDesc"),
          href: "/app/tontines",
          cta: t("home.start"),
          tone: "mint",
        });
      }
    }
    return actions.slice(0, 3);
  }, [
    chatUnread,
    inviteCount,
    notifUnread,
    engagement.data?.streakAtRisk,
    rooms,
    t,
  ]);

  const completeStep = (key: OnboardingKey) => {
    markChecklist(key);
    setChecklist(loadChecklist());
  };

  const greeting = visit.returning
    ? visit.daysSince && visit.daysSince >= 1
      ? `${t("home.welcomeBack")}, ${first}`
      : `${t("home.greeting")} ${first}`
    : `${t("home.greeting")}, ${first}`;

  return (
    <div className="space-y-8">
      {/* Hero rétention */}
      <section className="social-rise relative overflow-hidden rounded-2.5xl bg-gradient-to-br from-ink via-[#1c2230] to-mint-800 p-6 text-white shadow-chat sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-500/30 blur-3xl"
        />
        <p className="text-sm font-semibold text-white/70">{greeting}</p>
        <h1 className="mt-2 max-w-xl font-display text-3xl font-bold tracking-tight sm:text-[2.35rem]">
          {chatUnread > 0
            ? t("home.circleWaiting")
            : t("home.oneMinute")}
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/75">
          {t("home.heroSub")}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {engagement.data?.currentStreak != null ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur">
              🔥 {t("home.streakDays", { n: engagement.data.currentStreak })}
              {engagement.data.streakAtRisk ? ` ${t("home.streakRisk")}` : ""}
            </span>
          ) : null}
          {engagement.data?.level != null ? (
            <span className="inline-flex rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur">
              {t("home.levelPts", {
                level: engagement.data.level,
                pts: engagement.data.totalPoints ?? 0,
              })}
            </span>
          ) : null}
          <span className="inline-flex rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur">
            {t("home.circles", { n: tontineCount + cagnotteCount })}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/app/chat"
            onClick={() => completeStep("joined_chat")}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-lift transition hover:bg-brand-400"
          >
            {chatUnread > 0 ? t("home.openChat") : t("home.openChat")}
            {chatUnread > 0 ? (
              <span className="rounded-md bg-ink/25 px-2 py-0.5 text-[10px]">
                {chatUnread}
              </span>
            ) : null}
          </Link>
          <Link
            href="/app/discover"
            className="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold backdrop-blur transition hover:bg-white/15"
          >
            {t("home.discover")}
          </Link>
        </div>
      </section>

      {/* À faire — une chose claire */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold tracking-tight text-ink">
          {t("home.todoNow")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {nextActions.map((a) => (
            <NextStepCard key={a.href + a.title} {...a} />
          ))}
        </div>
      </section>

      <ViralGrowthCard engagement={engagement.data} />

      {/* Onboarding progressif */}
      {showOnboarding && (
        <section className="rounded-2.5xl border border-ink/[0.06] bg-surface p-5 shadow-soft">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">
                {t("home.firstSteps")}
              </h2>
              <p className="text-sm text-ink-mute">
                {t("home.onboardingHint", {
                  done: progress.done,
                  total: progress.total,
                })}
              </p>
            </div>
            <div className="h-2 w-32 overflow-hidden rounded-full bg-surface-sunken">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-mint-500 transition-all"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {ONBOARDING_STEPS.map((step) => {
              const done = checklist[step.key];
              return (
                <li key={step.key}>
                  <Link
                    href={step.href}
                    onClick={() => completeStep(step.key)}
                    className={cx(
                      "flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                      done
                        ? "bg-mint-50 text-mint-900"
                        : "bg-surface-sunken/50 text-ink hover:bg-brand-50",
                    )}
                  >
                    <span className="font-medium">
                      {done ? "✓ " : "○ "}
                      {t(`home.${step.titleKey}`)}
                    </span>
                    {!done ? (
                      <span className="text-xs font-bold text-brand-600">
                        {t("common.go")}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-mint-700">
                        {t("common.done")}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Discussions — hub social */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
              {t("home.resumeChat")}
            </h2>
            <p className="text-sm text-ink-mute">
              {t("home.chatGesture")}
            </p>
          </div>
          <Link
            href="/app/chat"
            className="text-sm font-bold text-brand-600 hover:text-brand-700"
          >
            {t("common.seeAll")}
          </Link>
        </div>

        {(liveToday.data?.items?.length ?? 0) > 0 ? (
          <div className="rounded-2.5xl border border-ink/[0.06] bg-surface p-4 shadow-soft">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-ink-mute">
              Dans tes chats — moments récents
            </p>
            <p className="mb-3 text-xs text-ink-mute">
              Chaque événement ouvre le fil de discussion du cercle.
            </p>
            <LiveActivityList
              items={liveToday.data!.items!}
              showRoomLink
              compact
            />
          </div>
        ) : null}

        {roomsBff.loading && rooms.length === 0 ? (
          <p className="text-sm text-ink-mute">{t("common.loading")}</p>
        ) : rooms.length === 0 ? (
          <div className="rounded-2.5xl border border-dashed border-ink/10 bg-surface/80 p-8 text-center">
            <p className="font-display text-lg font-bold text-ink">
              {t("home.noRooms")}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink-mute">
              {t("home.noRoomsHint")}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link
                href="/app/tontines"
                onClick={() => completeStep("opened_tontine")}
                className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-lift"
              >
                {t("home.createTontine")}
              </Link>
              <Link
                href="/app/contributions"
                className="rounded-xl border border-ink/[0.1] bg-surface px-4 py-2.5 text-sm font-semibold"
              >
                {t("home.createPot")}
              </Link>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {rooms.map((r) => {
              const label =
                r.name ??
                t("home.roomFallback", { id: r.id.slice(0, 8) });
              return (
                <li key={r.id}>
                  <Link
                    href={`/app/chat?room=${r.id}`}
                    onClick={() => completeStep("joined_chat")}
                    className="group flex items-center gap-3 rounded-2xl border border-ink/[0.06] bg-surface px-4 py-3 shadow-soft transition hover:border-brand-200 hover:shadow-lift"
                  >
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-mint-600 text-xs font-bold text-white">
                      {initialsFrom(label) || "C"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink group-hover:text-brand-600">
                        {label}
                      </p>
                      <p className="truncate text-xs text-ink-mute">
                        {r.memberCount
                          ? `${r.memberCount} ${t("common.members")}`
                          : t("home.groupChat")}
                      </p>
                    </div>
                    <span className="rounded-xl bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 opacity-0 transition group-hover:opacity-100">
                      {t("home.write")}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Raccourcis secondaires — discrets */}
      <section className="grid gap-2 sm:grid-cols-4">
        {[
          { href: "/app/tontines", label: t("nav.tontines"), n: tontineCount },
          { href: "/app/contributions", label: t("nav.contributions"), n: cagnotteCount },
          { href: "/app/engagement", label: t("nav.engagement"), n: null },
          { href: "/app/profile", label: t("nav.profile"), n: null },
        ].map((x) => (
          <Link
            key={x.href}
            href={x.href}
            className="rounded-xl border border-ink/[0.06] bg-surface/70 px-4 py-3 text-center text-sm font-semibold text-ink-soft transition hover:border-brand-200 hover:text-ink"
          >
            {x.label}
            {x.n != null ? (
              <span className="ml-1 text-ink-faint">({x.n})</span>
            ) : null}
          </Link>
        ))}
      </section>
    </div>
  );
}
