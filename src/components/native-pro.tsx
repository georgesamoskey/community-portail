"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { useOfflineOptional } from "@/lib/offline/context";
import { cx } from "@/lib/cx";
import { haptic } from "@/lib/native";
import { pushToast } from "@/components/native-ux";

/** Toast « Nouvelle version — Relancer » quand un SW waiting. */
export function SwUpdateToast() {
  const { t } = useI18n();
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let reg: ServiceWorkerRegistration | null = null;

    const check = (r: ServiceWorkerRegistration) => {
      if (r.waiting) setWaiting(r.waiting);
    };

    void navigator.serviceWorker.ready.then((r) => {
      reg = r;
      check(r);
      r.addEventListener("updatefound", () => {
        const sw = r.installing;
        sw?.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            setWaiting(r.waiting);
          }
        });
      });
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });

    const onFocus = () => {
      void reg?.update().then(() => {
        if (reg) check(reg);
      });
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") onFocus();
    });

    const id = window.setInterval(() => {
      void reg?.update().then(() => {
        if (reg) check(reg);
      });
    }, 45_000);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (!waiting) return null;

  return (
    <div className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[85] mx-auto max-w-md rounded-2xl border border-brand-200 bg-brand-500 px-4 py-3 text-center text-sm font-bold text-white shadow-lift">
      <p>{t("native.updateReady")}</p>
      <button
        type="button"
        className="mt-2 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-bold"
        onClick={() => {
          haptic("medium");
          waiting.postMessage({ type: "SKIP_WAITING" });
          waiting.postMessage("SKIP_WAITING");
          window.setTimeout(() => window.location.reload(), 400);
        }}
      >
        {t("native.updateCta")}
      </button>
    </div>
  );
}

/** Edge-swipe back (iOS-like) depuis le bord gauche. */
export function EdgeSwipeBack() {
  const router = useRouter();
  const startX = useRef(0);
  const startY = useRef(0);
  const tracking = useRef(false);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t || t.clientX > 28) return;
      startX.current = t.clientX;
      startY.current = t.clientY;
      tracking.current = true;
    };
    const onMove = (e: TouchEvent) => {
      if (!tracking.current) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - startX.current;
      const dy = Math.abs(t.clientY - startY.current);
      if (dy > 40) {
        tracking.current = false;
        return;
      }
      if (dx > 90) {
        tracking.current = false;
        haptic("light");
        router.back();
      }
    };
    const onEnd = () => {
      tracking.current = false;
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd);
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    };
  }, [router]);

  return null;
}

/** Skeleton loaders ISO. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-xl bg-ink/[0.06] dark:bg-white/10",
        className,
      )}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-ink/[0.06] bg-surface p-4">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-4/5" />
      <Skeleton className="mt-4 h-1.5 w-full rounded-full" />
    </div>
  );
}

export function SkeletonList({ n = 4 }: { n?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: n }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** File d’attente offline visible. */
export function OfflineQueuePanel() {
  const offline = useOfflineOptional();
  const { t } = useI18n();
  if (!offline || offline.pendingCount === 0) return null;

  return (
    <div className="mb-4 rounded-2xl border border-amber-200/80 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-950/40">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-amber-950 dark:text-amber-100">
            {t("native.queueTitle", { n: offline.pendingCount })}
          </p>
          <p className="text-xs text-amber-800/80 dark:text-amber-200/80">
            {t("native.queueHint")}
          </p>
        </div>
        <button
          type="button"
          disabled={!offline.online || offline.syncing}
          onClick={() => {
            haptic("medium");
            void offline.flush().then(() =>
              pushToast(t("native.refreshed"), "ok"),
            );
          }}
          className="shrink-0 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {offline.syncing ? t("pwa.syncing") : t("native.queueSync")}
        </button>
      </div>
      <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-[11px] text-amber-900/90 dark:text-amber-100/80">
        {offline.pending.slice(0, 8).map((p) => (
          <li key={p.id} className="truncate font-medium">
            · {p.entityType}/{p.actionType} · {p.id.slice(0, 8)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** PIN local (fallback biométrie). */
const PIN_KEY = "akiba-app-pin";
const PIN_LOCK = "akiba-pin-lock";

export function PinLockGate({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (localStorage.getItem(PIN_LOCK) === "1" && localStorage.getItem(PIN_KEY)) {
      setLocked(true);
    }
    const onVis = () => {
      if (
        document.visibilityState === "visible" &&
        localStorage.getItem(PIN_LOCK) === "1" &&
        localStorage.getItem(PIN_KEY)
      ) {
        setLocked(true);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  if (!locked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[99] flex flex-col items-center justify-center bg-background px-6">
      <h1 className="font-display text-xl font-bold text-ink">{t("native.pinTitle")}</h1>
      <p className="mt-1 text-sm text-ink-mute">{t("native.pinHint")}</p>
      <input
        className="mt-6 w-40 rounded-2xl border border-ink/[0.1] bg-surface px-4 py-3 text-center text-2xl tracking-[0.4em] outline-none focus:ring-2 focus:ring-brand-200"
        inputMode="numeric"
        maxLength={6}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
        autoFocus
      />
      {error ? <p className="mt-2 text-sm text-brand-600">{error}</p> : null}
      <button
        type="button"
        className="mt-4 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white"
        onClick={() => {
          if (pin === localStorage.getItem(PIN_KEY)) {
            haptic("success");
            setLocked(false);
            setPin("");
            setError(null);
          } else {
            haptic("error");
            setError(t("native.pinWrong"));
          }
        }}
      >
        {t("security.unlock")}
      </button>
    </div>
  );
}

export function PinLockSettings() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setEnabled(localStorage.getItem(PIN_LOCK) === "1");
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-mute">{t("native.pinSettingsHint")}</p>
      {enabled ? (
        <button
          type="button"
          className="rounded-xl border border-ink/[0.1] px-4 py-2 text-sm font-semibold"
          onClick={() => {
            localStorage.removeItem(PIN_LOCK);
            localStorage.removeItem(PIN_KEY);
            setEnabled(false);
            pushToast(t("security.disabled"), "ok");
          }}
        >
          {t("security.disable")}
        </button>
      ) : (
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl border border-ink/[0.1] bg-surface px-3 py-2 text-sm"
            placeholder="PIN 4–6"
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          <button
            type="button"
            disabled={draft.length < 4}
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            onClick={() => {
              localStorage.setItem(PIN_KEY, draft);
              localStorage.setItem(PIN_LOCK, "1");
              setEnabled(true);
              setDraft("");
              haptic("success");
              pushToast(t("security.enabled"), "ok");
            }}
          >
            {t("security.enable")}
          </button>
        </div>
      )}
    </div>
  );
}
