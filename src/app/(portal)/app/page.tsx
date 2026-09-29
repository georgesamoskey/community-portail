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
import { MemberTrustBadge } from "@/components/member-trust-badge";
import {
  NetworkInviteeRow,
  type NetworkInvitee,
} from "@/components/network-invitee-row";
import {
  ContributionCard,
  type ContributionLike,
  MobileEmpty,
  MobileHero,
  QuickChip,
  SectionLabel,
  TabFab,
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
  return {
    created: normalizeList<ContributionLike>(data, [
      "items",
      "contributions",
      "data",
    ]),
    participated: [],
  };
}

export default function PortalHomePage() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const first =
    (session?.user?.name ?? session?.user?.preferred_username ?? "là")
      .split(/\s+/)[0] ?? "là";

  const roomsBff = useBff<unknown>("/chat/rooms");
  const unreadChat = useBff<{ count?: number }>("/chat/unread");
  const unreadNotif = useBff<{ count?: number }>("/notifications/unread/count");
  const invitations = useBff<unknown>("/invitations/my-invitations");
  const tontines = useBff<unknown>("/tontines/mine");
  const contributions = useBff<unknown>("/contributions/my-contributions");
  const engagement = useBff<{
    currentStreak?: number;
    level?: number;
    totalPoints?: number;
    streakAtRisk?: boolean;
    stats?: { invitationsAccepted?: number };
  }>("/engagement/me");
  const circleActivity = useBff<{ items?: LiveActivityItem[] }>(
    "/chat/live-activity/me?limit=12",
  );
  const networkInvitees = useBff<unknown>(
    "/recommendations/invitees?limit=4",
  );
  const referralBrief = useBff<{ acceptedCount?: number }>(
    "/referral/me/cercle",
  );

  const [checklist, setChecklist] = useState(loadChecklist);
  const [visit, setVisit] = useState<{ daysSince?: number; returning: boolean }>(
    { returning: false },
  );

  useEffect(() => {
    setChecklist(loadChecklist());
    setVisit(touchLastVisit());
  }, []);

  const { created, participated } = useMemo(
    () => asBuckets(contributions.data),
    [contributions.data],
  );
  const myPots = [...created, ...participated].slice(0, 6);

  const rooms = useMemo(() => {
    const list = Array.isArray(roomsBff.data)
      ? (roomsBff.data as ChatRoom[])
      : normalizeList<ChatRoom>(roomsBff.data, ["items", "rooms", "data"]);
    return sortRoomsByActivity(list).slice(0, 3);
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

  const chatUnread = unreadChat.data?.count ?? 0;
  const notifUnread = unreadNotif.data?.count ?? 0;
  const progress = checklistProgress(checklist);
  const showOnboarding = progress.pct < 100;

  const activityItems = useMemo(() => {
    const raw = circleActivity.data;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as LiveActivityItem[];
    return raw.items ?? [];
  }, [circleActivity.data]);

  const networkPeople = useMemo(() => {
    const raw = Array.isArray(networkInvitees.data)
      ? (networkInvitees.data as NetworkInvitee[])
      : normalizeList<NetworkInvitee>(networkInvitees.data, [
          "items",
          "invitees",
          "data",
        ]);
    return raw.filter((u) => u.userId).slice(0, 3);
  }, [networkInvitees.data]);

  const acceptedInvites =
    referralBrief.data?.acceptedCount ??
    engagement.data?.stats?.invitationsAccepted ??
    0;
  const trustSignals = useMemo(
    () => ({
      currentStreak: engagement.data?.currentStreak,
      level: engagement.data?.level,
      streakAtRisk: engagement.data?.streakAtRisk,
      ambassador: acceptedInvites >= 5,
    }),
    [engagement.data, acceptedInvites],
  );

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
    return actions.slice(0, 2);
  }, [chatUnread, inviteCount, notifUnread, t]);

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
    <div className="relative space-y-5 pb-20">
      <MobileHero>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white/75">{greeting}</p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">
              {chatUnread > 0 ? t("home.circleWaiting") : t("home.oneMinute")}
            </h1>
          </div>
          <Link
            href="/app/notifications"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white"
            aria-label={t("nav.notifications")}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 9.5a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13.5 6 9.5Z"
                stroke="currentColor"
                strokeWidth="1.75"
              />
            </svg>
            {notifUnread > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 min-w-[1rem] rounded-md bg-white px-1 text-[9px] font-bold text-brand-700">
                {notifUnread > 9 ? "9+" : notifUnread}
              </span>
            ) : null}
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-bold">
            {t("home.circles", { n: tontineCount + myPots.length })}
          </span>
          <MemberTrustBadge
            signals={trustSignals}
            className="[&_span]:bg-white/15 [&_span]:text-white"
          />
        </div>
      </MobileHero>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <SectionLabel>{t("home.circleActivity")}</SectionLabel>
          <Link href="/app/chat" className="text-xs font-bold text-brand-600">
            {t("common.seeAll")}
          </Link>
        </div>
        {circleActivity.loading && activityItems.length === 0 ? (
          <p className="text-sm text-ink-mute">{t("common.loading")}</p>
        ) : activityItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/10 bg-surface-sunken/40 px-4 py-3">
            <p className="text-sm text-ink-mute">
              {t("home.circleActivityEmpty")}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href="/app/chat"
                className="text-xs font-bold text-brand-600"
              >
                {t("home.openChat")}
              </Link>
              <span className="text-ink-faint">·</span>
              <Link
                href="/app/contributions#create"
                className="text-xs font-bold text-brand-600"
              >
                {t("home.createPot")}
              </Link>
            </div>
          </div>
        ) : (
          <LiveActivityList
            items={activityItems}
            showRoomLink
            compact
          />
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <QuickChip href="/app/chat">{t("nav.messages")}</QuickChip>
        <QuickChip href="/app/tontines">{t("nav.tontines")}</QuickChip>
        <QuickChip href="/app/contributions">{t("nav.contributions")}</QuickChip>
        <QuickChip href="/app/history">{t("nav.history")}</QuickChip>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-ink/[0.06] bg-surface p-3.5 shadow-soft">
          <p className="text-xl font-bold text-brand-600">{created.length}</p>
          <p className="text-[11px] font-semibold text-ink-mute">
            {t("history.sectionCreated")}
          </p>
        </div>
        <div className="rounded-2xl border border-ink/[0.06] bg-surface p-3.5 shadow-soft">
          <p className="text-xl font-bold text-mint-600">
            {participated.length}
          </p>
          <p className="text-[11px] font-semibold text-ink-mute">
            {t("history.sectionJoined")}
          </p>
        </div>
        <Link
          href="/app/tontines"
          className="rounded-2xl border border-ink/[0.06] bg-surface p-3.5 shadow-soft"
        >
          <p className="text-xl font-bold text-ink">{tontineCount}</p>
          <p className="text-[11px] font-semibold text-ink-mute">
            {t("nav.tontines")}
          </p>
        </Link>
        <Link
          href="/app/chat"
          className="rounded-2xl border border-ink/[0.06] bg-surface p-3.5 shadow-soft"
        >
          <p className="text-xl font-bold text-ink">{chatUnread}</p>
          <p className="text-[11px] font-semibold text-ink-mute">
            {t("nav.messages")}
          </p>
        </Link>
      </section>

      {nextActions.length > 0 ? (
        <section className="space-y-2">
          <SectionLabel>{t("home.todoNow")}</SectionLabel>
          <div className="grid gap-2 sm:grid-cols-2">
            {nextActions.map((a) => (
              <NextStepCard key={a.href + a.title} {...a} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <SectionLabel>{t("nav.contributions")}</SectionLabel>
          <Link
            href="/app/contributions"
            className="text-xs font-bold text-brand-600"
          >
            {t("common.seeAll")}
          </Link>
        </div>
        {contributions.loading && myPots.length === 0 ? (
          <p className="text-sm text-ink-mute">{t("common.loading")}</p>
        ) : myPots.length === 0 ? (
          <MobileEmpty
            title={t("home.createPot")}
            hint={t("home.firstCircleDesc")}
            actionHref="/app/contributions#create"
            actionLabel={t("home.createShort")}
          />
        ) : (
          <ul className="space-y-2">
            {myPots.map((c) => (
              <li key={c.id}>
                <ContributionCard item={c} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href="/app/tontines"
        className="flex items-center justify-between rounded-2xl border border-mint-100 bg-mint-50/70 px-4 py-3.5"
      >
        <div>
          <p className="text-sm font-bold text-mint-900">{t("nav.tontines")}</p>
          <p className="text-xs text-ink-mute">
            {t("home.circles", { n: tontineCount })}
          </p>
        </div>
        <span className="text-mint-700" aria-hidden>
          ›
        </span>
      </Link>

      {networkPeople.length > 0 ? (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <SectionLabel>{t("home.networkPeople")}</SectionLabel>
              <p className="text-xs text-ink-mute">{t("home.networkPeopleHint")}</p>
            </div>
            <Link
              href="/app/discover"
              className="text-xs font-bold text-brand-600"
            >
              {t("common.seeAll")}
            </Link>
          </div>
          <ul className="space-y-2">
            {networkPeople.map((u) => (
              <li key={u.userId}>
                <NetworkInviteeRow person={u} compact />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ViralGrowthCard engagement={engagement.data} />

      {showOnboarding ? (
        <section className="rounded-2xl border border-ink/[0.06] bg-surface p-4 shadow-soft">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-ink">
                {t("home.firstSteps")}
              </h2>
              <p className="text-xs text-ink-mute">
                {t("home.onboardingHint", {
                  done: progress.done,
                  total: progress.total,
                })}
              </p>
            </div>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-sunken">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </div>
          <ul className="mt-3 space-y-1.5">
            {ONBOARDING_STEPS.map((step) => {
              const done = checklist[step.key];
              return (
                <li key={step.key}>
                  <Link
                    href={step.href}
                    onClick={() => completeStep(step.key)}
                    className={cx(
                      "flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm",
                      done
                        ? "bg-mint-50 text-mint-900"
                        : "bg-surface-sunken/50 text-ink",
                    )}
                  >
                    <span className="font-medium">
                      {done ? "✓ " : "○ "}
                      {t(`home.${step.titleKey}`)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {rooms.length > 0 ? (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <SectionLabel>{t("nav.messages")}</SectionLabel>
            <Link href="/app/chat" className="text-xs font-bold text-brand-600">
              {t("common.seeAll")}
            </Link>
          </div>
          <ul className="space-y-2">
            {rooms.map((r) => {
              const label =
                r.name ?? t("home.roomFallback", { id: r.id.slice(0, 8) });
              return (
                <li key={r.id}>
                  <Link
                    href={`/app/chat?room=${r.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-ink/[0.06] bg-surface px-3.5 py-3 shadow-soft"
                  >
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-xs font-bold text-white">
                      {initialsFrom(label) || "C"}
                    </span>
                    <p className="min-w-0 flex-1 truncate font-semibold text-ink">
                      {label}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <TabFab href="/app/contributions#create" label={t("home.createShort")} />
    </div>
  );
}
