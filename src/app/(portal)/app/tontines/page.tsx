"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { useBff } from "@/lib/use-bff";
import { useAction } from "@/lib/use-action";
import { normalizeList } from "@/lib/portal-api";
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
  statusTone,
} from "@/lib/ui";

type TontineItem = {
  id?: string;
  name?: string;
  title?: string;
  status?: string;
  amount?: number;
  contributionAmount?: number;
  currency?: string;
  seats?: number;
  memberCount?: number;
  chatRoomId?: string | null;
  inviteCode?: string;
  joinCode?: string;
};

export default function TontinesPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { data, loading, error, refresh, refreshing } = useBff<unknown>(
    "/tontines/mine",
  );
  const items = normalizeList<TontineItem>(data, ["items", "tontines", "data"]);
  const action = useAction();

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contributionAmount, setContributionAmount] = useState("10000");
  const [seats, setSeats] = useState("5");
  const [frequency, setFrequency] = useState("monthly");
  const [joinCode, setJoinCode] = useState("");

  const create = () =>
    void action.mutate<{ id?: string }>(
      "/tontines",
      {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || title.trim(),
          contributionAmount: Number(contributionAmount),
          seats: Number(seats),
          frequency,
          currency: "BIF",
          country: "BI",
        }),
      },
      {
        success: t("tontines.created"),
        onDone: (r) => {
          setShowCreate(false);
          void refresh();
          if (r?.id) router.push(`/app/tontines/${r.id}`);
        },
      },
    );

  const join = () =>
    void action.mutate(
      "/tontines/join-by-code",
      { method: "POST", body: JSON.stringify({ code: joinCode.trim() }) },
      {
        success: t("tontines.joinSent"),
        onDone: () => {
          setShowJoin(false);
          setJoinCode("");
          void refresh();
        },
      },
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("tontines.title")}
        description={t("tontines.desc")}
        actions={
          <>
            <Btn variant="secondary" onClick={() => void refresh()}>
              {refreshing ? "…" : t("common.refresh")}
            </Btn>
            <Btn
              variant="secondary"
              onClick={() => {
                setShowJoin((v) => !v);
                setShowCreate(false);
              }}
            >
              {t("tontines.join")}
            </Btn>
            <Btn
              onClick={() => {
                setShowCreate((v) => !v);
                setShowJoin(false);
              }}
            >
              {t("tontines.create")}
            </Btn>
          </>
        }
      />

      {(action.error || action.success) && (
        <Alert tone={action.error ? "rose" : "teal"}>
          {action.error ?? action.success}
        </Alert>
      )}

      {showJoin && (
        <Panel title={t("tontines.joinPanel")}>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[12rem] flex-1">
              <Field label={t("tontines.inviteCode")}>
                <input
                  className={inputClass}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="ABC123"
                />
              </Field>
            </div>
            <Btn
              disabled={action.busy || !joinCode.trim()}
              onClick={join}
            >
              {action.busy ? "…" : t("tontines.join")}
            </Btn>
          </div>
        </Panel>
      )}

      {showCreate && (
        <Panel title={t("tontines.newPanel")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("common.title")}>
              <input
                className={inputClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field label={t("tontines.amountPerRound")}>
              <input
                className={inputClass}
                type="number"
                min={100}
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
              />
            </Field>
            <Field label={t("tontines.seats")}>
              <input
                className={inputClass}
                type="number"
                min={2}
                max={50}
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
              />
            </Field>
            <Field label={t("tontines.frequency")}>
              <select
                className={inputClass}
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              >
                <option value="weekly">{t("tontines.weekly")}</option>
                <option value="biweekly">{t("tontines.biweekly")}</option>
                <option value="monthly">{t("tontines.monthly")}</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label={t("common.description")}>
                <textarea
                  className={inputClass}
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Btn
              disabled={
                action.busy || !title.trim() || Number(contributionAmount) < 100
              }
              onClick={create}
            >
              {action.busy ? t("tontines.creating") : t("tontines.createSubmit")}
            </Btn>
            <Btn variant="ghost" onClick={() => setShowCreate(false)}>
              {t("common.cancel")}
            </Btn>
          </div>
        </Panel>
      )}

      {loading && <p className="text-sm text-brand-700/60">{t("common.loading")}</p>}
      {error && <Alert>{error}</Alert>}
      {!loading && !error && items.length === 0 && (
        <EmptyState>{t("tontines.empty")}</EmptyState>
      )}
      {items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li
              key={item.id ?? i}
              className="flex flex-wrap items-center gap-2 rounded-2xl border border-brand-100 bg-white/80 p-4 shadow-sm transition hover:border-brand-300 hover:shadow-md"
            >
              <Link
                href={item.id ? `/app/tontines/${item.id}` : "/app/tontines"}
                className="min-w-0 flex-1"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold text-brand-900">
                      {item.name ??
                        item.title ??
                        t("tontines.fallback", { id: item.id ?? i + 1 })}
                    </p>
                    <p className="mt-1 text-sm text-brand-700/70">
                      {money(
                        item.amount ?? item.contributionAmount,
                        item.currency ?? "BIF",
                      )}
                      {item.memberCount != null &&
                        ` · ${item.memberCount} ${t("common.members")}`}
                      {item.seats != null &&
                        ` · ${t("tontines.seatsCount", { n: item.seats })}`}
                    </p>
                  </div>
                  {item.status ? (
                    <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                  ) : null}
                </div>
              </Link>
              {item.chatRoomId ? (
                <Link
                  href={`/app/chat?room=${item.chatRoomId}`}
                  className="shrink-0 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-sm"
                >
                  💬 {t("common.discuss")}
                </Link>
              ) : (
                <Link
                  href="/app/chat"
                  className="shrink-0 rounded-xl border border-brand-200 px-3 py-2 text-xs font-semibold text-brand-800"
                >
                  {t("nav.chat")}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
