"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

type Row = {
  id?: string;
  amount?: number;
  montant?: number;
  status?: string;
  dueDate?: string;
  createdAt?: string;
  title?: string;
  contributionId?: string;
  currency?: string;
  financialGoal?: number;
};

type Tab = "cotisations" | "cagnottes" | "public";

export default function ContributionsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("cagnottes");
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("100000");
  const [isPublic, setIsPublic] = useState(false);

  const cotisations = useBff<unknown>("/cotisations/my-cotisations?limit=50");
  const cagnottes = useBff<unknown>("/contributions/my-contributions?limit=50");
  const pub = useBff<unknown>(
    tab === "public" ? "/contributions/public?limit=30" : null,
  );
  const action = useAction();

  const active =
    tab === "cotisations" ? cotisations : tab === "public" ? pub : cagnottes;
  const items = normalizeList<Row>(active.data, [
    "items",
    "cotisations",
    "contributions",
    "data",
  ]);

  const create = () =>
    void action.mutate<{ id?: string }>(
      "/contributions",
      {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || title.trim(),
          financialGoal: Number(goal) || undefined,
          currency: "BIF",
          country: "BI",
          isPublic,
        }),
      },
      {
        success: t("pots.created"),
        onDone: (r) => {
          setShowCreate(false);
          void cagnottes.refresh();
          if (r?.id) router.push(`/app/contributions/${r.id}`);
        },
      },
    );

  const tabs = [
    ["cagnottes", t("pots.tabMine")] as const,
    ["cotisations", t("pots.tabCotisations")] as const,
    ["public", t("pots.tabDiscover")] as const,
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pots.title")}
        description={t("pots.desc")}
        actions={
          <>
            <Btn variant="secondary" onClick={() => void active.refresh()}>
              {active.refreshing ? "…" : t("common.refresh")}
            </Btn>
            <Btn
              onClick={() => {
                setShowCreate((v) => !v);
                setTab("cagnottes");
              }}
            >
              {t("pots.new")}
            </Btn>
          </>
        }
      />

      {(action.error || action.success) && (
        <Alert tone={action.error ? "rose" : "teal"}>
          {action.error ?? action.success}
        </Alert>
      )}

      {showCreate && (
        <Panel title={t("pots.createPanel")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("common.title")}>
              <input
                className={inputClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field label={t("pots.goal")}>
              <input
                className={inputClass}
                type="number"
                min={100}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
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
            <label className="flex items-center gap-2 text-sm text-brand-800">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              {t("pots.publicPot")}
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <Btn disabled={action.busy || !title.trim()} onClick={create}>
              {action.busy ? t("pots.creating") : t("pots.create")}
            </Btn>
            <Btn variant="ghost" onClick={() => setShowCreate(false)}>
              {t("common.cancel")}
            </Btn>
          </div>
        </Panel>
      )}

      <div className="flex flex-wrap gap-2">
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
        <p className="text-sm text-brand-600">{t("common.loading")}</p>
      )}
      {active.error && <Alert>{active.error}</Alert>}
      {!active.loading && items.length === 0 && !active.error && (
        <EmptyState>{t("pots.empty")}</EmptyState>
      )}
      {items.length > 0 && (
        <ul className="divide-y divide-brand-100 overflow-hidden rounded-2xl border border-brand-100 bg-white/80 shadow-sm">
          {items.map((c, i) => {
            const hrefId =
              tab === "cotisations" ? c.contributionId : c.id;
            return (
              <li key={c.id ?? i}>
                {hrefId ? (
                  <Link
                    href={`/app/contributions/${hrefId}${
                      tab === "cotisations" && c.id
                        ? `?cotisation=${c.id}`
                        : ""
                    }`}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition hover:bg-brand-50/60"
                  >
                    <div>
                      <p className="font-medium text-brand-900">
                        {c.title ??
                          (tab === "cotisations"
                            ? t("pots.cotisationFallback", {
                                id: c.id?.slice(0, 8) ?? i + 1,
                              })
                            : t("pots.potFallback", {
                                id: c.id?.slice(0, 8) ?? i + 1,
                              }))}
                      </p>
                      <p className="text-xs text-brand-600">
                        {c.dueDate ?? c.createdAt ?? "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.status ? (
                        <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                      ) : null}
                      <p className="font-display text-lg font-semibold text-brand-800">
                        {money(
                          c.amount ?? c.montant ?? c.financialGoal,
                          c.currency ?? "BIF",
                        )}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <div className="flex justify-between px-4 py-3">
                    <span>{c.title ?? "—"}</span>
                    <span>{money(c.amount ?? c.montant)}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
