"use client";

import Link from "next/link";
import { MemberAvatar } from "@/components/member-avatar";
import { memberDisplayName } from "@/lib/member-display";
import { Btn } from "@/lib/ui";
import { useI18n } from "@/lib/i18n/context";

export type NetworkInvitee = {
  userId?: string;
  score?: number;
  algorithm?: string;
  displayLabel?: string;
  displayName?: string;
  fullName?: string;
  avatar?: string | null;
};

export function NetworkInviteeRow({
  person,
  onMarkInvited,
  shareHref,
  compact,
}: {
  person: NetworkInvitee;
  onMarkInvited?: () => void;
  shareHref?: string;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const name = memberDisplayName(person, t("common.member"));
  const scorePct =
    person.score != null && !Number.isNaN(Number(person.score))
      ? Math.round(Number(person.score) * 100)
      : null;

  return (
    <div
      className={
        compact
          ? "flex items-center gap-2 rounded-xl border border-ink/[0.06] px-3 py-2"
          : "flex flex-wrap items-center gap-3 rounded-2xl border border-ink/[0.06] bg-surface p-3 shadow-soft sm:flex-nowrap"
      }
    >
      <MemberAvatar name={name} avatarUrl={person.avatar} size={compact ? "sm" : "md"} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{name}</p>
        <p className="text-xs text-ink-mute">
          {t("discover.networkMatch")}
          {scorePct != null ? ` · ${scorePct}%` : ""}
        </p>
      </div>
      {onMarkInvited ? (
        <Btn variant="secondary" onClick={onMarkInvited}>
          {t("discover.markInvited")}
        </Btn>
      ) : null}
      {shareHref ? (
        <a
          href={shareHref}
          className="text-xs font-semibold text-brand-700"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("discover.inviteOnPot")}
        </a>
      ) : (
        <Link
          href="/app/discover"
          className="text-xs font-semibold text-brand-700"
        >
          {t("common.invite")}
        </Link>
      )}
    </div>
  );
}
