"use client";

import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/context";

/** Le lien partagé suit le site ouvert, jamais localhost. */
function shareableInviteUrl(raw: string | null): string | null {
  if (!raw) return null;
  if (typeof window === "undefined") return raw;
  try {
    const parsed = new URL(raw, window.location.origin);
    const local =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (!local) return parsed.toString();
    return `${window.location.origin}${parsed.pathname}${parsed.search}`;
  } catch {
    return raw;
  }
}

/** Adresse courte : le long jeton n'a pas à être lu. */
function quietInviteLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const token = parsed.pathname.split("/").filter(Boolean).pop() ?? "";
    const short = token.length > 6 ? `${token.slice(0, 4)}…` : token;
    return `${parsed.host}/invite/${short}`;
  } catch {
    return url;
  }
}

/** Lien d’invitation : WhatsApp d’abord, le détail technique reste caché. */
export function InviteLinkPanel({
  hint,
  url,
  busy,
  shareText,
  otherLabel,
  children,
}: {
  hint: string;
  url: string | null;
  busy?: boolean;
  shareText: string;
  otherLabel: string;
  children?: ReactNode;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [openOther, setOpenOther] = useState(false);
  const publicUrl = shareableInviteUrl(url);
  const message =
    publicUrl && url && shareText.includes(url)
      ? shareText.split(url).join(publicUrl)
      : shareText;

  const copy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const whatsapp = () => {
    if (!publicUrl) return;
    const href = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="grid gap-3">
      <p className="text-sm text-ink-soft">{hint}</p>
      <div className="rounded-2xl border border-ink/[0.06] bg-surface px-4 py-4 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">
          {publicUrl ? t("invite.ready") : t("invite.preparing")}
        </p>
        <p className="mt-1 truncate text-base font-semibold text-ink">
          {publicUrl ? quietInviteLabel(publicUrl) : "—"}
        </p>
        {publicUrl ? (
          <p className="mt-3 rounded-xl bg-surface-sunken/70 px-3 py-2 text-left text-xs leading-relaxed text-ink-soft">
            {message}
          </p>
        ) : null}
        <button
          type="button"
          disabled={!publicUrl || busy}
          onClick={whatsapp}
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#1ebe5d] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("invite.sendWhatsapp")}
        </button>
        <button
          type="button"
          disabled={!publicUrl || busy}
          onClick={() => void copy()}
          className="mt-2 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {copied ? t("invite.copied") : t("invite.copy")}
        </button>
      </div>
      {children ? (
        <div>
          <button
            type="button"
            className="text-sm font-semibold text-brand-700"
            onClick={() => setOpenOther((open) => !open)}
          >
            {otherLabel}
          </button>
          {openOther ? <div className="mt-3 grid gap-3">{children}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
