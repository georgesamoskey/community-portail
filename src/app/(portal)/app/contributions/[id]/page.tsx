"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useBff } from "@/lib/use-bff";
import { useAction } from "@/lib/use-action";
import { bffFetch } from "@/lib/bff-fetch";
import { normalizeList } from "@/lib/portal-api";
import { hasPermission, Permission } from "@/lib/portal-permissions";
import {
  Alert,
  Badge,
  Btn,
  EmptyState,
  Field,
  inputClass,
  money,
  PageHeader,
  Panel,
  SegmentedTabs,
  statusTone,
} from "@/lib/ui";
import { markChecklist } from "@/lib/retention";
import { useI18n } from "@/lib/i18n/context";
import { LiveActivityList, type LiveActivityItem } from "@/components/live-activity-list";

type Contribution = {
  id?: string;
  title?: string;
  description?: string;
  status?: string;
  financialGoal?: number;
  currency?: string;
  isPublic?: boolean;
  chatRoomId?: string | null;
  createdBy?: string;
  creatorId?: string;
  ownerId?: string;
};

type Cotisation = {
  id?: string;
  montant?: number;
  amount?: number;
  status?: string;
  paymentMethod?: string;
  userId?: string;
  notes?: string;
  createdAt?: string;
};

type Payout = {
  id?: string;
  grossAmount?: number;
  netAmount?: number;
  status?: string;
  method?: string;
  reason?: string;
  currency?: string;
};

function ContributionDetailFallback() {
  const { t } = useI18n();
  return <p className="text-sm text-brand-600">{t("common.loading")}</p>;
}

export default function ContributionDetailPage() {
  return (
    <Suspense
      fallback={<ContributionDetailFallback />}
    >
      <ContributionDetailInner />
    </Suspense>
  );
}

