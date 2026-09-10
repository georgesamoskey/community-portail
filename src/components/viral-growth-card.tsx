"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useBff } from "@/lib/use-bff";
import { useI18n } from "@/lib/i18n/context";
import { normalizeList } from "@/lib/portal-api";
import { trackRecoEvent } from "@/lib/reco-track";
import { africaShareLinks, copyShareText } from "@/lib/africa-share";
import { Btn } from "@/lib/ui";

type Invitee = {
  userId?: string;
  score?: number;
  displayLabel?: string;
  algorithm?: string;
};

type EngagementMe = {
  currentStreak?: number;
  level?: number;
  totalPoints?: number;
  streakAtRisk?: boolean;
  stats?: { invitationsAccepted?: number };
  activeChallenges?: Array<{
    id?: string;
    title?: string;
    description?: string;
    progress?: number;
    target?: number;
  }>;
};

type ReferralPack = {
  code?: string;
  registerUrl?: string;
  portalUrl?: string;
  acceptedCount?: number;
  funnel?: {
    landingHits?: number;
    registeredCount?: number;
    conversionPct?: number;
  };
  share?: {
    text?: string;
    url?: string;
    whatsappUrl?: string;
    smsUrl?: string;
  };
};

const AMBASSADOR_TARGET = 5;

