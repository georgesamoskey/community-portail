"use client";

import Link from "next/link";
import { cx } from "@/lib/cx";
import { formatDateTime } from "@/lib/ui";

export type LiveActivityItem = {
  id?: string;
  roomId?: string;
  roomName?: string;
  contributionId?: string | null;
  tontineId?: string | null;
  eventType?: string;
  content?: string;
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
};

function iconFor(type?: string): string {
  switch (type) {
    case "milestone_reached":
      return "🎯";
    case "goal_reached":
      return "🏁";
    case "cotisation_confirmed":
    case "tontine_round_paid":
      return "✅";
    case "cotisation_new":
      return "💸";
    case "commitment":
      return "🤝";
    case "tontine_defaulted":
      return "⚠️";
    case "tontine_round_completed":
      return "🔄";
    case "tontine_completed":
      return "🏆";
    case "contribution_closed":
      return "🔒";
    case "participant_joined":
      return "👋";
    default:
      return "•";
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
  if (!items.length) {
    return <p className="text-sm text-ink-mute">{emptyLabel}</p>;
  }

  return (
    <ul className={cx("space-y-2", compact && "space-y-1.5")}>
      {items.map((it) => {
        const tone =
          TONE[it.eventType ?? ""] ?? "border-ink/10 bg-surface text-ink";
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
              <span className="shrink-0" aria-hidden>
                {iconFor(it.eventType)}
              </span>
              <div className="min-w-0 flex-1">
                {showRoomLink && it.roomName ? (
                  <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                    {it.roomName}
                  </p>
                ) : null}
                <p className="font-medium leading-snug">{it.content}</p>
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
