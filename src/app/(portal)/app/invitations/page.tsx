"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { useBff } from "@/lib/use-bff";
import { useAction } from "@/lib/use-action";
import { normalizeList } from "@/lib/portal-api";
import { trackRecoEvent } from "@/lib/reco-track";
import {
  Alert,
  Badge,
  Btn,
  EmptyState,
  PageHeader,
  statusTone,
} from "@/lib/ui";

type Invitation = {
  id?: string;
  status?: string;
  email?: string;
  phone?: string;
  contributionId?: string;
  contribution?: { id?: string; title?: string };
  message?: string;
  createdAt?: string;
  token?: string;
};

type Invitee = {
  userId?: string;
  score?: number;
  algorithm?: string;
  displayLabel?: string;
};

type Tab = "received" | "sent";

export default function InvitationsPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("received");
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const received = useBff<unknown>("/invitations/my-invitations");
  const sent = useBff<unknown>("/invitations/my-sent");
  const invitees = useBff<unknown>("/recommendations/invitees?limit=6");
  const action = useAction();

  const active = tab === "received" ? received : sent;
  const items = normalizeList<Invitation>(active.data, [
    "items",
    "invitations",
    "data",
  ]);

  const inviteeList = useMemo(() => {
    const raw = Array.isArray(invitees.data)
      ? (invitees.data as Invitee[])
      : normalizeList<Invitee>(invitees.data, ["items", "invitees", "data"]);
    return raw.filter((u) => u.userId && !marked.has(u.userId));
  }, [invitees.data, marked]);

  const accept = (inv: Invitation) => {
    if (inv.token) {
      void action.mutate(
        `/invitations/accept/${inv.token}`,
        { method: "POST", body: JSON.stringify({}) },
        {
          success: t("invitations.accepted"),
          onDone: () => void received.refresh(),
        },
      );
      return;
    }
    if (inv.id) {
      void action.mutate(
        `/invitations/${inv.id}`,
        { method: "GET" },
        { success: t("invitations.detailLoaded") },
      );
    }
  };

  const resend = (id: string) =>
    void action.mutate(
      `/invitations/${id}/resend`,
      { method: "POST" },
      { success: t("invitations.resent"), onDone: () => void sent.refresh() },
    );

  const cancel = (id: string) =>
    void action.mutate(
      `/invitations/${id}/cancel`,
      { method: "POST" },
      { success: t("invitations.cancelled"), onDone: () => void sent.refresh() },
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

  const tabs = [
    ["received", t("invitations.received")] as const,
    ["sent", t("invitations.sent")] as const,
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("invitations.title")}
        description={t("invitations.desc")}
        actions={
          <Btn variant="secondary" onClick={() => void active.refresh()}>
            {active.refreshing ? "…" : t("common.refresh")}
          </Btn>
        }
      />

      {(action.error || action.success) && (
        <Alert tone={action.error ? "rose" : "teal"}>
          {action.error ?? action.success}
        </Alert>
      )}

      {inviteeList.length > 0 && (
        <section className="space-y-2 rounded-2.5xl border border-brand-100 bg-brand-50/40 p-4">
          <h2 className="font-display text-lg font-bold text-ink">
            {t("discover.whoInvite")}
          </h2>
          <p className="text-xs text-ink-mute">{t("discover.whoInviteHint")}</p>
          <ul className="space-y-2">
            {inviteeList.map((u) => (
              <li
                key={u.userId}
                className="flex flex-wrap items-center gap-2 rounded-xl bg-white/80 px-3 py-2"
              >
                <span className="font-semibold">{u.displayLabel ?? "?"}</span>
                <span className="text-xs text-ink-mute">
                  {u.score != null
                    ? `${(Number(u.score) * 100).toFixed(0)}%`
                    : ""}
                </span>
                <Btn
                  className="ml-auto text-xs"
                  variant="secondary"
                  onClick={() => markInvited(u)}
                >
                  {t("discover.markInvited")}
                </Btn>
                <Link
                  href="/app/contributions"
                  className="text-xs font-semibold text-brand-700"
                >
                  {t("discover.inviteOnPot")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex gap-2">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              tab === id
                ? "bg-brand-600 text-white"
                : "border border-brand-200 bg-white text-brand-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {active.loading && (
        <p className="text-sm text-ink-mute">{t("common.loading")}</p>
      )}
      {active.error && <Alert>{active.error}</Alert>}
      {!active.loading && items.length === 0 ? (
        <EmptyState>{t("invitations.empty")}</EmptyState>
      ) : (
        <ul className="space-y-3">
          {items.map((inv, i) => (
            <li
              key={inv.id ?? i}
              className="rounded-2.5xl border border-ink/[0.06] bg-surface p-4 shadow-soft"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">
                    {inv.contribution?.title ??
                      inv.email ??
                      inv.phone ??
                      t("invitations.fallback", { id: inv.id ?? i })}
                  </p>
                  {inv.message ? (
                    <p className="mt-1 text-sm text-ink-mute">{inv.message}</p>
                  ) : null}
                </div>
                {inv.status ? (
                  <Badge tone={statusTone(inv.status)}>{inv.status}</Badge>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {inv.contributionId || inv.contribution?.id ? (
                  <Link
                    href={`/app/contributions/${inv.contributionId ?? inv.contribution?.id}`}
                    className="rounded-lg border border-brand-200 bg-white px-2.5 py-1 text-xs font-semibold text-brand-800"
                  >
                    {t("invitations.pot")}
                  </Link>
                ) : null}
                {tab === "received" && (
                  <Btn
                    className="text-xs"
                    disabled={action.busy}
                    onClick={() => accept(inv)}
                  >
                    {t("invitations.accept")}
                  </Btn>
                )}
                {tab === "sent" && inv.id && (
                  <>
                    <Btn
                      variant="secondary"
                      className="text-xs"
                      onClick={() => resend(inv.id!)}
                    >
                      {t("invitations.resend")}
                    </Btn>
                    <Btn
                      variant="danger"
                      className="text-xs"
                      onClick={() => cancel(inv.id!)}
                    >
                      {t("common.cancel")}
                    </Btn>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
