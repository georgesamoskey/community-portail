"use client";

import { useEffect, useRef, useState } from "react";
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

declare global {
  interface Window {
    __akibaDeferredInstall?: BeforeInstallPromptEvent | null;
  }
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const chrome = /CriOS|Chrome|FxiOS/.test(ua);
  return iOS && webkit && !chrome;
}

function isStandaloneDisplay(): boolean {
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const ios =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const twa = document.referrer.startsWith("android-app://");
  return mq || ios || twa;
}

export function PwaInstallPrompt() {
  const { t } = useI18n();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [dismissed, setDismissed] = useState(false);
  const [standalone, setStandalone] = useState(true);
  const [iosHint, setIosHint] = useState(false);
  const [compact, setCompact] = useState(false);
  const engaged = useRef(false);

  useEffect(() => {
    const isStandalone = isStandaloneDisplay();
    setStandalone(isStandalone);
    if (isStandalone) return;

    const dismissedAt = localStorage.getItem("akiba-install-dismissed-at");
    if (dismissedAt) {
      const age = Date.now() - Number(dismissedAt);
      // Remonter le prompt après 3 jours
      if (Number.isFinite(age) && age < 3 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        setCompact(true);
      }
    }

    if (isIosSafari()) {
      const seen = localStorage.getItem("akiba-ios-install-dismissed");
      if (!seen) setIosHint(true);
    }

    if (window.__akibaDeferredInstall) {
      setDeferred(window.__akibaDeferredInstall);
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      const ev = e as BeforeInstallPromptEvent;
      window.__akibaDeferredInstall = ev;
      setDeferred(ev);
      setDismissed(false);
    };
    const onInstalled = () => {
      window.__akibaDeferredInstall = null;
      setDeferred(null);
      setStandalone(true);
      localStorage.setItem("akiba-pwa-installed", "1");
    };

    // Capturer tôt + après navigation
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);

    // Marquer l’engagement utilisateur (critère Chrome)
    const markEngage = () => {
      engaged.current = true;
    };
    window.addEventListener("pointerdown", markEngage, { once: true });
    window.addEventListener("keydown", markEngage, { once: true });

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("pointerdown", markEngage);
      window.removeEventListener("keydown", markEngage);
    };
  }, []);

  const runInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    window.__akibaDeferredInstall = null;
    setDeferred(null);
    if (choice.outcome === "dismissed") {
      localStorage.setItem("akiba-install-dismissed-at", String(Date.now()));
      setDismissed(true);
      setCompact(true);
    }
  };

  if (standalone) return null;

  // FAB compact si bannière fermée mais install encore possible
  if (dismissed && deferred && compact) {
    return (
      <button
        type="button"
        onClick={() => void runInstall()}
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-3 z-[60] flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lift md:bottom-6"
        aria-label={t("pwa.installCta")}
        title={t("pwa.installTitle")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon-96.png"
          alt=""
          className="h-8 w-8 rounded-lg"
        />
      </button>
    );
  }

  if (dismissed && !iosHint) return null;

  if (deferred && !dismissed) {
    return (
      <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[60] mx-auto max-w-md rounded-2xl border border-ink/[0.08] bg-surface/95 p-3 shadow-lift backdrop-blur-xl md:bottom-6">
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt=""
            className="h-11 w-11 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">{t("pwa.installTitle")}</p>
            <p className="mt-0.5 text-xs text-ink-mute">{t("pwa.installHint")}</p>
            <ul className="mt-2 space-y-0.5 text-[11px] font-medium text-ink-mute">
              <li>· {t("pwa.featureOffline")}</li>
              <li>· {t("pwa.featurePush")}</li>
              <li>· {t("pwa.featureShortcuts")}</li>
            </ul>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                className="rounded-xl bg-brand-500 px-3 py-1.5 text-xs font-bold text-white"
                onClick={() => void runInstall()}
              >
                {t("pwa.installCta")}
              </button>
              <button
                type="button"
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-ink-mute"
                onClick={() => {
                  localStorage.setItem(
                    "akiba-install-dismissed-at",
                    String(Date.now()),
                  );
                  setDismissed(true);
                  setCompact(true);
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

  if (!iosHint) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[60] mx-auto max-w-md overflow-hidden rounded-2xl border border-ink/[0.08] bg-surface/95 shadow-lift backdrop-blur-xl md:bottom-6">
      <div className="mobile-trust-gradient px-4 py-3 text-white">
        <p className="text-sm font-bold">{t("pwa.installIosTitle")}</p>
        <p className="mt-0.5 text-xs text-white/80">{t("pwa.installIosHint")}</p>
      </div>
      <div className="flex items-start gap-3 p-3.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon-192.png"
          alt=""
          className="h-11 w-11 rounded-xl shadow-soft"
        />
        <div className="min-w-0 flex-1">
          <ol className="space-y-2 text-[12px] font-medium text-ink-soft">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-100 text-[10px] font-bold text-brand-800">
                1
              </span>
              <span className="inline-flex flex-wrap items-center gap-1">
                {t("pwa.iosStepShare")}
                <svg
                  className="inline h-4 w-4 text-brand-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M12 3v12M8 7l4-4 4 4M5 14v4.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V14"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-100 text-[10px] font-bold text-brand-800">
                2
              </span>
              {t("pwa.iosStepAdd")}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-100 text-[10px] font-bold text-brand-800">
                3
              </span>
              {t("pwa.iosStepConfirm")}
            </li>
          </ol>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded-xl bg-brand-500 px-3 py-1.5 text-xs font-bold text-white"
              onClick={() => {
                localStorage.setItem("akiba-ios-install-dismissed", "1");
                setIosHint(false);
              }}
            >
              {t("pwa.iosGotIt")}
            </button>
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
