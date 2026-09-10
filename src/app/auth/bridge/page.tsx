"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";

function BridgeInner() {
  const search = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();
  const ticket = search.get("ticket") ?? "";
  const callbackUrl = search.get("callbackUrl") || "/app/chat";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticket) {
      setError(t("bridge.missingTicket"));
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await signIn("ticket", {
        ticket,
        redirect: false,
        callbackUrl,
      });
      if (cancelled) return;
      if (res?.error) {
        setError(t("bridge.failed"));
        return;
      }
      router.replace(callbackUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [ticket, callbackUrl, router, t]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-ink/[0.06] bg-surface p-8 text-center shadow-chat">
        {error ? (
          <>
            <p className="text-sm text-brand-800">{error}</p>
            <a
              href={`/login?registered=1`}
              className="mt-4 inline-flex rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white"
            >
              {t("bridge.goLogin")}
            </a>
          </>
        ) : (
          <p className="text-sm text-ink-mute">{t("bridge.loading")}</p>
        )}
      </div>
    </div>
  );
}

export default function AuthBridgePage() {
  const { t } = useI18n();

  return (
    <Suspense fallback={<p className="p-8 text-center text-sm">{t("common.loading")}</p>}>
      <BridgeInner />
    </Suspense>
  );
}
