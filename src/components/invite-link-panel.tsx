"use client";

import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/context";

/** Lien d’invitation en premier : copier, puis WhatsApp. Le reste est replié. */
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

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const whatsapp = () => {
    if (!url) return;
    const href = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="grid gap-3">
      <p className="text-sm text-ink-soft">{hint}</p>
      <p className="break-all rounded-xl bg-brand-50 p-3 text-sm font-medium text-brand-900">
        {url ?? (busy ? t("invite.preparing") : "—")}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!url || busy}
          onClick={() => void copy()}
          className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lift transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {copied ? t("invite.copied") : t("invite.copy")}
        </button>
        <button
          type="button"
          disabled={!url || busy}
          onClick={whatsapp}
          className="inline-flex items-center justify-center rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1ebe5d] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("invite.whatsapp")}
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
