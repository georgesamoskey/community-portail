"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { africaShareLinks } from "@/lib/africa-share";

type Preview = {
  found?: boolean;
  code?: string;
  inviterLabel?: string;
  registerUrl?: string;
  filleulBenefit?: string;
};

export default function ReferralLandingPage() {
  const params = useParams();
  const code = String(params.code ?? "").toUpperCase();
  const { t } = useI18n();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/public/referral/${encodeURIComponent(code)}`,
        );
        const data = (await res.json()) as Preview;
        if (!cancelled) {
          if (!res.ok || data.found === false) {
            setErr(t("viral.refNotFound"));
          } else {
            setPreview(data);
          }
        }
      } catch (e) {
        if (!cancelled) setErr((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, t]);

  const registerUrl =
    preview?.registerUrl ||
    `${process.env.NEXT_PUBLIC_CMS_URL || "http://localhost:3004"}/register?ref=${encodeURIComponent(code)}`;
  const share = africaShareLinks(
    t("viral.refShareText", { code, name: preview?.inviterLabel ?? "" }),
    registerUrl,
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-800 to-mint-800 px-4 py-12 text-white">
      <div className="w-full max-w-md rounded-2.5xl border border-white/15 bg-white/10 p-8 shadow-lift backdrop-blur">
        <p className="text-center text-[11px] font-bold uppercase tracking-wider text-white/70">
          Community
        </p>
        <h1 className="mt-2 text-center font-display text-2xl font-bold">
          {t("viral.refTitle")}
        </h1>
        {err && (
          <p className="mt-4 rounded-xl bg-rose-500/20 px-3 py-2 text-sm">{err}</p>
        )}
        {preview?.found !== false && (
          <p className="mt-4 text-center text-sm text-white/85">
            {t("viral.refInvitedBy", {
              name: preview?.inviterLabel || code,
            })}
          </p>
        )}
        <p className="mt-2 text-center text-sm text-white/75">
          {preview?.filleulBenefit || t("viral.refBenefit")}
        </p>
        <p className="mt-2 text-center font-mono text-lg font-bold tracking-widest">
          {code}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <a
            href={registerUrl}
            className="rounded-xl bg-brand-500 py-3 text-center text-sm font-bold text-white"
          >
            {t("viral.refJoin")}
          </a>
          <a
            href={share.whatsapp}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-[#25D366] py-3 text-center text-sm font-bold text-white"
          >
            WhatsApp
          </a>
          <Link
            href="/login"
            className="text-center text-sm text-white/80 underline"
          >
            {t("viral.refLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
