"use client";

import { useCallback, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { bffFetch, BffError } from "@/lib/bff-fetch";
import { useBff } from "@/lib/use-bff";
import { normalizeList, type NotificationRow } from "@/lib/portal-api";
import { formatDateTime } from "@/lib/ui";
import { cx } from "@/lib/cx";

export default function NotificationsPage() {
  const { t } = useI18n();
  const list = useBff<{ items?: NotificationRow[] } | NotificationRow[]>(
    "/notifications?page=1&limit=40",
  );
  const unread = useBff<{ count?: number }>("/notifications/unread/count");
  const [mutating, setMutating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const items = Array.isArray(list.data)
    ? list.data
    : normalizeList<NotificationRow>(list.data, ["items", "notifications", "data"]);

  const count = unread.data?.count ?? items.filter((n) => !n.isRead && !n.readAt).length;

  const refreshAll = useCallback(async () => {
    await Promise.all([list.refresh(), unread.refresh()]);
  }, [list, unread]);

  const markOne = async (id: string) => {
    setMutating(true);
    setErr(null);
    try {
      await bffFetch(`/notifications/${id}/read`, { method: "PUT" });
      await refreshAll();
    } catch (e) {
      setErr(e instanceof BffError ? e.message : t("notifications.fail"));
    } finally {
      setMutating(false);
    }
  };

  const markAll = async () => {
    setMutating(true);
    setErr(null);
    try {
      await bffFetch("/notifications/read/all", { method: "PUT" });
      await refreshAll();
    } catch (e) {
      setErr(e instanceof BffError ? e.message : t("notifications.fail"));
    } finally {
      setMutating(false);
    }
  };

  const purgeOld = async () => {
    if (!confirm(t("notifications.purgeConfirm"))) return;
    setMutating(true);
    setErr(null);
    try {
      await bffFetch("/notifications/old", { method: "DELETE" });
      await refreshAll();
    } catch (e) {
      setErr(e instanceof BffError ? e.message : t("notifications.purgeFail"));
    } finally {
      setMutating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            {t("notifications.title")}
          </h1>
          <p className="mt-1 text-sm text-ink-mute">
            {count > 0
              ? t("notifications.unread", { n: count })
              : t("notifications.allRead")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={mutating || count === 0}
            onClick={() => void markAll()}
            className="rounded-xl border border-ink/[0.1] bg-surface px-3 py-1.5 text-sm font-semibold disabled:opacity-40"
          >
            {t("notifications.markAll")}
          </button>
          <button
            type="button"
            disabled={mutating}
            onClick={() => void purgeOld()}
            className="rounded-xl border border-ink/[0.1] bg-surface px-3 py-1.5 text-sm font-semibold text-ink-soft disabled:opacity-40"
          >
            {t("notifications.purge")}
          </button>
          <button
            type="button"
            onClick={() => void refreshAll()}
            className="rounded-xl border border-ink/[0.1] bg-surface px-3 py-1.5 text-sm font-semibold"
          >
            {t("common.refresh")}
          </button>
        </div>
      </div>

      {(err || list.error) && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {err ?? list.error}
        </p>
      )}

      {list.loading && !items.length ? (
        <p className="text-sm text-brand-600">{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-200 p-8 text-center text-sm text-brand-700/70">
          {t("notifications.empty")}
        </div>
      ) : (
        <ul className="divide-y divide-brand-100 overflow-hidden rounded-2xl border border-brand-100 bg-white/80 shadow-sm">
          {items.map((n) => {
            const unreadRow = !n.isRead && !n.readAt;
            return (
              <li
                key={n.id}
                className={cx(
                  "flex flex-wrap items-start justify-between gap-3 px-4 py-3",
                  unreadRow && "bg-brand-50/60",
                )}
              >
                <div>
                  <p className="font-medium text-brand-900">
                    {n.title ?? n.type ?? t("notifications.fallback")}
                  </p>
                  <p className="mt-1 text-sm text-brand-700/80">
                    {n.message ?? n.body ?? "—"}
                  </p>
                  <p className="mt-1 text-xs text-brand-500">
                    {n.createdAt ? formatDateTime(n.createdAt) : ""}
                  </p>
                </div>
                {unreadRow && (
                  <button
                    type="button"
                    disabled={mutating}
                    onClick={() => void markOne(n.id)}
                    className="text-xs font-medium text-brand-700 hover:underline"
                  >
                    {t("notifications.markRead")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
