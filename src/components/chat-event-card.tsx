"use client";

import { cx } from "@/lib/cx";
import { useI18n } from "@/lib/i18n/context";
import type { ChatMessage } from "@/lib/portal-api";
import { resolveSystemEvent, systemEventCopy } from "@/lib/system-event-text";

const CARD: Record<string, { emoji: string; className: string }> = {
  milestone_reached: {
    emoji: "🎯",
    className:
      "border-[color:var(--warn-border)] bg-gradient-to-br from-[var(--warn-bg)] to-surface",
  },
  goal_reached: {
    emoji: "🏁",
    className: "border-mint-200 bg-gradient-to-br from-mint-50 to-surface",
  },
  cotisation_confirmed: {
    emoji: "✅",
    className: "border-brand-200 bg-gradient-to-br from-brand-50 to-surface",
  },
  cotisation_new: {
    emoji: "💸",
    className:
      "border-[color:var(--info-border)] bg-gradient-to-br from-[var(--info-bg)] to-surface",
  },
  commitment: {
    emoji: "🤝",
    className: "border-brand-200/80 bg-gradient-to-br from-brand-50/80 to-mint-50/40",
  },
  participant_joined: {
    emoji: "👋",
    className: "border-ink/10 bg-surface",
  },
  participant_left: {
    emoji: "🚪",
    className: "border-ink/10 bg-surface-sunken",
  },
  contribution_closed: {
    emoji: "🔒",
    className:
      "border-[color:var(--danger-border)] bg-[var(--danger-bg)] text-[color:var(--danger-fg)]",
  },
  tontine_round_paid: {
    emoji: "✅",
    className: "border-mint-200 bg-mint-50",
  },
  tontine_defaulted: {
    emoji: "⚠️",
    className:
      "border-[color:var(--danger-border)] bg-[var(--danger-bg)] text-[color:var(--danger-fg)]",
  },
  tontine_round_completed: {
    emoji: "🔄",
    className: "border-brand-200 bg-brand-50",
  },
  tontine_completed: {
    emoji: "🏆",
    className:
      "border-[color:var(--warn-border)] bg-[var(--warn-bg)] text-[color:var(--warn-fg)]",
  },
  daily_summary: {
    emoji: "☀️",
    className: "border-ink/10 bg-gradient-to-br from-surface to-mint-50/40",
  },
  room_created: {
    emoji: "✨",
    className: "border-ink/10 bg-surface",
  },
  asca_cycle_opened: {
    emoji: "🔄",
    className: "border-brand-200 bg-brand-50",
  },
  asca_cycle_closed: {
    emoji: "🔄",
    className: "border-brand-200 bg-brand-50",
  },
  asca_loan_requested: {
    emoji: "🏦",
    className: "border-brand-200 bg-brand-50",
  },
  asca_loan_sending: {
    emoji: "🏦",
    className: "border-brand-200 bg-brand-50",
  },
  asca_loan_disbursed: {
    emoji: "✅",
    className: "border-brand-200 bg-brand-50",
  },
  asca_deposit: {
    emoji: "💰",
    className: "border-brand-200 bg-brand-50",
  },
  asca_loan_repaid: {
    emoji: "✅",
    className: "border-brand-200 bg-brand-50",
  },
  asca_loan_defaulted: {
    emoji: "⚠️",
    className:
      "border-[color:var(--danger-border)] bg-[var(--danger-bg)] text-[color:var(--danger-fg)]",
  },
};

export function ChatEventCard({
  message,
  highlight,
}: {
  message: ChatMessage;
  highlight?: boolean;
}) {
  const { t } = useI18n();
  const type = resolveSystemEvent(message.eventType, message.eventData) || "room_created";
  const meta = CARD[type] ?? {
    emoji: "•",
    className: "border-ink/10 bg-surface",
  };
  const copy = systemEventCopy(t, message.eventType, message.eventData, message.content);
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
            {copy.title}
          </p>
          <p className="mt-0.5 text-sm font-semibold leading-snug text-ink">
            {copy.body}
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
