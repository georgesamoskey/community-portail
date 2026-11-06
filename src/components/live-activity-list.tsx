"use client";

import Link from "next/link";
import { MemberAvatar } from "@/components/member-avatar";
import { cx } from "@/lib/cx";
import { useI18n } from "@/lib/i18n/context";
import { formatDateTime } from "@/lib/ui";
import { resolveSystemEvent, systemEventCopy } from "@/lib/system-event-text";

export type LiveActivityItem = {
  id?: string;
  roomId?: string;
  roomName?: string;
  contributionId?: string | null;
  tontineId?: string | null;
  eventType?: string;
  content?: string;
  eventData?: Record<string, unknown> | null;
  actorUserId?: string | null;
  actorName?: string | null;
  actorAvatar?: string | null;
  createdAt?: string;
};

const TONE: Record<string, string> = {
  milestone_reached: "border-amber-200 bg-amber-50 text-amber-950",
  goal_reached: "border-mint-200 bg-mint-50 text-mint-950",
  cotisation_confirmed: "border-brand-200 bg-brand-50 text-brand-950",
  cotisation_new: "border-sky-200 bg-sky-50 text-sky-950",
  commitment: "border-violet-200 bg-violet-50 text-violet-950",
  participant_joined: "border-ink/10 bg-surface-sunken text-ink",
  participant_left: "border-ink/10 bg-surface-sunken text-ink-mute",
  contribution_closed: "border-rose-200 bg-rose-50 text-rose-950",
  tontine_round_paid: "border-mint-200 bg-mint-50 text-mint-950",
  tontine_defaulted: "border-rose-200 bg-rose-50 text-rose-950",
  tontine_round_completed: "border-brand-200 bg-brand-50 text-brand-950",
  tontine_completed: "border-amber-200 bg-amber-50 text-amber-950",
  room_created: "border-ink/10 bg-surface text-ink",
  asca_cycle_opened: "border-brand-200 bg-brand-50 text-brand-950",
  asca_cycle_closed: "border-brand-200 bg-brand-50 text-brand-950",
  asca_loan_requested: "border-brand-200 bg-brand-50 text-brand-950",
  asca_loan_sending: "border-brand-200 bg-brand-50 text-brand-950",
  asca_loan_disbursed: "border-brand-200 bg-brand-50 text-brand-950",
  asca_deposit: "border-brand-200 bg-brand-50 text-brand-950",
  asca_loan_repaid: "border-brand-200 bg-brand-50 text-brand-950",
  asca_loan_defaulted: "border-rose-200 bg-rose-50 text-rose-950",
};

export function activityKind(type?: string | null): { icon: string; labelKey: string } {
  switch (type) {
    case "milestone_reached":
      return { icon: "🎯", labelKey: "home.actStep" };
    case "goal_reached":
      return { icon: "🏁", labelKey: "home.actGoal" };
    case "cotisation_confirmed":
      return { icon: "✅", labelKey: "home.actOk" };
    case "tontine_round_paid":
      return { icon: "✅", labelKey: "home.actRound" };
    case "cotisation_new":
      return { icon: "💸", labelKey: "home.actPay" };
    case "commitment":
      return { icon: "🤝", labelKey: "home.actDeal" };
    case "tontine_defaulted":
      return { icon: "⚠️", labelKey: "home.actMiss" };
    case "tontine_round_completed":
      return { icon: "🔄", labelKey: "home.actRound" };
    case "tontine_completed":
      return { icon: "🏆", labelKey: "home.actDone" };
    case "contribution_closed":
      return { icon: "🔒", labelKey: "home.actClose" };
    case "participant_joined":
      return { icon: "👋", labelKey: "home.actJoin" };
    case "participant_left":
      return { icon: "👋", labelKey: "home.actLeave" };
    case "room_created":
      return { icon: "💬", labelKey: "home.actRoom" };
    case "asca_cycle_opened":
    case "asca_cycle_closed":
      return { icon: "🔄", labelKey: "home.actCycle" };
    case "asca_loan_requested":
    case "asca_loan_sending":
    case "asca_loan_disbursed":
    case "asca_loan_defaulted":
      return { icon: "🏦", labelKey: "home.actLoan" };
    case "asca_deposit":
      return { icon: "💰", labelKey: "home.actDeposit" };
    case "asca_loan_repaid":
      return { icon: "✅", labelKey: "home.actRepay" };
    default:
      return { icon: "•", labelKey: "home.actOther" };
  }
}

export function LiveActivityList({
  items,
  emptyLabel = "Fil vide pour le moment.",
  showRoomLink = false,
  compact = false,
}: {
  items: LiveActivityItem[];
  emptyLabel?: string;
  showRoomLink?: boolean;
  compact?: boolean;
}) {
  const { t } = useI18n();
  if (!items.length) {
    return <p className="text-sm text-ink-mute">{emptyLabel}</p>;
  }

  return (
    <ul className={cx("space-y-2", compact && "space-y-1.5")}>
      {items.map((it) => {
        const fact = resolveSystemEvent(it.eventType, it.eventData);
        const tone = TONE[fact] ?? "border-ink/10 bg-surface text-ink";
        const kind = activityKind(fact);
        const href = it.roomId
          ? `/app/chat?room=${it.roomId}`
          : it.contributionId
            ? `/app/contributions/${it.contributionId}`
            : it.tontineId
              ? `/app/tontines/${it.tontineId}`
              : null;
        const body = (
          <div
            className={cx(
              "rounded-xl border px-3 py-2 text-sm",
              tone,
              compact && "px-2.5 py-1.5 text-xs",
            )}
          >
            <div className="flex items-start gap-2">
              {it.actorName ? (
                <MemberAvatar
                  name={it.actorName}
                  avatarUrl={it.actorAvatar}
                  size="sm"
                  className="mt-0.5 shrink-0"
                />
              ) : null}
              <span className="shrink-0 text-xs font-bold">
                {kind.icon} {t(kind.labelKey)}
              </span>
              <div className="min-w-0 flex-1">
                {showRoomLink && it.roomName ? (
                  <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                    {it.roomName}
                  </p>
                ) : null}
                {it.actorName ? (
                  <p className="text-[11px] font-bold opacity-80">{it.actorName}</p>
                ) : null}
                <p className="font-medium leading-snug">
                  {systemEventCopy(t, it.eventType, it.eventData, it.content).body}
                </p>
                {it.createdAt ? (
                  <p className="mt-0.5 text-[10px] opacity-60">
                    {formatDateTime(it.createdAt)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        );
        return (
          <li key={it.id ?? `${it.createdAt}-${it.content}`}>
            {href ? (
              <Link href={href} className="block transition hover:opacity-90">
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}