/** Boucle virale Afrique : WhatsApp / SMS / code parrain / challenges. */
export function ViralGrowthCard({ engagement }: { engagement?: EngagementMe | null }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const invitees = useBff<unknown>("/recommendations/invitees?limit=4");
  const board = useBff<unknown>("/engagement/leaderboard?limit=3");
  const referral = useBff<ReferralPack>("/users/me/referral");
  const challenges = useBff<{ active?: EngagementMe["activeChallenges"] }>(
    "/engagement/me/challenges",
  );

  const accepted =
    referral.data?.acceptedCount ??
    engagement?.stats?.invitationsAccepted ??
    0;
  const toAmbassador = Math.max(0, AMBASSADOR_TARGET - accepted);
  const progressPct = Math.min(
    100,
    Math.round((accepted / AMBASSADOR_TARGET) * 100),
  );

  const inviteChallenge = useMemo(() => {
    const list =
      challenges.data?.active ??
      engagement?.activeChallenges ??
      [];
    return list.find(
      (c) =>
        c.id === "weekly_invite_3" ||
        c.id === "daily_invite_1" ||
        (c.id ?? "").includes("invite"),
    );
  }, [challenges.data, engagement?.activeChallenges]);

  const inviteeList = useMemo(() => {
    const raw = Array.isArray(invitees.data)
      ? (invitees.data as Invitee[])
      : normalizeList<Invitee>(invitees.data, ["items", "invitees", "data"]);
    return raw.filter((u) => u.userId && !marked.has(u.userId));
  }, [invitees.data, marked]);

  const topLeaders = useMemo(() => {
    return normalizeList<{
      firstName?: string;
      lastName?: string;
      fullName?: string;
    }>(board.data, ["items", "leaderboard", "data", "results"]).slice(0, 3);
  }, [board.data]);

  const code = referral.data?.code ?? "…";
  const registerUrl =
    referral.data?.registerUrl ||
    referral.data?.share?.url ||
    `${typeof window !== "undefined" ? window.location.origin : ""}/r/${code}`;
  const share = africaShareLinks(
    referral.data?.share?.text ||
      t("viral.shareText", {
        streak: engagement?.currentStreak ?? 0,
        level: engagement?.level ?? 1,
        url: registerUrl,
      }),
    registerUrl,
  );

  const markInvited = (u: Invitee) => {
    if (!u.userId) return;
    void trackRecoEvent({
      targetType: "user",
      targetId: u.userId,
      eventType: "invite_sent",
      servedScore: u.score,
      algorithm: u.algorithm ?? "adamic_adar",
    });
    setMarked((prev) => new Set(prev).add(u.userId!));
  };

  return (
    <section className="overflow-hidden rounded-2.5xl border border-ink/[0.06] bg-surface shadow-soft">
      <div className="bg-gradient-to-br from-brand-700 via-brand-600 to-mint-600 px-5 py-4 text-white">
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">
          {t("viral.eyebrow")}
        </p>
        <h2 className="mt-1 font-display text-xl font-bold tracking-tight">
          {t("viral.title")}
        </h2>
        <p className="mt-1 text-sm text-white/80">{t("viral.desc")}</p>
        <p className="mt-3 font-mono text-2xl font-bold tracking-[0.2em]">
          {code}
        </p>
        <p className="mt-1 text-xs text-white/70">{t("viral.yourCode")}</p>
      </div>

      <div className="space-y-4 p-5">
        {inviteChallenge && (
          <div className="rounded-xl border border-mint-200 bg-mint-50 px-3 py-2.5 text-sm">
            <p className="font-semibold text-mint-900">
              {inviteChallenge.title ?? t("viral.weekChallenge")}
            </p>
            <p className="text-xs text-mint-800/80">
              {inviteChallenge.description}
              {inviteChallenge.target != null
                ? ` · ${inviteChallenge.progress ?? 0}/${inviteChallenge.target}`
                : ""}
            </p>
          </div>
        )}

        <div>
          <div className="flex items-end justify-between gap-2">
            <p className="text-sm font-semibold text-ink">
              {t("viral.ambassador", {
                n: accepted,
                target: AMBASSADOR_TARGET,
              })}
            </p>
            <span className="text-xs text-ink-mute">
              {toAmbassador > 0
                ? t("viral.remaining", { n: toAmbassador })
                : t("viral.ambassadorDone")}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-mint-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {referral.data?.funnel && (
            <p className="mt-2 text-xs text-ink-mute">
              {t("viral.funnel", {
                hits: referral.data.funnel.landingHits ?? 0,
                joins: referral.data.funnel.registeredCount ?? 0,
                pct: referral.data.funnel.conversionPct ?? 0,
              })}
            </p>
          )}
        </div>

        {topLeaders.length > 0 && (
          <div className="rounded-xl bg-brand-50/80 px-3 py-2.5 text-sm text-brand-900">
            <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700/70">
              {t("viral.socialProof")}
            </p>
            <p className="mt-1">
              {t("viral.leadersHint", {
                names: topLeaders
                  .map((l) => {
                    const name =
                      l.fullName ??
                      [l.firstName, l.lastName].filter(Boolean).join(" ");
                    return name || "—";
                  })
                  .filter(Boolean)
                  .slice(0, 2)
                  .join(", "),
              })}
            </p>
          </div>
        )}

        {inviteeList.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">
              {t("discover.whoInvite")}
            </p>
            <ul className="space-y-2">
              {inviteeList.slice(0, 3).map((u) => (
                <li
                  key={u.userId}
                  className="flex items-center gap-2 rounded-xl border border-ink/[0.06] px-3 py-2"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mint-100 text-xs font-bold text-mint-900">
                    {u.displayLabel ?? "?"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {u.displayLabel}
                  </span>
                  <a
                    href={
                      africaShareLinks(
                        t("viral.dmInvite", {
                          name: u.displayLabel ?? "",
                          code,
                        }),
                        registerUrl,
                      ).whatsapp
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-[#128C7E]"
                    onClick={() => markInvited(u)}
                  >
                    WA
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <a
            href={share.whatsapp}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-[#25D366] py-2.5 text-center text-sm font-bold text-white"
          >
            WhatsApp
          </a>
          <a
            href={share.sms}
            className="rounded-xl bg-ink py-2.5 text-center text-sm font-bold text-white"
          >
            SMS
          </a>
          <Btn
            variant="secondary"
            onClick={() =>
              void copyShareText(share.full).then((ok) => {
                if (ok) {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              })
            }
          >
            {copied ? t("viral.copied") : t("viral.copy")}
          </Btn>
          <Link
            href="/app/invitations"
            className="inline-flex items-center justify-center rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-brand-800"
          >
            {t("viral.inviteCta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
