"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { bffFetch } from "@/lib/bff-fetch";
import { cx } from "@/lib/cx";

const DISMISS_KEY = "akiba-push-prompt-dismissed-at";
const SENT_KEY = "akiba-push-prompt-after-send";
const PAY_KEY = "akiba-push-prompt-after-pay";

async function enableWebPush(): Promise<"on" | "denied" | "unsupported"> {
  if (
    typeof Notification === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return "unsupported";
  }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "denied";
  const reg = await navigator.serviceWorker.ready;
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const opts: PushSubscriptionOptionsInit = { userVisibleOnly: true };
    if (vapid) {
      const pad = "=".repeat((4 - (vapid.length % 4)) % 4);
      const raw = atob(vapid.replace(/-/g, "+").replace(/_/g, "/") + pad);
      const key = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) key[i] = raw.charCodeAt(i);
      opts.applicationServerKey = key;
    }
    sub = await reg.pushManager.subscribe(opts);
  }
  await bffFetch("/notifications/devices/fcm-token", {
    method: "POST",
    body: JSON.stringify({
      token: JSON.stringify(sub.toJSON()),
      platform: "web",
      deviceLabel: "PWA",
      locale: navigator.language,
    }),
  });
  return "on";
}

export function markPushMoment(kind: "send" | "pay") {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(kind === "send" ? SENT_KEY : PAY_KEY, "1");
  window.dispatchEvent(new Event("akiba-push-moment"));
}

/** Prompt push contextuel après 1er message ou 1ère cotisation. */
export function ContextualPushPrompt() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const evaluate = useCallback(() => {
    if (typeof window === "undefined") return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") return;
    if (Notification.permission === "denied") return;
    const dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() - dismissed < 7 * 24 * 60 * 60 * 1000) return;
    const triggered =
      localStorage.getItem(SENT_KEY) === "1" ||
      localStorage.getItem(PAY_KEY) === "1";
    if (!triggered) return;
    // Montrer sur chat ou pot juste après l’action
    if (
      pathname.startsWith("/app/chat") ||
      pathname.startsWith("/app/contributions") ||
      pathname.startsWith("/app")
    ) {
      setOpen(true);
    }
  }, [pathname]);

  useEffect(() => {
    evaluate();
    const onMoment = () => evaluate();
    window.addEventListener("akiba-push-moment", onMoment);
    return () => window.removeEventListener("akiba-push-moment", onMoment);
  }, [evaluate]);

  if (!open) return null;

  return (
    <div
      className={cx(
        "fixed inset-x-3 z-[70] mx-auto max-w-md rounded-2xl border border-ink/[0.08] bg-surface/95 p-3.5 shadow-lift backdrop-blur-xl",
        "bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6",
      )}
      role="dialog"
      aria-label={t("security.pushTitle")}
    >
      <p className="text-sm font-bold text-ink">{t("security.pushPromptTitle")}</p>
      <p className="mt-1 text-xs text-ink-mute">{t("security.pushPromptHint")}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          className="rounded-xl bg-brand-500 px-3 py-2 text-xs font-bold text-white"
          onClick={() => {
            void (async () => {
              setBusy(true);
              try {
                await enableWebPush();
                setOpen(false);
                localStorage.setItem(DISMISS_KEY, String(Date.now()));
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          {t("security.pushEnable")}
        </button>
        <button
          type="button"
          className="rounded-xl px-3 py-2 text-xs font-semibold text-ink-mute"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
            setOpen(false);
          }}
        >
          {t("pwa.installLater")}
        </button>
      </div>
    </div>
  );
}