function ContributionDetailInner() {
  const { t } = useI18n();
  const params = useParams();
  const search = useSearchParams();
  const id = String(params.id ?? "");
  const highlightCotisation = search.get("cotisation");
  const { data: session } = useSession();
  const canPay = hasPermission(session?.user?.roles, Permission.PORTAL_PAYMENTS);
  const action = useAction();

  const detail = useBff<Contribution>(id ? `/contributions/${id}` : null);
  const cotisations = useBff<unknown>(
    id ? `/cotisations/contribution/${id}?limit=50` : null,
  );
  const stats = useBff<Record<string, unknown>>(
    id ? `/contributions/${id}/statistics` : null,
  );
  const payouts = useBff<unknown>(
    id ? `/contributions/${id}/payouts` : null,
  );
  const balance = useBff<{ available?: number; balance?: number; currency?: string }>(
    id ? `/contributions/${id}/payouts/balance` : null,
  );
  const providers = useBff<unknown>(
    canPay ? "/mobile-money/providers?capability=collection" : null,
  );

  const c = detail.data;
  const cotList = normalizeList<Cotisation>(cotisations.data, [
    "items",
    "cotisations",
    "data",
  ]);
  const payoutList = normalizeList<Payout>(payouts.data, [
    "items",
    "payouts",
    "data",
  ]);
  const providerList = useMemo(
    () =>
      normalizeList<{ slug?: string; id?: string; name?: string }>(
        providers.data,
        ["items", "providers", "data"],
      ),
    [providers.data],
  );

  const [montant, setMontant] = useState("5000");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [mmAmount, setMmAmount] = useState("5000");
  const [mmProvider, setMmProvider] = useState("");
  const [mmPhone, setMmPhone] = useState("");
  const [payerUserId, setPayerUserId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("mobile_money");
  const [payoutPhone, setPayoutPhone] = useState("");
  const [payoutProvider, setPayoutProvider] = useState("");
  const [payoutReason, setPayoutReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [inviteLinks, setInviteLinks] = useState<unknown[]>([]);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [participants, setParticipants] = useState<
    Array<{ id?: string; userId?: string; role?: string; fullName?: string }>
  >([]);
  const [mmFee, setMmFee] = useState<unknown>(null);
  const [roleUserId, setRoleUserId] = useState("");
  const [roleValue, setRoleValue] = useState("member");
  const [extraInsight, setExtraInsight] = useState<{
    hist?: unknown;
    board?: unknown;
    live?: { items?: LiveActivityItem[] } | LiveActivityItem[] | null;
    atts?: unknown;
  } | null>(null);
  const [tab, setTab] = useState<"overview" | "pay" | "money" | "people" | "more">(
    highlightCotisation ? "money" : "pay",
  );

  const defaultPayoutReason = t("pots.defaultPayout");
  const effectivePayoutReason = payoutReason || defaultPayoutReason;

  const reload = () => {
    void detail.refresh();
    void cotisations.refresh();
    void stats.refresh();
    void payouts.refresh();
    void balance.refresh();
  };

  const declareCotisation = () =>
    void action.mutate(
      "/cotisations",
      {
        method: "POST",
        body: JSON.stringify({
          contributionId: id,
          montant: Number(montant),
          paymentMethod,
          notes: notes || undefined,
        }),
      },
      {
        success: t("pots.okDeclared"),
        onDone: () => {
          markChecklist("paid_or_cotised");
          reload();
        },
      },
    );

  const payMm = async () => {
    let uid = payerUserId;
    if (!uid) {
      try {
        const me = await bffFetch<{ id?: string }>("/users/me");
        uid = me?.id ?? "";
        setPayerUserId(uid);
      } catch {
        /* ignore */
      }
    }
    void action.mutate(
      `/contributions/${id}/mobile-money/pay`,
      {
        method: "POST",
        body: JSON.stringify({
          payerUserId: uid,
          amount: Number(mmAmount),
          provider: mmProvider,
          payerPhone: mmPhone,
          notes: notes || undefined,
        }),
      },
      {
        success: t("pots.okMm"),
        onDone: () => {
          markChecklist("paid_or_cotised");
          reload();
        },
      },
    );
  };

  const lifecycle = (actionName: "activate" | "close" | "reopen" | "archive") =>
    void action.mutate(
      `/contributions/${id}/${actionName}`,
      { method: "POST" },
      { success: t("common.success"), onDone: reload },
    );

  const invite = () =>
    void action.mutate(
      "/invitations",
      {
        method: "POST",
        body: JSON.stringify({
          contributionId: id,
          email: inviteEmail || undefined,
          phone: invitePhone || undefined,
          message: inviteMsg || undefined,
        }),
      },
      {
        success: t("pots.okInvite"),
        onDone: () => {
          markChecklist("invited_someone");
          setInviteEmail("");
          setInvitePhone("");
        },
      },
    );

  const createInviteLink = () =>
    void action.mutate<{ token?: string; id?: string; url?: string }>(
      "/invitations/link",
      {
        method: "POST",
        body: JSON.stringify({ contributionId: id }),
      },
      {
        success: t("pots.okLink"),
        onDone: (r) => {
          markChecklist("invited_someone");
          const token = r?.token ?? r?.id;
          if (token) {
            const url =
              r?.url ??
              `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${token}`;
            setLastInviteLink(url);
          }
          void loadInviteLinks();
        },
      },
    );

  const loadInviteLinks = () =>
    void action.run(async () => {
      const data = await bffFetch<unknown>(
        `/invitations/links/${id}`,
      );
      setInviteLinks(
        normalizeList(data, ["items", "links", "data"]),
      );
      return data;
    });

  const revokeLink = (linkId: string) =>
    void action.mutate(
      `/invitations/links/${linkId}`,
      { method: "DELETE" },
      { success: t("pots.okRevoke"), onDone: () => void loadInviteLinks() },
    );

  const saveEdit = () =>
    void action.mutate(
      `/contributions/${id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          title: editTitle || undefined,
          description: editDesc || undefined,
          financialGoal: editGoal ? Number(editGoal) : undefined,
        }),
      },
      { success: t("pots.okUpdated"), onDone: reload },
    );

  const declareWithProof = () => {
    if (!proofFile) {
      void action.run(async () => {
        throw new Error(t("pots.needProof"));
      });
      return;
    }
    const fd = new FormData();
    fd.append("contributionId", id);
    fd.append("montant", montant);
    fd.append("paymentMethod", paymentMethod);
    if (notes) fd.append("notes", notes);
    fd.append("proof", proofFile);
    void action.run(
      async () => {
        const { bffApi } = await import("@/lib/bff");
        const res = await fetch(bffApi("/cotisations/with-proof"), {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || `Erreur ${res.status}`);
        }
        return res.json();
      },
      {
        success: t("pots.okProof"),
        onDone: () => {
          markChecklist("paid_or_cotised");
          reload();
        },
      },
    );
  };

  const loadParticipants = () =>
    void action.run(async () => {
      // détail contribution peut déjà contenir participants
      const d = detail.data as Contribution & {
        participants?: Array<{
          id?: string;
          userId?: string;
          role?: string;
          fullName?: string;
        }>;
      };
      if (d?.participants?.length) {
        setParticipants(d.participants);
        return d.participants;
      }
      setParticipants([]);
      return [];
    });

  const removeParticipant = (userId: string) =>
    void action.mutate(
      `/contributions/${id}/participants/${userId}`,
      { method: "DELETE" },
      { success: t("pots.okRemoved"), onDone: reload },
    );

  const changeRole = () =>
    void action.mutate(
      `/contributions/${id}/participants/${roleUserId}/role`,
      { method: "PUT", body: JSON.stringify({ role: roleValue }) },
      { success: t("pots.okRole"), onDone: reload },
    );

  const refundCot = (cotId: string) =>
    void action.mutate(
      `/cotisations/${cotId}/refund`,
      {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason || "Remboursement" }),
      },
      { success: t("pots.okRefundReq"), onDone: reload },
    );

  const markRefunded = (cotId: string) =>
    void action.mutate(
      `/cotisations/${cotId}/mark-refunded`,
      { method: "POST" },
      { success: t("pots.okRefunded"), onDone: reload },
    );

  const refundAll = () => {
    if (!confirm(t("pots.confirmRefundAll"))) return;
    void action.mutate(
      `/cotisations/contributions/${id}/refund-all`,
      {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason || "Remboursement global" }),
      },
      { success: t("pots.okRefunds"), onDone: reload },
    );
  };

  const loadMmFee = () =>
    void action.run(async () => {
      const q = new URLSearchParams({
        amount: mmAmount,
        payerPhone: mmPhone || "",
      });
      const data = await bffFetch(
        `/contributions/${id}/mobile-money/fee-preview?${q}`,
      );
      setMmFee(data);
      return data;
    }, { success: t("pots.okFees") });

  const exportContribution = (format: "csv" | "pdf" | "excel") =>
    void action.run(async () => {
      const { bffApi } = await import("@/lib/bff");
      const res = await fetch(
        bffApi(`/contributions/${id}/export?format=${format}`),
        { credentials: "include" },
      );
      if (!res.ok) throw new Error(`Export ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cagnotte-${id.slice(0, 8)}.${format === "excel" ? "xlsx" : format}`;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    }, { success: t("common.success") });

  const deleteContribution = () => {
    if (!confirm(t("pots.confirmDelete"))) return;
    void action.mutate(
      `/contributions/${id}`,
      { method: "DELETE" },
      {
        success: t("pots.okDeleted"),
        onDone: () => {
          window.location.href = "/app/contributions";
        },
      },
    );
  };

  const markPayoutCompleted = (payoutId: string) =>
    void action.mutate(
      `/payouts/${payoutId}/mark-completed`,
      { method: "POST", body: JSON.stringify({}) },
      { success: t("pots.okPayoutClosed"), onDone: reload },
    );

  const confirmCot = (cotId: string) =>
    void action.mutate(
      `/cotisations/${cotId}/confirm`,
      { method: "POST", body: JSON.stringify({}) },
      { success: t("pots.okConfirmed"), onDone: reload },
    );

  const rejectCot = (cotId: string) =>
    void action.mutate(
      `/cotisations/${cotId}/reject`,
      {
        method: "POST",
        body: JSON.stringify({
          reason: rejectReason || "Rejet portail",
        }),
      },
      { success: t("pots.okRejected"), onDone: reload },
    );

  const deleteCot = (cotId: string) => {
    if (!confirm(t("pots.confirmCancelCot"))) return;
    void action.mutate(
      `/cotisations/${cotId}`,
      { method: "DELETE" },
      { success: t("pots.okCancelled"), onDone: reload },
    );
  };

  const requestPayout = () => {
    const destination =
      payoutMethod === "mobile_money"
        ? { provider: payoutProvider, phone: payoutPhone }
        : payoutMethod === "cash"
          ? { handlerName: "Cash", notes: "Remise" }
          : {
              iban: "BI00",
              bankName: "Banque",
              accountHolder: "Bénéficiaire",
            };
    void action.mutate(
      `/contributions/${id}/payouts`,
      {
        method: "POST",
        body: JSON.stringify({
          grossAmount: Number(payoutAmount),
          method: payoutMethod,
          destination,
          reason: effectivePayoutReason,
          currency: c?.currency ?? "BIF",
        }),
      },
      { success: t("pots.okPayoutReq"), onDone: reload },
    );
  };

  const payoutAction = (
    payoutId: string,
    kind: "approve" | "reject" | "cancel" | "execute" | "sync",
  ) => {
    const body =
      kind === "reject"
        ? JSON.stringify({ reason: rejectReason || "Rejet" })
        : kind === "approve"
          ? JSON.stringify({ comment: "OK portail" })
          : undefined;
    void action.mutate(
      `/payouts/${payoutId}/${kind}`,
      { method: "POST", body },
      { success: t("common.success"), onDone: reload },
    );
  };

  const joinSelf = () =>
    void action.mutate(
      `/contributions/${id}/participants`,
      { method: "POST", body: JSON.stringify({}) },
      { success: t("pots.okJoined"), onDone: reload },
    );

  if (!id) return <Alert tone="rose">{t("pots.missingId")}</Alert>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={c?.title ?? t("pots.detailFallback")}
        description={
          c?.description ?? t("pots.detailDesc")
        }
        actions={
          <>
            <Link
              href="/app/contributions"
              className="rounded-xl border border-brand-200 bg-white px-3.5 py-2 text-sm font-semibold text-brand-800"
            >
              {t("common.list")}
            </Link>
            {c?.chatRoomId ? (
              <Link
                href={`/app/chat?room=${c.chatRoomId}`}
                onClick={() => markChecklist("joined_chat")}
                className="rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white"
              >
                {t("common.discuss")}
              </Link>
            ) : null}
            <Btn variant="secondary" onClick={reload}>
              {t("common.refresh")}
            </Btn>
          </>
        }
      />

      {(action.error || action.success) && (
        <Alert tone={action.error ? "rose" : "teal"}>
          {action.error ?? action.success}
        </Alert>
      )}
      {detail.loading && <p className="text-sm text-brand-600">{t("common.loading")}</p>}
      {detail.error && <Alert>{detail.error}</Alert>}

      {c && (
        <>
          <div className="flex flex-wrap gap-2">
            {c.status ? (
              <Badge tone={statusTone(c.status)}>{c.status}</Badge>
            ) : null}
            <Badge>
              {t("pots.goalBadge", { amount: money(c.financialGoal, c.currency ?? "BIF") })}
            </Badge>
            {c.isPublic ? <Badge tone="info">{t("common.public")}</Badge> : null}
            {balance.data && (
              <Badge tone="ok">
                {t("pots.balance", {
                  amount: money(
                    balance.data.available ?? balance.data.balance,
                    balance.data.currency ?? c.currency ?? "BIF",
                  ),
                })}
              </Badge>
            )}
          </div>

          {c.chatRoomId ? (
            <a
              href={`/app/chat?room=${c.chatRoomId}`}
              onClick={() => markChecklist("joined_chat")}
              className="flex items-center justify-between gap-3 rounded-2xl border border-brand-200/70 bg-gradient-to-r from-brand-50 to-mint-50 px-4 py-3 text-sm shadow-soft transition hover:shadow-lift"
            >
              <span>
                <span className="font-bold text-ink">{t("pots.chatContinue")}</span>
                <span className="mt-0.5 block text-ink-mute">
                  {t("pots.chatSub")}
                </span>
              </span>
              <span className="font-bold text-brand-600">{t("common.open")} →</span>
            </a>
          ) : null}

          <SegmentedTabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "pay", label: t("pots.tabPay"), hint: t("pots.tabPayHint") },
              { id: "money", label: t("pots.tabMoney"), hint: t("pots.tabMoneyHint") },
              { id: "people", label: t("pots.tabPeople"), hint: t("pots.tabPeopleHint") },
              { id: "overview", label: t("pots.tabOverview"), hint: t("pots.tabOverviewHint") },
              { id: "more", label: t("pots.tabMore"), hint: t("pots.tabMoreHint") },
            ]}
          />

          {tab === "overview" && (
            <div className="space-y-4">
          {c?.chatRoomId ? (
            <Panel title="Discussion du cercle">
              <p className="text-sm text-ink-mute">
                Cotisations, paliers, engagements et messages — tout se passe
                dans le fil de discussion.
              </p>
              <Link
                href={`/app/chat?room=${c.chatRoomId}`}
                onClick={() => markChecklist("joined_chat")}
                className="mt-3 inline-flex rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white"
              >
                Ouvrir le chat →
              </Link>
            </Panel>
          ) : null}

          {stats.data && (
            <Panel title={t("pots.stats")}>
              <pre className="max-h-40 overflow-auto rounded-xl bg-brand-50 p-3 text-xs">
                {JSON.stringify(stats.data, null, 2)}
              </pre>
            </Panel>
          )}

          <Panel title={t("pots.lifecycle")}>
            <div className="flex flex-wrap gap-2">
              <Btn variant="secondary" onClick={() => lifecycle("activate")}>
                {t("pots.activate")}
              </Btn>
              <Btn variant="secondary" onClick={() => lifecycle("close")}>
                {t("pots.close")}
              </Btn>
              <Btn variant="secondary" onClick={() => lifecycle("reopen")}>
                {t("pots.reopen")}
              </Btn>
              <Btn variant="ghost" onClick={() => lifecycle("archive")}>
                {t("pots.archive")}
              </Btn>
              <Btn variant="secondary" onClick={joinSelf}>
                {t("pots.join")}
              </Btn>
            </div>
          </Panel>

          <Panel title={t("pots.editPot")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("common.title")}>
                <input
                  className={inputClass}
                  value={editTitle || c.title || ""}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onFocus={() => {
                    if (!editTitle) setEditTitle(c.title ?? "");
                    if (!editDesc) setEditDesc(c.description ?? "");
                    if (!editGoal && c.financialGoal != null)
                      setEditGoal(String(c.financialGoal));
                  }}
                />
              </Field>
              <Field label={t("pots.goal")}>
                <input
                  className={inputClass}
                  type="number"
                  value={editGoal}
                  onChange={(e) => setEditGoal(e.target.value)}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label={t("common.description")}>
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={editDesc || c.description || ""}
                    onChange={(e) => setEditDesc(e.target.value)}
                  />
                </Field>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn onClick={saveEdit}>{t("common.save")}</Btn>
              <Btn variant="secondary" onClick={() => exportContribution("csv")}>
                {t("pots.exportCsv")}
              </Btn>
              <Btn variant="secondary" onClick={() => exportContribution("pdf")}>
                {t("pots.exportPdf")}
              </Btn>
            </div>
          </Panel>
            </div>
          )}

          {tab === "pay" && (
            <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title={t("pots.declare")}>
              <div className="grid gap-3">
                <Field label={t("common.amount")}>
                  <input
                    className={inputClass}
                    type="number"
                    min={100}
                    value={montant}
                    onChange={(e) => setMontant(e.target.value)}
                  />
                </Field>
                <Field label={t("common.method")}>
                  <select
                    className={inputClass}
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="cash">{t("tontines.cash")}</option>
                    <option value="mobile_money">{t("tontines.mm")}</option>
                    <option value="bank_transfer">{t("tontines.transfer")}</option>
                    <option value="other">{t("pots.other")}</option>
                  </select>
                </Field>
                <Field label={t("common.notes")}>
                  <input
                    className={inputClass}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </Field>
                <Btn
                  disabled={action.busy || Number(montant) < 100}
                  onClick={declareCotisation}
                >
                  {t("pots.declareBtn")}
                </Btn>
                <Field label={t("pots.proof")}>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="mt-1 block w-full text-xs"
                    onChange={(e) =>
                      setProofFile(e.target.files?.[0] ?? null)
                    }
                  />
                </Field>
                <Btn
                  variant="secondary"
                  disabled={action.busy || !proofFile || Number(montant) < 100}
                  onClick={declareWithProof}
                >
                  {t("pots.declareProof")}
                </Btn>
              </div>
            </Panel>

            <Panel title={t("pots.payMm")}>
              {!canPay ? (
                <Alert>
                  {t("pots.needPayments")}
                </Alert>
              ) : (
                <div className="grid gap-3">
                  <Field label={t("common.amount")}>
                    <input
                      className={inputClass}
                      type="number"
                      value={mmAmount}
                      onChange={(e) => setMmAmount(e.target.value)}
                    />
                  </Field>
                  <Field label={t("tontines.provider")}>
                    <select
                      className={inputClass}
                      value={mmProvider}
                      onChange={(e) => setMmProvider(e.target.value)}
                    >
                      <option value="">{t("tontines.choose")}</option>
                      {providerList.map((p) => {
                        const slug = p.slug ?? p.id ?? "";
                        return (
                          <option key={slug} value={slug}>
                            {p.name ?? slug}
                          </option>
                        );
                      })}
                    </select>
                  </Field>
                  <Field label={t("tontines.phoneE164")}>
                    <input
                      className={inputClass}
                      value={mmPhone}
                      onChange={(e) => setMmPhone(e.target.value)}
                      placeholder="+257…"
                    />
                  </Field>
                  <Btn
                    disabled={
                      action.busy || !mmProvider || !mmPhone || !mmAmount
                    }
                    onClick={() => void payMm()}
                  >
                    {t("common.pay")}
                  </Btn>
                  <Btn
                    variant="secondary"
                    disabled={!mmAmount}
                    onClick={loadMmFee}
                  >
                    {t("tontines.feePreview")}
                  </Btn>
                  {mmFee != null && (
                    <pre className="max-h-32 overflow-auto rounded-xl bg-brand-50 p-2 text-xs">
                      {JSON.stringify(mmFee, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </Panel>
          </div>
            </div>
          )}

          {tab === "money" && (
            <div className="space-y-4">
          <Panel title={t("pots.cotisations", { n: cotList.length })}>
            <div className="mb-3 flex flex-wrap gap-2">
              <Field label={t("pots.rejectReason")}>
                <input
                  className={inputClass}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </Field>
              <Btn variant="danger" className="self-end" onClick={refundAll}>
                {t("pots.refundAll")}
              </Btn>
            </div>
            {cotList.length === 0 ? (
              <EmptyState>{t("pots.noCotisations")}</EmptyState>
            ) : (
              <ul className="mt-3 divide-y divide-brand-100">
                {cotList.map((cot) => (
                  <li
                    key={cot.id}
                    className={`flex flex-wrap items-center justify-between gap-2 py-3 ${
                      highlightCotisation === cot.id ? "bg-brand-50/80" : ""
                    }`}
                  >
                    <div>
                      <p className="font-medium text-brand-900">
                        {money(cot.montant ?? cot.amount, c.currency ?? "BIF")}
                      </p>
                      <p className="text-xs text-brand-600">
                        {cot.paymentMethod ?? "—"} · {cot.createdAt ?? ""}
                        {cot.notes ? ` · ${cot.notes}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {cot.status ? (
                        <Badge tone={statusTone(cot.status)}>{cot.status}</Badge>
                      ) : null}
                      {cot.id ? (
                        <>
                          <Btn
                            variant="secondary"
                            className="text-xs"
                            onClick={() => confirmCot(cot.id!)}
                          >
                            {t("common.confirm")}
                          </Btn>
                          <Btn
                            variant="ghost"
                            className="text-xs"
                            onClick={() => rejectCot(cot.id!)}
                          >
                            {t("common.reject")}
                          </Btn>
                          <Btn
                            variant="danger"
                            className="text-xs"
                            onClick={() => deleteCot(cot.id!)}
                          >
                            {t("common.cancel")}
                          </Btn>
                          <Btn
                            variant="ghost"
                            className="text-xs"
                            onClick={() => refundCot(cot.id!)}
                          >
                            {t("pots.refund")}
                          </Btn>
                          <Btn
                            variant="ghost"
                            className="text-xs"
                            onClick={() => markRefunded(cot.id!)}
                          >
                            {t("pots.markedRefunded")}
                          </Btn>
                        </>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

            <Panel title={t("pots.requestPayout")}>
              <div className="grid gap-3">
                <Field label={t("pots.gross")}>
                  <input
                    className={inputClass}
                    type="number"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                  />
                </Field>
                <Field label={t("common.method")}>
                  <select
                    className={inputClass}
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value)}
                  >
                    <option value="mobile_money">{t("tontines.mm")}</option>
                    <option value="cash">{t("tontines.cash")}</option>
                    <option value="bank_transfer">{t("tontines.transfer")}</option>
                  </select>
                </Field>
                {payoutMethod === "mobile_money" && (
                  <>
                    <Field label={t("tontines.provider")}>
                      <input
                        className={inputClass}
                        value={payoutProvider}
                        onChange={(e) => setPayoutProvider(e.target.value)}
                      />
                    </Field>
                    <Field label={t("common.phone")}>
                      <input
                        className={inputClass}
                        value={payoutPhone}
                        onChange={(e) => setPayoutPhone(e.target.value)}
                      />
                    </Field>
                  </>
                )}
                <Field label={t("pots.reason")}>
                  <input
                    className={inputClass}
                    value={payoutReason || defaultPayoutReason}
                    onChange={(e) => setPayoutReason(e.target.value)}
                  />
                </Field>
                <Btn
                  disabled={
                    action.busy ||
                    Number(payoutAmount) <= 0 ||
                    effectivePayoutReason.trim().length < 5
                  }
                  onClick={requestPayout}
                >
                  {t("pots.request")}
                </Btn>
              </div>
            </Panel>

          <Panel title={t("pots.payouts", { n: payoutList.length })}>
            {payoutList.length === 0 ? (
              <EmptyState>{t("pots.noPayouts")}</EmptyState>
            ) : (
              <ul className="divide-y divide-brand-100">
                {payoutList.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                  >
                    <div>
                      <p className="font-medium">
                        {money(p.grossAmount, p.currency ?? c.currency)}
                        {p.netAmount != null &&
                          ` ${t("pots.net", { amount: money(p.netAmount, p.currency) })}`}
                      </p>
                      <p className="text-xs text-brand-600">
                        {p.method} · {p.reason}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {p.status ? (
                        <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                      ) : null}
                      {p.id ? (
                        <>
                          <Btn
                            className="text-xs"
                            variant="secondary"
                            onClick={() => payoutAction(p.id!, "approve")}
                          >
                            {t("common.approve")}
                          </Btn>
                          <Btn
                            className="text-xs"
                            variant="ghost"
                            onClick={() => payoutAction(p.id!, "reject")}
                          >
                            {t("common.reject")}
                          </Btn>
                          <Btn
                            className="text-xs"
                            onClick={() => payoutAction(p.id!, "execute")}
                          >
                            {t("pots.execute")}
                          </Btn>
                          <Btn
                            className="text-xs"
                            variant="ghost"
                            onClick={() => payoutAction(p.id!, "sync")}
                          >
                            {t("pots.sync")}
                          </Btn>
                          <Btn
                            className="text-xs"
                            variant="secondary"
                            onClick={() => markPayoutCompleted(p.id!)}
                          >
                            {t("pots.close")}
                          </Btn>
                          <Btn
                            className="text-xs"
                            variant="danger"
                            onClick={() => payoutAction(p.id!, "cancel")}
                          >
                            {t("common.cancel")}
                          </Btn>
                        </>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
            </div>
          )}

          {tab === "people" && (
            <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title={t("pots.invitations")}>
              <div className="grid gap-3">
                <Field label={t("common.email")}>
                  <input
                    className={inputClass}
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </Field>
                <Field label={t("common.phone")}>
                  <input
                    className={inputClass}
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                  />
                </Field>
                <Field label={t("pots.message")}>
                  <input
                    className={inputClass}
                    value={inviteMsg}
                    onChange={(e) => setInviteMsg(e.target.value)}
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Btn
                    disabled={
                      action.busy || (!inviteEmail.trim() && !invitePhone.trim())
                    }
                    onClick={invite}
                  >
                    {t("common.invite")}
                  </Btn>
                  <Btn variant="secondary" onClick={createInviteLink}>
                    {t("pots.createLink")}
                  </Btn>
                  <Btn
                    variant="secondary"
                    disabled={action.busy}
                    onClick={() =>
                      void action.run(async () => {
                        const data = await bffFetch<{
                          share?: {
                            whatsappUrl?: string;
                            smsUrl?: string;
                            text?: string;
                            url?: string;
                          };
                          inviteUrl?: string;
                        }>(`/invitations/share/contribution/${id}`, {
                          method: "POST",
                        });
                        const wa = data.share?.whatsappUrl;
                        if (wa && typeof window !== "undefined") {
                          window.open(wa, "_blank", "noopener,noreferrer");
                        }
                        if (data.inviteUrl) setLastInviteLink(data.inviteUrl);
                        return data;
                      }, { success: t("pots.okLink") })
                    }
                  >
                    WhatsApp
                  </Btn>
                  <Btn variant="ghost" onClick={loadInviteLinks}>
                    {t("pots.listLinks")}
                  </Btn>
                  <Link
                    href="/app/invitations"
                    className="rounded-xl border border-brand-200 px-3.5 py-2 text-sm font-semibold text-brand-800"
                  >
                    {t("pots.myInvites")}
                  </Link>
                </div>
                {lastInviteLink && (
                  <p className="mt-3 break-all rounded-xl bg-mint-50 p-3 text-xs text-mint-900">
                    {t("pots.link")} {lastInviteLink}
                  </p>
                )}
                {inviteLinks.length > 0 && (
                  <ul className="mt-3 divide-y divide-ink/[0.06] text-sm">
                    {inviteLinks.map((raw, i) => {
                      const link = raw as {
                        id?: string;
                        token?: string;
                        expiresAt?: string;
                      };
                      return (
                        <li
                          key={link.id ?? i}
                          className="flex flex-wrap items-center justify-between gap-2 py-2"
                        >
                          <span className="font-mono text-xs">
                            {(link.token ?? link.id ?? "?").slice(0, 14)}…
                          </span>
                          <div className="flex gap-1">
                            {link.token ? (
                              <Link
                                href={`/invite/${link.token}`}
                                className="text-xs font-semibold text-brand-600"
                              >
                                {t("common.open")}
                              </Link>
                            ) : null}
                            {link.id ? (
                              <Btn
                                variant="danger"
                                className="text-xs"
                                onClick={() => revokeLink(link.id!)}
                              >
                                {t("pots.revoke")}
                              </Btn>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </Panel>

            <Panel title={t("pots.participants")}>
              <div className="flex flex-wrap gap-2">
                <Btn variant="secondary" onClick={loadParticipants}>
                  {t("pots.load")}
                </Btn>
                <Field label={t("pots.userId")}>
                  <input
                    className={inputClass}
                    value={roleUserId}
                    onChange={(e) => setRoleUserId(e.target.value)}
                  />
                </Field>
                <Field label={t("pots.role")}>
                  <select
                    className={inputClass}
                    value={roleValue}
                    onChange={(e) => setRoleValue(e.target.value)}
                  >
                    <option value="member">member</option>
                    <option value="admin">admin</option>
                    <option value="co_admin">co_admin</option>
                  </select>
                </Field>
                <Btn
                  className="self-end"
                  disabled={!roleUserId}
                  onClick={changeRole}
                >
                  {t("pots.changeRole")}
                </Btn>
              </div>
              {participants.length > 0 && (
                <ul className="mt-3 divide-y divide-ink/[0.06]">
                  {participants.map((p, i) => {
                    const uid = p.userId ?? p.id;
                    return (
                      <li
                        key={uid ?? i}
                        className="flex items-center justify-between py-2 text-sm"
                      >
                        <span>
                          {p.fullName ?? uid} · {p.role ?? "member"}
                        </span>
                        {uid ? (
                          <Btn
                            variant="danger"
                            className="text-xs"
                            onClick={() => removeParticipant(uid)}
                          >
                            {t("pots.remove")}
                          </Btn>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
            </div>
            </div>
          )}

          {tab === "more" && (
            <div className="space-y-4">
          <Panel title={t("pots.danger")}>
            <div className="flex flex-wrap gap-2">
              <Btn variant="danger" onClick={deleteContribution}>
                {t("pots.deletePot")}
              </Btn>
            </div>
          </Panel>
          <Panel title={t("pots.activity")}>
            <div className="flex flex-wrap gap-2">
              <Btn
                variant="secondary"
                onClick={() =>
                  void action.run(async () => {
                    const [hist, board, live, atts] = await Promise.all([
                      bffFetch(`/contributions/${id}/history`).catch(() => null),
                      bffFetch(
                        `/contributions/${id}/leaderboard?limit=10`,
                      ).catch(() => null),
                      bffFetch<{ items?: LiveActivityItem[] }>(
                        `/contributions/${id}/live-activity?limit=20`,
                      ).catch(() => null),
                      bffFetch(
                        `/contributions/${id}/attachments`,
                      ).catch(() => null),
                    ]);
                    setExtraInsight({ hist, board, live, atts });
                    return true;
                  }, { success: t("pots.okLoaded") })
                }
              >
                {t("pots.loadActivity")}
              </Btn>
              <label className="inline-flex cursor-pointer items-center rounded-xl border border-ink/[0.1] bg-surface px-3 py-2 text-sm font-semibold">
                {t("pots.addAttachment")}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const fd = new FormData();
                    fd.append("file", f);
                    void action.run(async () => {
                      const res = await fetch(
                        (await import("@/lib/bff")).bffApi(
                          `/contributions/${id}/attachments`,
                        ),
                        { method: "POST", credentials: "include", body: fd },
                      );
                      if (!res.ok) throw new Error(`Upload ${res.status}`);
                      return res.json();
                    }, { success: t("pots.okAttachment") });
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {extraInsight?.live ? (
              <div className="mt-4">
                <p className="mb-2 text-xs text-ink-mute">
                  Aperçu (même contenu que les bulles système du chat) —
                  préfère ouvrir la discussion.
                </p>
                <LiveActivityList
                  items={
                    Array.isArray(extraInsight.live)
                      ? extraInsight.live
                      : extraInsight.live.items ?? []
                  }
                  emptyLabel={t("discover.feedEmpty")}
                />
              </div>
            ) : null}
            {extraInsight != null && (extraInsight.hist || extraInsight.board) ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-ink-mute">
                  Historique / classements (brut)
                </summary>
                <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-surface-sunken/50 p-3 text-xs">
                  {JSON.stringify(
                    { hist: extraInsight.hist, board: extraInsight.board },
                    null,
                    2,
                  )}
                </pre>
              </details>
            ) : null}
          </Panel>
            </div>
          )}
        </>
      )}
    </div>
  );
}
