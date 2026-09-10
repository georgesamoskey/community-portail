"use client";

import { cx } from "@/lib/cx";
import type { ChatMessage } from "@/lib/portal-api";

const CARD: Record<
  string,
  { emoji: string; title: string; className: string }
> = {
  milestone_reached: {
    emoji: "🎯",
    title: "Palier atteint",
    className: "border-amber-200 bg-gradient-to-br from-amber-50 to-white",
  },
  goal_reached: {
    emoji: "🏁",
    title: "Objectif atteint",
    className: "border-mint-200 bg-gradient-to-br from-mint-50 to-white",
  },
  cotisation_confirmed: {
    emoji: "✅",
    title: "Cotisation confirmée",
    className: "border-brand-200 bg-gradient-to-br from-brand-50 to-white",
  },
  cotisation_new: {
    emoji: "💸",
    title: "Cotisation déclarée",
    className: "border-sky-200 bg-gradient-to-br from-sky-50 to-white",
  },
  commitment: {
    emoji: "🤝",
    title: "Engagement",
    className: "border-violet-200 bg-gradient-to-br from-violet-50 to-white",
  },
  participant_joined: {
    emoji: "👋",
    title: "Nouveau membre",
    className: "border-ink/10 bg-surface",
  },
  participant_left: {
    emoji: "🚪",
    title: "Départ",
    className: "border-ink/10 bg-surface-sunken",
  },
  contribution_closed: {
    emoji: "🔒",
    title: "Cagnotte clôturée",
    className: "border-rose-200 bg-rose-50",
  },
  tontine_round_paid: {
    emoji: "✅",
    title: "Tour payé",
    className: "border-mint-200 bg-mint-50",
  },
  tontine_defaulted: {
    emoji: "⚠️",
    title: "Défaut",
    className: "border-rose-200 bg-rose-50",
  },
  tontine_round_completed: {
    emoji: "🔄",
    title: "Tour clôturé",
    className: "border-brand-200 bg-brand-50",
  },
  tontine_completed: {
    emoji: "🏆",
    title: "Tontine terminée",
    className: "border-amber-200 bg-amber-50",
  },
  daily_summary: {
    emoji: "☀️",
    title: "Résumé du jour",
    className: "border-ink/10 bg-gradient-to-br from-surface to-mint-50/40",
  },
  room_created: {
    emoji: "✨",
    title: "Cercle ouvert",
    className: "border-ink/10 bg-surface",
  },
};

export function ChatEventCard({
  message,
  highlight,
}: {
  message: ChatMessage;
  highlight?: boolean;
}) {
  const type = message.eventType ?? "room_created";
  const meta = CARD[type] ?? {
    emoji: "•",
    title: "Activité",
    className: "border-ink/10 bg-surface",
  };
  const amount = message.eventData?.amount;
  const currency = message.eventData?.currency ?? "BIF";
  const percent = message.eventData?.percent ?? message.eventData?.milestone;

  return (
    <div
      className={cx(
        "chat-msg mx-auto w-full max-w-sm rounded-2xl border px-3.5 py-3 text-left shadow-soft",
        meta.className,
        highlight && "ring-2 ring-brand-400/40",
        message.pending && "opacity-70",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className="text-xl leading-none" aria-hidden>
          {meta.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-mute">
            {meta.title}
          </p>
          <p className="mt-0.5 text-sm font-semibold leading-snug text-ink">
            {message.content}
          </p>
          {(amount != null || percent != null) && (
            <p className="mt-1.5 font-mono text-xs font-bold text-brand-700">
              {amount != null ? `${amount} ${currency}` : ""}
              {amount != null && percent != null ? " · " : ""}
              {percent != null ? `${percent}%` : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
