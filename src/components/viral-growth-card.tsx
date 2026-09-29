"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useBff } from "@/lib/use-bff";
import { useI18n } from "@/lib/i18n/context";
import { normalizeList } from "@/lib/portal-api";
import { trackRecoEvent } from "@/lib/reco-track";
import {
  africaNativeShare,
  africaShareLinks,
  canNativeShare,
  copyToClipboard,
  resolveInviteShare,
} from "@/lib/africa-share";
import { Btn } from "@/lib/ui";
import { MemberAvatar } from "@/components/member-avatar";
import { memberDisplayName } from "@/lib/member-display";

function notify(message: string, _tone?: string) {
  if (typeof window !== "undefined") {
    try {
      // optional toast host if present
      const ev = new CustomEvent("akiba:toast", { detail: { message } });
      window.dispatchEvent(ev);
    } catch {
      /* ignore */
    }
  }
}

type Invitee = {
  userId?: string;
  score?: number;
  displayLabel?: string;
  displayName?: string;
  fullName?: string;
  avatar?: string | null;
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
  activatedCount?: number;
  tier?: string;
  shareRate?: number;
  feeDiscountBoost?: number;
  funnel?: {
    landingHits?: number;
    registeredCount?: number;
    registeredViaReferral?: number;
    conversionPct?: number;
    activationPct?: number;
  };
  share?: {
    text?: string;
    url?: string;
    whatsappUrl?: string;
    smsUrl?: string;
  };
  wallet?: {
    wallets?: Array<{
      currency: string;
      balance: number;
      cotisationCredit: number;
      lifetimeEarned: number;
      payoutThreshold: number;
    }>;
  };
  rules?: { earnWindowDays?: number; levels?: number };
};

const AMBASSADOR_TARGET = 5;

