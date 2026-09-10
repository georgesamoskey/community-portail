"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { SignInButton } from "@/components/sign-in-button";
import { bffFetch, BffError } from "@/lib/bff-fetch";
import { useI18n } from "@/lib/i18n/context";
import { formatDateTime } from "@/lib/ui";

type InvitePreview = {
  id?: string;
  contributionId?: string;
  contributionTitle?: string;
  inviterName?: string;
  message?: string;
  expiresAt?: string;
  error?: string;
};

export default function InviteTokenPage() {
  const params = useParams();
  const token = String(params.token ?? "");
  const { data: session, status } = useSession();
  const { t } = useI18n();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/public/invitations/${encodeURIComponent(token)}`);
        const data = (await res.json()) as InvitePreview;
        if (!cancelled) {
          if (!res.ok) setErr(data.error ?? t("invite.notFound"));
          else setPreview(data);
        }
      } catch (e) {
        if (!cancelled) setErr((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  const accept = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      if (session?.user) {
        let userId: string | undefined;
        try {
          const me = await bffFetch<{ id?: string }>("/users/me");
          userId = me?.id;
        } catch {
          /* ignore */
        }
        await fetch(`/api/public/invitations/${encodeURIComponent(token)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userId ? { userId } : {}),
        }).then(async (res) => {
          if (!res.ok) {
            const text = await res.text();
            throw new Error(text || t("common.error"));
          }
        });
      } else {
        throw new Error(t("invite.needAuth"));
      }
      setMsg(t("invite.accepted"));
    } catch (e) {
      setErr(
        e instanceof BffError
          ? e.message
          : e instanceof Error
            ? e.message
            : t("common.error"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="social-rise w-full max-w-lg rounded-2.5xl border border-ink/[0.06] bg-surface p-8 shadow-chat">
        <p className="font-display text-center text-2xl font-bold tracking-tight text-ink">
          {t("invite.title")}
        </p>
        {loading && (
          <p className="mt-6 text-center text-sm text-ink-mute">{t("invite.loading")}</p>
        )}
        {err && (
          <p className="mt-6 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-900">
            {err}
          </p>
        )}
        {msg && (
          <p className="mt-6 rounded-xl bg-mint-50 px-4 py-3 text-sm text-mint-900">
            {msg}
          </p>
        )}
        {preview && !err && (
          <div className="mt-6 space-y-3 text-center">
            <h1 className="font-display text-xl font-bold text-ink">
              {preview.contributionTitle ?? t("invite.pot")}
            </h1>
            {preview.inviterName ? (
              <p className="text-sm text-ink-mute">
                {t("invite.invitedBy")}{" "}
                <strong>{preview.inviterName}</strong>
              </p>
            ) : null}
            {preview.message ? (
              <p className="rounded-xl bg-surface-sunken/60 px-4 py-3 text-sm text-ink-soft">
                {preview.message}
              </p>
            ) : null}
            {preview.expiresAt ? (
              <p className="text-xs text-ink-faint">
                {t("invite.expires")} {formatDateTime(preview.expiresAt)}
              </p>
            ) : null}

            {status === "authenticated" ? (
              <div className="flex flex-col items-center gap-3 pt-4">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void accept()}
                  className="w-full rounded-xl bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-lift hover:bg-brand-600 disabled:opacity-40"
                >
                  {busy ? t("invite.accepting") : t("invite.accept")}
                </button>
                {preview.contributionId ? (
                  <Link
                    href={`/app/contributions/${preview.contributionId}`}
                    className="text-sm font-semibold text-brand-600"
                  >
                    {t("invite.seePot")}
                  </Link>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3 pt-4">
                <p className="text-sm text-ink-mute">{t("invite.hint")}</p>
                <a
                  href={`${process.env.NEXT_PUBLIC_CMS_URL?.replace(/\/$/, "") || "http://localhost:3004"}/register?invite=${encodeURIComponent(token)}`}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-lift hover:bg-brand-600"
                >
                  {t("invite.createAccount")}
                </a>
                <SignInButton
                  label={t("invite.alreadyMember")}
                  callbackUrl={`/invite/${token}`}
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}
        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-ink-mute hover:text-brand-600">
            {t("invite.back")}
          </Link>
        </div>
      </div>
    </div>
  );
}
