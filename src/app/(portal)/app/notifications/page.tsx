"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { bffFetch, BffError } from "@/lib/bff-fetch";
import { useBff } from "@/lib/use-bff";
import { normalizeList, type NotificationRow } from "@/lib/portal-api";
import { formatDateTime } from "@/lib/ui";
import { cx } from "@/lib/cx";

function invitationCodeOf(n: NotificationRow): string | null {
  const direct = n.data?.invitationCode;
  if (direct) return direct;
  const url = n.data?.invitationUrl ?? n.actionUrl ?? "";
  const match = url.match(/\/invite\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isContributionInvite(n: NotificationRow): boolean {
  return (n.type ?? "").toLowerCase() === "invitation";
}

function tontineIdOf(n: NotificationRow): string | null {
  if ((n.type ?? "").toLowerCase() !== "tontine_invited") return null;
  return n.data?.tontineId ?? null;
}

function isUnread(n: NotificationRow): boolean {
  if (n.read === true || n.isRead === true || n.readAt) return false;
  return true;
}

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

  const count =
    unread.data?.count ?? items.filter((n) => isUnread(n)).length;
  const seenInbox = useRef(false);

  const refreshUnread = unread.refresh;
  useEffect(() => {
    if (seenInbox.current || list.loading || count === 0) return;
    seenInbox.current = true;
    void bffFetch("/notifications/read/all", { method: "PUT" })
      .then(() => refreshUnread())
      .catch(() => {
        seenInbox.current = false;
      });
  }, [count, list.loading, refreshUnread]);

  const refreshAll = useCallback(async () => {
    await Promise.all([list.refresh(), unread.refresh()]);
  }, [list, unread]);

  const acceptInvitation = async (n: NotificationRow) => {
    setMutating(true);
    setErr(null);
    try {
      let code = invitationCodeOf(n);
      if (!code && n.data?.invitationId) {
        const detail = await bffFetch<{ invitationCode?: string }>(
          `/invitations/${n.data.invitationId}`,
        );
        code = detail.invitationCode ?? null;
      }
      if (!code) {
        const mine = await bffFetch<
          | { items?: Array<{ id?: string; invitationCode?: string; contributionId?: string }> }
          | Array<{ id?: string; invitationCode?: string; contributionId?: string }>
        >("/invitations/my-invitations");
        const rows = Array.isArray(mine)
          ? mine
          : (mine.items ?? []);
        const match =
          rows.find((row) => row.id && row.id === n.data?.invitationId) ??
          rows.find(
            (row) =>
              row.contributionId &&
              row.contributionId === n.data?.contributionId,
          ) ??
          (rows.length === 1 ? rows[0] : undefined);
        code = match?.invitationCode ?? null;
      }
      if (!code) {
        setErr(t("invite.notFound"));
        return;
      }
      const me = await bffFetch<{ id?: string }>("/users/me");
      if (!me?.id) {
        setErr(t("invite.needAuth"));
        return;
      }
      await bffFetch(`/invitations/accept/${encodeURIComponent(code)}`, {
        method: "POST",
        body: JSON.stringify({ userId: me.id }),
      });
      await bffFetch(`/notifications/${n.id}/read`, { method: "PUT" });
      await refreshAll();
    } catch (e) {
      setErr(e instanceof BffError ? e.message : t("notifications.fail"));
    } finally {
      setMutating(false);
    }
  };

  const acceptTontine = async (tontineId: string, notificationId: string) => {
    setMutating(true);
    setErr(null);
    try {
      await bffFetch(`/tontines/${tontineId}/members/me/accept`, {
        method: "POST",
      });
      await bffFetch(`/notifications/${notificationId}/read`, { method: "PUT" });
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
        <ul className="divide-y divide-brand-100 overflow-hidden rounded-2xl border border-brand-100 bg-surface/80 shadow-soft">
          {items.map((n) => {
            const unreadRow = isUnread(n);
            const invite = isContributionInvite(n);
            const tontineId = tontineIdOf(n);
            const code = invitationCodeOf(n);
            return (
              <li
                key={n.id}
                className={cx(
                  "flex flex-col gap-3 px-4 py-3",
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
                {invite ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={mutating}
                      onClick={() => void acceptInvitation(n)}
                      className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                    >
                      {t("invite.accept")}
                    </button>
                    <Link
                      href={code ? `/invite/${encodeURIComponent(code)}` : "/app/invitations"}
                      className="rounded-xl border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800"
                    >
                      {t("invitations.openInvite")}
                    </Link>
                  </div>
                ) : null}
                {tontineId ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={mutating}
                      onClick={() => void acceptTontine(tontineId, n.id)}
                      className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                    >
                      {t("tontines.acceptInvite")}
                    </button>
                    <Link
                      href={`/app/tontines/${tontineId}`}
                      className="rounded-xl border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800"
                    >
                      {t("invitations.openInvite")}
                    </Link>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
