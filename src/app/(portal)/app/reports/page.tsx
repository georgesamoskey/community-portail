"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { useBff } from "@/lib/use-bff";
import { useAction } from "@/lib/use-action";
import { bffApi } from "@/lib/bff";
import { normalizeList } from "@/lib/portal-api";
import {
  Alert,
  Badge,
  Btn,
  EmptyState,
  Field,
  inputClass,
  PageHeader,
  Panel,
  statusTone,
} from "@/lib/ui";

type ReportRow = {
  id?: string;
  type?: string;
  format?: string;
  status?: string;
  createdAt?: string;
  filename?: string;
};

export default function ReportsPage() {
  const { t } = useI18n();
  const list = useBff<unknown>("/reports?page=1&limit=30");
  const stats = useBff<Record<string, unknown>>("/reports/statistics/my");
  const action = useAction();
  const [type, setType] = useState("cotisation");
  const [format, setFormat] = useState("pdf");
  const [contributionId, setContributionId] = useState("");

  const items = useMemo(
    () => normalizeList<ReportRow>(list.data, ["items", "reports", "data"]),
    [list.data],
  );

  const generate = () =>
    void action.mutate(
      "/reports/generate",
      {
        method: "POST",
        body: JSON.stringify({
          type,
          format,
          contributionId: contributionId.trim() || undefined,
        }),
      },
      {
        success: t("reports.requested"),
        onDone: () => void list.refresh(),
      },
    );

  const download = (id: string) =>
    void action.run(async () => {
      const res = await fetch(bffApi(`/reports/${id}/download`), {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rapport-${id.slice(0, 8)}`;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    }, { success: t("reports.downloaded") });

  const remove = (id: string) => {
    if (!confirm(t("reports.confirmDelete"))) return;
    void action.mutate(
      `/reports/${id}`,
      { method: "DELETE" },
      { success: t("reports.deleted"), onDone: () => void list.refresh() },
    );
  };

  const exportContribution = () => {
    if (!contributionId.trim()) {
      void action.run(async () => {
        throw new Error(t("reports.needId"));
      });
      return;
    }
    void action.run(async () => {
      const res = await fetch(
        bffApi(`/reports/export/contribution/${contributionId.trim()}`),
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export-${contributionId.slice(0, 8)}`;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    }, { success: t("reports.exportReady") });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("reports.title")}
        description={t("reports.desc")}
        actions={
          <Btn variant="secondary" onClick={() => void list.refresh()}>
            {t("common.refresh")}
          </Btn>
        }
      />

      {(action.error || action.success) && (
        <Alert tone={action.error ? "rose" : "teal"}>
          {action.error ?? action.success}
        </Alert>
      )}

      {stats.data && (
        <Panel title={t("reports.stats")}>
          <pre className="max-h-40 overflow-auto rounded-xl bg-surface-sunken/50 p-3 text-xs">
            {JSON.stringify(stats.data, null, 2)}
          </pre>
        </Panel>
      )}

      <Panel title={t("reports.generate")}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("reports.type")}>
            <select
              className={inputClass}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="cotisation">cotisation</option>
              <option value="contribution">contribution</option>
              <option value="user">user</option>
              <option value="financial">financial</option>
            </select>
          </Field>
          <Field label={t("reports.format")}>
            <select
              className={inputClass}
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
            </select>
          </Field>
          <Field label={t("reports.potId")}>
            <input
              className={inputClass}
              value={contributionId}
              onChange={(e) => setContributionId(e.target.value)}
              placeholder="uuid…"
            />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn onClick={generate} disabled={action.busy}>
            {t("reports.generateBtn")}
          </Btn>
          <Btn variant="secondary" onClick={exportContribution}>
            {t("reports.exportPot")}
          </Btn>
        </div>
      </Panel>

      <Panel title={t("reports.list", { n: items.length })}>
        {list.loading && (
          <p className="text-sm text-ink-mute">{t("common.loading")}</p>
        )}
        {list.error && <Alert>{list.error}</Alert>}
        {!list.loading && items.length === 0 && !list.error && (
          <EmptyState>{t("reports.empty")}</EmptyState>
        )}
        {items.length > 0 && (
          <ul className="divide-y divide-ink/[0.06]">
            {items.map((r, i) => (
              <li
                key={r.id ?? i}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div>
                  <p className="font-medium text-ink">
                    {r.type ?? t("reports.fallback")} · {r.format ?? "—"}
                  </p>
                  <p className="text-xs text-ink-mute">{r.createdAt ?? ""}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {r.status ? (
                    <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                  ) : null}
                  {r.id ? (
                    <>
                      <Btn
                        variant="secondary"
                        className="text-xs"
                        onClick={() => download(r.id!)}
                      >
                        {t("reports.download")}
                      </Btn>
                      <Btn
                        variant="danger"
                        className="text-xs"
                        onClick={() => remove(r.id!)}
                      >
                        {t("common.delete")}
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
  );
}