/** Boucle virale Afrique : WhatsApp / SMS / code parrain / challenges. */
export function ViralGrowthCard({ engagement }: { engagement?: EngagementMe | null }) {
  const { t } = useI18n();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const invitees = useBff<unknown>("/recommendations/invitees?limit=4");
  const board = useBff<unknown>("/engagement/leaderboard?limit=3");
  const referral = useBff<ReferralPack>("/referral/me/cercle");
  const challenges = useBff<{ active?: EngagementMe["activeChallenges"] }>(
    "/engagement/me/challenges",
  );
  const [redeemBusy, setRedeemBusy] = useState(false);

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
      avatar?: string | null;
      userId?: string;
    }>(board.data, ["items", "leaderboard", "data", "results"]).slice(0, 3);
  }, [board.data]);

  const code = referral.data?.code ?? "…";
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const defaultLink =
    referral.data?.registerUrl ||
    referral.data?.share?.url ||
    referral.data?.portalUrl ||
    (code !== "…"
      ? `${origin}/register?ref=${encodeURIComponent(code)}`
      : "");
  const share = useMemo(
    () =>
      resolveInviteShare({
        apiShare: referral.data?.share,
        inviteLink: defaultLink,
        body: t("viral.shareText", {
          streak: engagement?.currentStreak ?? 0,
          level: engagement?.level ?? 1,
          url: defaultLink,
        }),
      }),
    [referral.data?.share, defaultLink, t, engagement?.currentStreak, engagement?.level],
  );

  const flashCopy = (kind: "link" | "message", ok: boolean) => {
    if (!ok) {
      notify(t("viral.copyFailed"), "warn");
      return;
    }
    if (kind === "link") {
      setCopiedLink(true);
      notify(t("viral.copied"), "ok");
      setTimeout(() => setCopiedLink(false), 2200);
    } else {
      setCopiedMessage(true);
      notify(t("viral.copiedMessage"), "ok");
      setTimeout(() => setCopiedMessage(false), 2200);
    }
  };

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
                joins:
                  referral.data.funnel.registeredCount ??
                  referral.data.funnel.registeredViaReferral ??
                  referral.data.acceptedCount ??
                  0,
                pct: referral.data.funnel.conversionPct ?? 0,
              })}
              {referral.data.tier
                ? ` · ${referral.data.tier}`
                : ""}
              {referral.data.shareRate != null
                ? ` · ${Math.round(referral.data.shareRate * 100)}% share`
                : ""}
              {referral.data.feeDiscountBoost
                ? ` · −${Math.round(referral.data.feeDiscountBoost * 100)}% frais`
                : ""}
            </p>
          )}
          {(referral.data?.wallet?.wallets?.length ?? 0) > 0 && (
            <div className="mt-3 space-y-1 rounded-xl border border-ink/[0.06] bg-surface-sunken/40 px-3 py-2 text-xs">
              {referral.data!.wallet!.wallets!.map((w) => (
                <div
                  key={w.currency}
                  className="flex items-center justify-between gap-2"
                >
                  <span>
                    Solde {w.currency}:{" "}
                    <strong className="tabular-nums">
                      {Number(w.balance).toLocaleString("fr-FR")}
                    </strong>
                    {w.cotisationCredit > 0
                      ? ` · crédit cotis. ${Number(w.cotisationCredit).toLocaleString("fr-FR")}`
                      : ""}
                  </span>
                  {w.balance > 0 ? (
                    <button
                      type="button"
                      disabled={redeemBusy}
                      className="font-semibold text-brand-700 disabled:opacity-50"
                      onClick={() => {
                        setRedeemBusy(true);
                        void import("@/lib/bff-fetch")
                          .then(({ bffFetch }) =>
                            bffFetch("/referral/me/redeem-credit", {
                              method: "POST",
                              body: JSON.stringify({ currency: w.currency }),
                            }),
                          )
                          .then(() => {
                            notify("Crédit cotisation crédité", "ok");
                            void referral.refresh();
                          })
                          .catch(() =>
                            notify("Échec conversion solde", "warn"),
                          )
                          .finally(() => setRedeemBusy(false));
                      }}
                    >
                      Convertir
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {topLeaders.length > 0 && (
          <div className="rounded-xl bg-brand-50/80 px-3 py-2.5 text-sm text-brand-900">
            <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700/70">
              {t("viral.socialProof")}
            </p>
            <div className="mt-2 flex items-center gap-2">
              {topLeaders.slice(0, 3).map((l) => {
                const name = memberDisplayName(l, "—");
                return (
                  <MemberAvatar
                    key={l.userId ?? name}
                    name={name}
                    avatarUrl={l.avatar}
                    size="sm"
                  />
                );
              })}
            </div>
            <p className="mt-2">
              {t("viral.leadersHint", {
                names: topLeaders
                  .map((l) => memberDisplayName(l, "—"))
                  .filter((n) => n !== "—")
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
              {inviteeList.slice(0, 3).map((u) => {
                const name = memberDisplayName(u, t("common.member"));
                return (
                <li
                  key={u.userId}
                  className="flex items-center gap-2 rounded-xl border border-ink/[0.06] px-3 py-2"
                >
                  <MemberAvatar name={name} avatarUrl={u.avatar} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {name}
                  </span>
                  <a
                    href={
                      africaShareLinks(
                        t("viral.dmInvite", {
                          name,
                          code,
                        }),
                        share.inviteLink,
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
              );
              })}
            </ul>
          </div>
        )}

        {share.inviteLink ? (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-ink-mute">
              {t("viral.inviteLink")}
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={share.inviteLink}
                className="min-w-0 flex-1 rounded-xl border border-ink/[0.1] bg-surface-sunken/50 px-3 py-2.5 text-xs text-ink outline-none"
                aria-label={t("viral.inviteLink")}
                onFocus={(e) => e.target.select()}
              />
              <Btn
                variant="secondary"
                className="shrink-0 px-4"
                onClick={() =>
                  void copyToClipboard(share.inviteLink).then((ok) =>
                    flashCopy("link", ok),
                  )
                }
              >
                {copiedLink ? t("viral.copied") : t("viral.copyLink")}
              </Btn>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {canNativeShare() ? (
            <Btn
              variant="secondary"
              onClick={() =>
                void africaNativeShare({
                  title: "Akiba One",
                  text: share.full,
                  url: share.inviteLink,
                }).then((r) => {
                  if (r === "copied") flashCopy("message", true);
                })
              }
            >
              {t("native.shareSystem")}
            </Btn>
          ) : null}
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
              void copyToClipboard(share.full).then((ok) =>
                flashCopy("message", ok),
              )
            }
          >
            {copiedMessage ? t("viral.copiedMessage") : t("viral.copyMessage")}
          </Btn>
          <Link
            href="/app/invitations"
            className="col-span-2 inline-flex items-center justify-center rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-brand-800 sm:col-span-1"
          >
            {t("viral.inviteCta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
