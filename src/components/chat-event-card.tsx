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
    className:
      "border-[color:var(--warn-border)] bg-gradient-to-br from-[var(--warn-bg)] to-surface",
  },
  goal_reached: {
    emoji: "🏁",
    title: "Objectif atteint",
    className: "border-mint-200 bg-gradient-to-br from-mint-50 to-surface",
  },
  cotisation_confirmed: {
    emoji: "✅",
    title: "Cotisation confirmée",
    className: "border-brand-200 bg-gradient-to-br from-brand-50 to-surface",
  },
  cotisation_new: {
    emoji: "💸",
    title: "Cotisation déclarée",
    className:
      "border-[color:var(--info-border)] bg-gradient-to-br from-[var(--info-bg)] to-surface",
  },
  commitment: {
    emoji: "🤝",
    title: "Engagement",
    className: "border-brand-200/80 bg-gradient-to-br from-brand-50/80 to-mint-50/40",
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
    className:
      "border-[color:var(--danger-border)] bg-[var(--danger-bg)] text-[color:var(--danger-fg)]",
  },
  tontine_round_paid: {
    emoji: "✅",
    title: "Tour payé",
    className: "border-mint-200 bg-mint-50",
  },
  tontine_defaulted: {
    emoji: "⚠️",
    title: "Défaut",
    className:
      "border-[color:var(--danger-border)] bg-[var(--danger-bg)] text-[color:var(--danger-fg)]",
  },
  tontine_round_completed: {
    emoji: "🔄",
    title: "Tour clôturé",
    className: "border-brand-200 bg-brand-50",
  },
  tontine_completed: {
    emoji: "🏆",
    title: "Tontine terminée",
    className:
      "border-[color:var(--warn-border)] bg-[var(--warn-bg)] text-[color:var(--warn-fg)]",
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
