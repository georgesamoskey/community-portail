"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useBff } from "@/lib/use-bff";
import { useAction } from "@/lib/use-action";
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

type Member = {
  id?: string;
  userId?: string;
  role?: string;
  status?: string;
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
};

type Round = {
  id?: string;
  index?: number;
  status?: string;
  beneficiaryUserId?: string;
};

type TontineDetail = {
  id?: string;
  title?: string;
  name?: string;
  description?: string;
  status?: string;
  type?: string;
  contributionAmount?: number;
  currency?: string;
  seats?: number;
  frequency?: string;
  orderStrategy?: string;
  inviteCode?: string;
  joinCode?: string;
  chatRoomId?: string | null;
  memberships?: Member[];
  members?: Member[];
  rounds?: Round[];
  myRole?: string;
  currentUserMembership?: Member;
  seatOrder?: string[];
  order?: string[];
};

type AscaLoan = {
  id?: string;
  status?: string;
  principal?: number;
  amountOwed?: number;
  penaltyAccrued?: number;
  borrowerUserId?: string;
};

type AscaOverview = {
  fundTotal?: number;
  fundAvailable?: number;
  socialFundTotal?: number;
  totalShares?: number;
  currency?: string;
  loans?: AscaLoan[];
};

export default function TontineDetailPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const router = useRouter();
  const { data: session } = useSession();
  const canPay = hasPermission(session?.user?.roles, Permission.PORTAL_PAYMENTS);
  const action = useAction();
  const { t } = useI18n();

  const detail = useBff<TontineDetail>(id ? `/tontines/${id}` : null);
  const rounds = useBff<unknown>(id ? `/tontines/${id}/rounds` : null);
  const providers = useBff<unknown>(
    canPay ? "/mobile-money/providers?capability=collection" : null,
  );

  const ton = detail.data;
  const asca = useBff<AscaOverview>(
    id && ton?.type === "asca" ? `/tontines/${id}/asca` : null,
  );
  const members = useMemo(
    () =>
      ton?.memberships ??
      ton?.members ??
      normalizeList<Member>(ton, ["memberships", "members"]),
    [ton],
  );
  const roundList = useMemo(() => {
    if (ton?.rounds?.length) return ton.rounds;
    return normalizeList<Round>(rounds.data, ["items", "rounds", "data"]);
  }, [ton, rounds.data]);

  const providerList = useMemo(
    () =>
      normalizeList<{ slug?: string; id?: string; name?: string }>(
        providers.data,
        ["items", "providers", "data"],
      ),
    [providers.data],
  );

  const [inviteUserId, setInviteUserId] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [searchHits, setSearchHits] = useState<
    Array<{ id?: string; firstName?: string; lastName?: string; email?: string }>
  >([]);
  const [payRound, setPayRound] = useState<number | null>(null);
  const [payerUserId, setPayerUserId] = useState("");
  const [provider, setProvider] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [disburseRound, setDisburseRound] = useState<number | null>(null);
  const [disburseMethod, setDisburseMethod] = useState("mobile_money");
  const [disbursePhone, setDisbursePhone] = useState("");
  const [disburseProvider, setDisburseProvider] = useState("");
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [voteOrder, setVoteOrder] = useState<string[]>([]);
  const [votesData, setVotesData] = useState<unknown>(null);
  const [roundIndexView, setRoundIndexView] = useState<number | null>(null);
  const [roundPayments, setRoundPayments] = useState<unknown[]>([]);
  const [roundPayouts, setRoundPayouts] = useState<unknown[]>([]);
  const [feePreview, setFeePreview] = useState<unknown>(null);
  const [tab, setTab] = useState<"overview" | "rounds" | "people" | "setup">("rounds");
  const [ascaDepositAmount, setAscaDepositAmount] = useState("");
  const [ascaOpenNext, setAscaOpenNext] = useState(true);

  useEffect(() => {
    markChecklist("opened_tontine");
  }, []);

  useEffect(() => {
    if (payRound != null || disburseRound != null || roundIndexView != null) {
      setTab("rounds");
    }
  }, [payRound, disburseRound, roundIndexView]);

  const reload = () => {
    void detail.refresh();
    void rounds.refresh();
    void asca.refresh();
  };

  const memberUserIds = useMemo(
    () =>
      members
        .map((m) => m.userId ?? m.user?.id)
        .filter((x): x is string => !!x),
    [members],
  );

  const ensureOrderSeed = () => {
    const seeded = ton?.seatOrder ?? ton?.order ?? memberUserIds;
    setOrderIds([...seeded]);
    setVoteOrder([...seeded]);
  };

  const saveOrder = () =>
    void action.mutate(
      `/tontines/${id}/order`,
      { method: "POST", body: JSON.stringify({ order: orderIds }) },
      { success: t("tontines.okOrder"), onDone: reload },
    );

  const submitVote = () =>
    void action.mutate(
      `/tontines/${id}/votes`,
      { method: "POST", body: JSON.stringify({ order: voteOrder }) },
      { success: t("tontines.okVote") },
    );

  const loadVotes = () =>
    void action.run(async () => {
      const data = await import("@/lib/bff-fetch").then(({ bffFetch }) =>
        bffFetch(`/tontines/${id}/votes`),
      );
      setVotesData(data);
      return data;
    }, { success: t("tontines.okVotes") });

  const loadRoundPayments = (index: number) =>
    void action.run(async () => {
      const data = await import("@/lib/bff-fetch").then(({ bffFetch }) =>
        bffFetch<unknown>(
          `/tontines/${id}/rounds/${index}/contributions`,
        ),
      );
      setRoundIndexView(index);
      setRoundPayments(
        Array.isArray(data)
          ? data
          : normalizeList(data, ["items", "contributions", "data"]),
      );
      const round = roundList.find((r) => (r.index ?? -1) === index) ?? roundList[index];
      if (round?.id) {
        try {
          const { bffFetch } = await import("@/lib/bff-fetch");
          const po = await bffFetch<unknown>(
            `/tontine-rounds/${round.id}/payouts`,
          );
          setRoundPayouts(
            Array.isArray(po)
              ? po
              : normalizeList(po, ["items", "payouts", "data"]),
          );
        } catch {
          setRoundPayouts([]);
        }
      } else {
        setRoundPayouts([]);
      }
      return data;
    }, { success: t("tontines.payoutsTitle", { n: index }) });

  const loadFeePreview = () => {
    if (payRound == null || !payerUserId) return;
    void action.run(async () => {
      const q = new URLSearchParams({ payerUserId });
      const data = await import("@/lib/bff-fetch").then(({ bffFetch }) =>
        bffFetch(
          `/tontines/${id}/rounds/${payRound}/contributions/fee-preview?${q}`,
        ),
      );
      setFeePreview(data);
      return data;
    }, { success: t("tontines.feePreview") });
  };

  const moveInList = (
    list: string[],
    index: number,
    dir: -1 | 1,
    setter: (v: string[]) => void,
  ) => {
    const next = [...list];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setter(next);
  };

  const searchUsers = () =>
    void action.run(async () => {
      const data = await import("@/lib/bff-fetch").then(({ bffFetch }) =>
        bffFetch<unknown>(`/users/search?q=${encodeURIComponent(searchQ)}`),
      );
      setSearchHits(
        normalizeList(data, ["items", "users", "data", "results"]),
      );
      return data;
    });

  const invite = () =>
    void action.mutate(
      `/tontines/${id}/members`,
      { method: "POST", body: JSON.stringify({ userId: inviteUserId }) },
      { success: t("tontines.okInvite"), onDone: () => { markChecklist("invited_someone"); reload(); } },
    );

  const accept = () =>
    void action.mutate(
      `/tontines/${id}/members/me/accept`,
      { method: "POST" },
      { success: t("tontines.okAccepted"), onDone: reload },
    );

  const leave = () =>
    void action.mutate(
      `/tontines/${id}/members/me`,
      { method: "DELETE" },
      {
        success: t("tontines.okLeft"),
        onDone: () => router.push("/app/tontines"),
      },
    );

  const start = () =>
    void action.mutate(
      `/tontines/${id}/start`,
      { method: "POST" },
      { success: t("tontines.okStarted"), onDone: reload },
    );

  const cancel = () => {
    if (!confirm(t("tontines.confirmCancel"))) return;
    void action.mutate(
      `/tontines/${id}/cancel`,
      { method: "POST" },
      { success: t("tontines.okCancelled"), onDone: reload },
    );
  };

  const payMm = () => {
    if (payRound == null) return;
    void action.mutate(
      `/tontines/${id}/rounds/${payRound}/contributions/mobile-money`,
      {
        method: "POST",
        body: JSON.stringify({
          payerUserId,
          provider,
          payerPhone,
        }),
      },
      {
        success: t("tontines.okMm"),
        onDone: () => {
          markChecklist("paid_or_cotised");
          setPayRound(null);
          reload();
        },
      },
    );
  };

  const attest = (index: number, uid: string) =>
    void action.mutate(
      `/tontines/${id}/rounds/${index}/contributions`,
      {
        method: "POST",
        body: JSON.stringify({ payerUserId: uid, method: "cash" }),
      },
      { success: t("tontines.okAttest"), onDone: () => { markChecklist("paid_or_cotised"); reload(); } },
    );

  const completeRound = (index: number) =>
    void action.mutate(
      `/tontines/${id}/rounds/${index}/complete`,
      { method: "POST" },
      { success: t("tontines.okClosed"), onDone: reload },
    );

  const disburse = () => {
    if (disburseRound == null) return;
    const destination =
      disburseMethod === "mobile_money"
        ? { provider: disburseProvider, phone: disbursePhone }
        : disburseMethod === "cash"
          ? { handlerName: "Cash desk", notes: "Remise en main propre" }
          : {
              iban: "BI00",
              bankName: "Banque",
              accountHolder: "Bénéficiaire",
            };
    void action.mutate(
      `/tontines/${id}/rounds/${disburseRound}/disburse`,
      {
        method: "POST",
        body: JSON.stringify({
          method: disburseMethod,
          destination,
          reason: "Décaissement tour tontine",
        }),
      },
      {
        success: t("tontines.okDisburse"),
        onDone: () => {
          setDisburseRound(null);
          reload();
        },
      },
    );
  };

  if (!id) return <Alert tone="rose">{t("pots.missingId")}</Alert>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={ton?.title ?? ton?.name ?? t("tontines.detailFallback")}
        description={ton?.description ?? t("tontines.detailDesc")}
        actions={
          <>
            <Link
              href="/app/tontines"
              className="rounded-xl border border-brand-200 bg-white px-3.5 py-2 text-sm font-semibold text-brand-800"
            >
              {t("common.list")}
            </Link>
            {ton?.chatRoomId ? (
              <Link
                href={`/app/chat?room=${ton.chatRoomId}`}
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

      {ton && (
        <>
          <div className="flex flex-wrap gap-2">
            {ton.status ? (
              <Badge tone={statusTone(ton.status)}>{ton.status}</Badge>
            ) : null}
            {ton.type ? (
              <Badge tone="info">{ton.type.toUpperCase()}</Badge>
            ) : null}
            <Badge>
              {money(ton.contributionAmount, ton.currency ?? "BIF")} / tour
            </Badge>
            {ton.frequency ? <Badge tone="info">{ton.frequency}</Badge> : null}
            {ton.seats != null ? <Badge>{ton.seats} places</Badge> : null}
            {(ton.inviteCode || ton.joinCode) && (
              <Badge tone="info">{t("common.code")} : {ton.inviteCode ?? ton.joinCode}</Badge>
            )}
          </div>

          {ton.type === "asca" && (
            <Panel title="Fonds ASCA">
              <div className="flex flex-wrap gap-3 text-sm">
                <Badge>
                  Total :{" "}
                  {money(
                    asca.data?.fundTotal,
                    asca.data?.currency ?? ton.currency ?? "BIF",
                  )}
                </Badge>
                <Badge tone="info">
                  Disponible :{" "}
                  {money(
                    asca.data?.fundAvailable,
                    asca.data?.currency ?? ton.currency ?? "BIF",
                  )}
                </Badge>
                <Badge>
                  Fonds social :{" "}
                  {money(
                    asca.data?.socialFundTotal,
                    asca.data?.currency ?? ton.currency ?? "BIF",
                  )}
                </Badge>
                <Badge tone="info">
                  Parts : {asca.data?.totalShares ?? "—"}
                </Badge>
              </div>
              {asca.loading && (
                <p className="mt-2 text-xs text-brand-600">{t("common.loading")}</p>
              )}
              {asca.error && (
                <div className="mt-2">
                  <Alert>{asca.error}</Alert>
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <div className="min-w-[10rem] flex-1">
                  <Field label="Montant dépôt">
                    <input
                      className={inputClass}
                      type="number"
                      min={1}
                      value={ascaDepositAmount}
                      onChange={(e) => setAscaDepositAmount(e.target.value)}
                    />
                  </Field>
                </div>
                <Btn
                  disabled={action.busy || Number(ascaDepositAmount) <= 0}
                  onClick={() =>
                    void action.mutate(
                      `/tontines/${id}/asca/deposits`,
                      {
                        method: "POST",
                        body: JSON.stringify({
                          amount: Number(ascaDepositAmount),
                        }),
                      },
                      {
                        success: "Dépôt ASCA enregistré",
                        onDone: () => {
                          setAscaDepositAmount("");
                          void asca.refresh();
                        },
                      },
                    )
                  }
                >
                  Déposer
                </Btn>
                {(ton.myRole === "admin" ||
                  ton.currentUserMembership?.role === "admin") && (
                  <>
                    <label className="flex items-center gap-2 text-xs text-ink-mute">
                      <input
                        type="checkbox"
                        checked={ascaOpenNext}
                        onChange={(e) => setAscaOpenNext(e.target.checked)}
                      />
                      Ouvrir le cycle suivant
                    </label>
                    <Btn
                      variant="secondary"
                      disabled={action.busy}
                      onClick={() => {
                        if (!confirm("Clôturer le cycle ASCA ?")) return;
                        void action.mutate(
                          `/tontines/${id}/asca/close-cycle`,
                          {
                            method: "POST",
                            body: JSON.stringify({ openNext: ascaOpenNext }),
                          },
                          {
                            success: "Cycle ASCA clôturé",
                            onDone: reload,
                          },
                        );
                      }}
                    >
                      Clôturer le cycle
                    </Btn>
                  </>
                )}
              </div>
              {(ton.myRole === "admin" ||
                ton.currentUserMembership?.role === "admin") &&
                (asca.data?.loans ?? []).some(
                  (l) => (l.status ?? "").toLowerCase() === "requested",
                ) && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold text-ink">
                      Prêts en attente
                    </p>
                    {(asca.data?.loans ?? [])
                      .filter(
                        (l) => (l.status ?? "").toLowerCase() === "requested",
                      )
                      .map((loan) => (
                        <div
                          key={loan.id}
                          className="flex flex-wrap items-center gap-2 text-sm"
                        >
                          <span>
                            {loan.borrowerUserId?.slice(0, 8)}… ·{" "}
                            {money(
                              loan.principal,
                              asca.data?.currency ?? ton.currency ?? "BIF",
                            )}
                          </span>
                          <Btn
                            disabled={action.busy || !loan.id}
                            onClick={() =>
                              void action.mutate(
                                `/tontines/${id}/asca/loans/${loan.id}/decide`,
                                {
                                  method: "POST",
                                  body: JSON.stringify({ approve: true }),
                                },
                                {
                                  success: "Prêt approuvé",
                                  onDone: () => void asca.refresh(),
                                },
                              )
                            }
                          >
                            Approuver
                          </Btn>
                          <Btn
                            variant="secondary"
                            disabled={action.busy || !loan.id}
                            onClick={() =>
                              void action.mutate(
                                `/tontines/${id}/asca/loans/${loan.id}/decide`,
                                {
                                  method: "POST",
                                  body: JSON.stringify({ approve: false }),
                                },
                                {
                                  success: "Prêt rejeté",
                                  onDone: () => void asca.refresh(),
                                },
                              )
                            }
                          >
                            Rejeter
                          </Btn>
                        </div>
                      ))}
                  </div>
                )}
            </Panel>
          )}

          {ton.chatRoomId ? (
            <a
              href={`/app/chat?room=${ton.chatRoomId}`}
              onClick={() => {
                markChecklist("joined_chat");
                markChecklist("opened_tontine");
              }}
              className="flex items-center justify-between gap-3 rounded-2xl border border-brand-200/70 bg-gradient-to-r from-brand-50 to-mint-50 px-4 py-3 text-sm shadow-soft transition hover:shadow-lift"
            >
              <span>
                <span className="font-bold text-ink">{t("tontines.chatBanner")}</span>
                <span className="mt-0.5 block text-ink-mute">
                  {t("tontines.chatBannerSub")}
                </span>
              </span>
              <span className="font-bold text-brand-600">{t("common.open")} →</span>
            </a>
          ) : null}

          <SegmentedTabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "rounds", label: t("tontines.tabRounds"), hint: t("tontines.tabRoundsHint") },
              { id: "people", label: t("tontines.tabMembers"), hint: t("tontines.tabMembersHint") },
              { id: "overview", label: t("tontines.tabActions"), hint: t("tontines.tabActionsHint") },
              { id: "setup", label: t("tontines.tabOrder"), hint: t("tontines.tabOrderHint") },
            ]}
          />

          {tab === "overview" && (
            <div className="space-y-4">
          <Panel title={t("tontines.tabActions")}>
            <div className="flex flex-wrap gap-2">
              <Btn variant="secondary" onClick={accept} disabled={action.busy}>
                {t("tontines.acceptInvite")}
              </Btn>
              <Btn onClick={start} disabled={action.busy}>
                {t("tontines.startCycle")}
              </Btn>
              <Btn variant="danger" onClick={cancel} disabled={action.busy}>
                {t("common.cancel")}
              </Btn>
              <Btn variant="ghost" onClick={leave} disabled={action.busy}>
                {t("tontines.leave")}
              </Btn>
            </div>
          </Panel>
            </div>
          )}

          {tab === "people" && (
            <div className="space-y-4">
            <Panel title={`${t("tontines.tabMembers")} (${members.length})`}>
              {members.length === 0 ? (
                <EmptyState>{t("tontines.noMembers")}</EmptyState>
              ) : (
                <ul className="divide-y divide-brand-100">
                  {members.map((m, i) => {
                    const uid = m.userId ?? m.user?.id ?? m.id;
                    const label =
                      `${m.user?.firstName ?? ""} ${m.user?.lastName ?? ""}`.trim() ||
                      m.user?.email ||
                      uid ||
                      t("tontines.memberN", { n: i + 1 });
                    return (
                      <li
                        key={uid ?? i}
                        className="flex items-center justify-between gap-2 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium text-brand-900">{label}</p>
                          <p className="text-xs text-brand-600">
                            {m.role ?? "member"}
                            {m.status ? ` · ${m.status}` : ""}
                          </p>
                        </div>
                        {uid ? (
                          <Btn
                            variant="ghost"
                            className="text-xs"
                            onClick={() => setPayerUserId(uid)}
                          >
                            {t("tontines.selectPayer")}
                          </Btn>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-4 space-y-3 border-t border-brand-100 pt-4">
                <Field label={t("tontines.searchMember")}>
                  <div className="flex gap-2">
                    <input
                      className={inputClass}
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                      placeholder={t("tontines.searchPlaceholder")}
                    />
                    <Btn
                      variant="secondary"
                      disabled={!searchQ.trim() || action.busy}
                      onClick={searchUsers}
                    >
                      {t("tontines.searchBtn")}
                    </Btn>
                  </div>
                </Field>
                {searchHits.length > 0 && (
                  <ul className="max-h-40 space-y-1 overflow-auto text-sm">
                    {searchHits.map((u) => (
                      <li key={u.id}>
                        <button
                          type="button"
                          className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-brand-50"
                          onClick={() => {
                            if (u.id) setInviteUserId(u.id);
                          }}
                        >
                          {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() ||
                            u.email ||
                            u.id}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <Field label={t("tontines.userIdInvite")}>
                  <input
                    className={inputClass}
                    value={inviteUserId}
                    onChange={(e) => setInviteUserId(e.target.value)}
                  />
                </Field>
                <Btn
                  disabled={!inviteUserId || action.busy}
                  onClick={invite}
                >
                  {t("common.invite")}
                </Btn>
              </div>
            </Panel>
            </div>
          )}

          {tab === "setup" && (
            <div className="space-y-4">
            <Panel title={t("tontines.rotationOrder")}>
              <p className="mb-3 text-xs text-ink-mute">
                {t("tontines.rotationHint")} ({ton.orderStrategy ?? "fixed"})
              </p>
              <div className="flex flex-wrap gap-2">
                <Btn
                  variant="secondary"
                  onClick={() => {
                    ensureOrderSeed();
                  }}
                >
                  {t("tontines.loadMembers")}
                </Btn>
                <Btn
                  disabled={!orderIds.length || action.busy}
                  onClick={saveOrder}
                >
                  {t("tontines.saveOrder")}
                </Btn>
                {(ton.orderStrategy === "vote" || !ton.orderStrategy) && (
                  <>
                    <Btn variant="secondary" onClick={loadVotes}>
                      {t("tontines.seeVotes")}
                    </Btn>
                    <Btn
                      variant="mint"
                      disabled={!voteOrder.length || action.busy}
                      onClick={submitVote}
                    >
                      {t("tontines.voteOrder")}
                    </Btn>
                  </>
                )}
              </div>
              {orderIds.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {orderIds.map((uid, i) => {
                    const m = members.find(
                      (x) => (x.userId ?? x.user?.id) === uid,
                    );
                    const label =
                      `${m?.user?.firstName ?? ""} ${m?.user?.lastName ?? ""}`.trim() ||
                      uid.slice(0, 8);
                    return (
                      <li
                        key={uid}
                        className="flex items-center justify-between gap-2 rounded-lg bg-surface-sunken/50 px-2 py-1.5 text-sm"
                      >
                        <span>
                          {i + 1}. {label}
                        </span>
                        <span className="flex gap-1">
                          <Btn
                            variant="ghost"
                            className="text-xs"
                            onClick={() =>
                              moveInList(orderIds, i, -1, setOrderIds)
                            }
                          >
                            ↑
                          </Btn>
                          <Btn
                            variant="ghost"
                            className="text-xs"
                            onClick={() =>
                              moveInList(orderIds, i, 1, setOrderIds)
                            }
                          >
                            ↓
                          </Btn>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {ton.orderStrategy === "vote" && voteOrder.length > 0 && (
                <div className="mt-4 border-t border-ink/[0.06] pt-3">
                  <p className="mb-2 text-xs font-semibold text-ink-mute">
                    {t("tontines.myVote")}
                  </p>
                  <ul className="space-y-1">
                    {voteOrder.map((uid, i) => (
                      <li
                        key={`v-${uid}`}
                        className="flex items-center justify-between rounded-lg px-2 py-1 text-sm"
                      >
                        <span>
                          {i + 1}. {uid.slice(0, 8)}…
                        </span>
                        <span className="flex gap-1">
                          <Btn
                            variant="ghost"
                            className="text-xs"
                            onClick={() =>
                              moveInList(voteOrder, i, -1, setVoteOrder)
                            }
                          >
                            ↑
                          </Btn>
                          <Btn
                            variant="ghost"
                            className="text-xs"
                            onClick={() =>
                              moveInList(voteOrder, i, 1, setVoteOrder)
                            }
                          >
                            ↓
                          </Btn>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {votesData != null && (
                <pre className="mt-3 max-h-40 overflow-auto rounded-xl bg-mint-50 p-3 text-xs">
                  {JSON.stringify(votesData, null, 2)}
                </pre>
              )}
            </Panel>
            </div>
          )}

          {tab === "rounds" && (
            <div className="space-y-4">
            <Panel title={t("tontines.rounds", { n: roundList.length })}>
              {rounds.loading && !roundList.length ? (
                <p className="text-sm text-brand-600">{t("common.loading")}</p>
              ) : roundList.length === 0 ? (
                <EmptyState>
                  {t("tontines.noRounds")}
                </EmptyState>
              ) : (
                <ul className="space-y-3">
                  {roundList.map((r, i) => {
                    const index = r.index ?? i;
                    return (
                      <li
                        key={r.id ?? index}
                        className="rounded-xl border border-brand-100 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium text-brand-900">
                              {t("tontines.roundN", { n: index })}
                            </p>
                            <p className="text-xs text-brand-600">
                              {r.beneficiaryUserId
                                ? `${t("tontines.beneficiary")} ${r.beneficiaryUserId.slice(0, 8)}…`
                                : "—"}
                            </p>
                          </div>
                          {r.status ? (
                            <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Btn
                            variant="secondary"
                            className="text-xs"
                            onClick={() => {
                              setPayRound(index);
                              if (!payerUserId && members[0]) {
                                setPayerUserId(
                                  members[0].userId ??
                                    members[0].user?.id ??
                                    "",
                                );
                              }
                            }}
                          >
                            {t("tontines.payMm")}
                          </Btn>
                          {payerUserId ? (
                            <Btn
                              variant="secondary"
                              className="text-xs"
                              onClick={() => attest(index, payerUserId)}
                            >
                              {t("tontines.attestCash")}
                            </Btn>
                          ) : null}
                          <Btn
                            variant="ghost"
                            className="text-xs"
                            onClick={() => loadRoundPayments(index)}
                          >
                            {t("tontines.payouts")}
                          </Btn>
                          <Btn
                            variant="ghost"
                            className="text-xs"
                            onClick={() => completeRound(index)}
                          >
                            {t("tontines.closeRound")}
                          </Btn>
                          <Btn
                            className="text-xs"
                            onClick={() => setDisburseRound(index)}
                          >
                            {t("tontines.disburse")}
                          </Btn>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

          {payRound != null && (
            <Panel title={t("tontines.mmPayTitle", { n: payRound })}>
              {!canPay ? (
                <Alert>
                  {t("tontines.needPayments")}
                </Alert>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t("tontines.payer")}>
                    <input
                      className={inputClass}
                      value={payerUserId}
                      onChange={(e) => setPayerUserId(e.target.value)}
                    />
                  </Field>
                  <Field label={t("tontines.provider")}>
                    <select
                      className={inputClass}
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
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
                  <Field label={t("tontines.phoneE164")} hint="ex. +25779123456">
                    <input
                      className={inputClass}
                      value={payerPhone}
                      onChange={(e) => setPayerPhone(e.target.value)}
                      placeholder="+257…"
                    />
                  </Field>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Btn
                  variant="secondary"
                  disabled={!payerUserId || payRound == null}
                  onClick={loadFeePreview}
                >
                  {t("tontines.feePreview")}
                </Btn>
                <Btn
                  disabled={
                    action.busy ||
                    !canPay ||
                    !payerUserId ||
                    !provider ||
                    !payerPhone
                  }
                  onClick={payMm}
                >
                  {t("tontines.initPay")}
                </Btn>
                <Btn variant="ghost" onClick={() => setPayRound(null)}>
                  {t("common.close")}
                </Btn>
              </div>
              {feePreview != null && (
                <pre className="mt-3 max-h-40 overflow-auto rounded-xl bg-brand-50 p-3 text-xs">
                  {JSON.stringify(feePreview, null, 2)}
                </pre>
              )}
            </Panel>
          )}

          {roundIndexView != null && (
            <Panel title={`{t("tontines.payouts")} — tour #${roundIndexView}`}>
              {roundPayments.length === 0 ? (
                <EmptyState>{t("tontines.noPayouts")}</EmptyState>
              ) : (
                <ul className="divide-y divide-ink/[0.06]">
                  {roundPayments.map((p, i) => {
                    const row = p as Record<string, unknown>;
                    return (
                      <li key={String(row.id ?? i)} className="py-2 text-sm">
                        <span className="font-medium text-ink">
                          {String(row.payerUserId ?? row.userId ?? "—")}
                        </span>
                        <span className="text-ink-mute">
                          {" "}
                          · {String(row.status ?? "—")} ·{" "}
                          {String(row.method ?? row.paymentMethod ?? "")}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {roundPayouts.length > 0 && (
                <div className="mt-4 border-t border-ink/[0.06] pt-3">
                  <p className="mb-2 text-xs font-bold uppercase text-ink-mute">
                    {t("tontines.payouts")}
                  </p>
                  <pre className="max-h-40 overflow-auto rounded-xl bg-mint-50 p-2 text-xs">
                    {JSON.stringify(roundPayouts, null, 2)}
                  </pre>
                </div>
              )}
              <Btn
                variant="ghost"
                className="mt-2"
                onClick={() => setRoundIndexView(null)}
              >
                {t("common.close")}
              </Btn>
            </Panel>
          )}

          {disburseRound != null && (
            <Panel title={t("tontines.disburseTitle", { n: disburseRound })}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("common.method")}>
                  <select
                    className={inputClass}
                    value={disburseMethod}
                    onChange={(e) => setDisburseMethod(e.target.value)}
                  >
                    <option value="mobile_money">{t("tontines.mm")}</option>
                    <option value="cash">{t("tontines.cash")}</option>
                    <option value="bank_transfer">{t("tontines.transfer")}</option>
                  </select>
                </Field>
                {disburseMethod === "mobile_money" && (
                  <>
                    <Field label={t("tontines.provider")}>
                      <input
                        className={inputClass}
                        value={disburseProvider}
                        onChange={(e) => setDisburseProvider(e.target.value)}
                        placeholder="lumicash"
                      />
                    </Field>
                    <Field label={t("common.phone")}>
                      <input
                        className={inputClass}
                        value={disbursePhone}
                        onChange={(e) => setDisbursePhone(e.target.value)}
                      />
                    </Field>
                  </>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <Btn disabled={action.busy} onClick={disburse}>
                  {t("tontines.requestDisburse")}
                </Btn>
                <Btn variant="ghost" onClick={() => setDisburseRound(null)}>
                  {t("common.close")}
                </Btn>
              </div>
            </Panel>
          )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
