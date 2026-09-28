"use client";

import { useEffect, useState } from "react";
import { useOfflineOptional } from "@/lib/offline/context";
import { listChatOutbox } from "@/lib/chat-cache";
import { useI18n } from "@/lib/i18n/context";
import { cx } from "@/lib/cx";

export function LocalDataHint({ show }: { show?: boolean }) {
  const { t } = useI18n();
  if (!show) return null;
  return (
    <p className="mb-3 rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
      {t("pwa.localData")}
    </p>
  );
}

export function OfflineBanner() {
  const offline = useOfflineOptional();
  const { t } = useI18n();
  const [chatPending, setChatPending] = useState(0);

  useEffect(() => {
    if (!offline) return;
    const refresh = () => {
      void listChatOutbox().then((rows) => setChatPending(rows.length));
    };
    refresh();
    const id = window.setInterval(refresh, 8000);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, [offline, offline?.pendingCount]);

  if (!offline) return null;

  const totalPending = offline.pendingCount + chatPending;
  const showOffline = !offline.online;
  const showPending = offline.online && totalPending > 0;
  if (!showOffline && !showPending) return null;

  return (
    <div
      role="status"
      className={cx(
        "border-b px-4 py-2 text-center text-xs font-semibold sm:text-sm",
        showOffline
          ? "border-amber-200/80 bg-amber-50 text-amber-900"
          : "border-mint-200/80 bg-mint-100/80 text-mint-700",
      )}
    >
      {showOffline ? (
        <span>
          {t("pwa.offlineBanner")}
          {totalPending > 0
            ? ` · ${t("pwa.pendingCount", { n: totalPending })}`
            : ""}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => void offline.flush()}
          className="underline-offset-2 hover:underline"
          disabled={offline.syncing}
        >
          {offline.syncing
            ? t("pwa.syncing")
            : t("pwa.pendingSyncCta", { n: totalPending })}
        </button>
      )}
    </div>
  );
}

export function SyncStatusChip() {
  const offline = useOfflineOptional();
  const { t } = useI18n();
  const [chatPending, setChatPending] = useState(0);

  useEffect(() => {
    if (!offline) return;
    const refresh = () => {
      void listChatOutbox().then((rows) => setChatPending(rows.length));
    };
    refresh();
    const id = window.setInterval(refresh, 8000);
    return () => window.clearInterval(id);
  }, [offline, offline?.pendingCount]);

  const total = (offline?.pendingCount ?? 0) + chatPending;
  if (!offline || total === 0) return null;

  return (
    <button
      type="button"
      onClick={() => void offline.flush()}
      disabled={offline.syncing || !offline.online}
      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-900 transition hover:bg-amber-100"
      title={t("pwa.syncChipTitle")}
    >
      <span
        className={cx(
          "h-1.5 w-1.5 rounded-full bg-amber-500",
          offline.syncing && "animate-pulse",
        )}
      />
      {offline.syncing
        ? t("pwa.syncing")
        : t("pwa.pendingShort", { n: total })}
    </button>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const chrome = /CriOS|Chrome|FxiOS/.test(ua);
  return iOS && webkit;
}

export function PwaInstallPrompt() {
  const { t } = useI18n();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [dismissed, setDismissed] = useState(false);
  const [standalone, setStandalone] = useState(true);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const iosStandalone =
      "standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const isStandalone = mq.matches || iosStandalone;
    setStandalone(isStandalone);
    if (!isStandalone && isIosSafari()) {
      const seen = localStorage.getItem("akiba-ios-install-dismissed");
      if (!seen) setIosHint(true);
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (standalone || dismissed) return null;

  if (deferred) {
    return (
      <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[60] mx-auto max-w-md rounded-2xl border border-ink/[0.08] bg-surface/95 p-3 shadow-lift backdrop-blur-xl md:bottom-6">
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="" className="h-10 w-10 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">{t("pwa.installTitle")}</p>
            <p className="mt-0.5 text-xs text-ink-mute">{t("pwa.installHint")}</p>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                className="rounded-xl bg-brand-500 px-3 py-1.5 text-xs font-bold text-white"
                onClick={async () => {
                  await deferred.prompt();
                  await deferred.userChoice;
                  setDeferred(null);
                }}
              >
                {t("pwa.installCta")}
              </button>
              <button
                type="button"
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-ink-mute"
                onClick={() => setDismissed(true)}
              >
                {t("pwa.installLater")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!iosHint) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[60] mx-auto max-w-md rounded-2xl border border-ink/[0.08] bg-surface/95 p-3 shadow-lift backdrop-blur-xl md:bottom-6">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="" className="h-10 w-10 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">{t("pwa.installIosTitle")}</p>
          <p className="mt-0.5 text-xs text-ink-mute">{t("pwa.installIosHint")}</p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              className="rounded-xl px-3 py-1.5 text-xs font-semibold text-ink-mute"
              onClick={() => {
                localStorage.setItem("akiba-ios-install-dismissed", "1");
                setIosHint(false);
              }}
            >
              {t("pwa.installLater")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
