"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { cx } from "@/lib/cx";
import {
  applyTheme,
  connectionMeta,
  extractInviteFromText,
  getGeoOnce,
  getThemeMode,
  haptic,
  openCameraStream,
  registerBackgroundSync,
  registerPeriodicSync,
  scanBarcodeFromVideo,
  type ThemeMode,
} from "@/lib/native";
import { pushToast, BottomSheet } from "@/components/native-ux";

/** Thème clair / sombre / système. */
export function ThemeRuntime() {
  useEffect(() => {
    applyTheme(getThemeMode());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (getThemeMode() === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return null;
}

export function ThemeSwitcher({ compact }: { compact?: boolean }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<ThemeMode>("system");
  useEffect(() => setMode(getThemeMode()), []);
  const set = (m: ThemeMode) => {
    setMode(m);
    applyTheme(m);
    haptic("selection");
  };
  return (
    <div className={cx("flex gap-1", compact && "scale-95")}>
      {(["system", "light", "dark"] as ThemeMode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => set(m)}
          className={cx(
            "rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition",
            mode === m
              ? "bg-brand-500 text-white"
              : "bg-ink/[0.05] text-ink-mute",
          )}
        >
          {m === "system"
            ? t("native.themeSystem")
            : m === "light"
              ? t("native.themeLight")
              : t("native.themeDark")}
        </button>
      ))}
    </div>
  );
}

/** View Transitions + prefetch tactile + retour matériel. */
export function NavigationPolish() {
  const pathname = usePathname();
  const router = useRouter();
  const stack = useRef<string[]>([]);

  useEffect(() => {
    // CSS navigation transitions (Chromium)
    const style = document.createElement("style");
    style.textContent = `@view-transition { navigation: auto; }`;
    document.head.appendChild(style);

    const onTouchStart = (e: TouchEvent) => {
      const a = (e.target as Element | null)?.closest?.(
        "a[href^='/app']",
      ) as HTMLAnchorElement | null;
      if (a?.href) {
        try {
          router.prefetch(new URL(a.href).pathname);
        } catch {
          /* ignore */
        }
      }
    };
    document.addEventListener("touchstart", onTouchStart, { passive: true });

    const onPop = () => haptic("light");
    window.addEventListener("popstate", onPop);

    return () => {
      style.remove();
      document.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("popstate", onPop);
    };
  }, [router]);

  useEffect(() => {
    const prev = stack.current[stack.current.length - 1];
    if (prev !== pathname) stack.current.push(pathname);
    if (stack.current.length > 40) stack.current = stack.current.slice(-20);
  }, [pathname]);

  return null;
}

/** Clipboard invite / code collé → toast + navigation. */
export function ClipboardInviteWatcher() {
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    const onVis = async () => {
      if (document.visibilityState !== "visible") return;
      if (localStorage.getItem("akiba-clip-watch") === "0") return;
      try {
        if (!navigator.clipboard?.readText) return;
        const text = await navigator.clipboard.readText();
        const code = extractInviteFromText(text);
        if (!code) return;
        const seen = sessionStorage.getItem("akiba-clip-seen");
        if (seen === code) return;
        sessionStorage.setItem("akiba-clip-seen", code);
        pushToast(t("native.inviteDetected"), "ok");
        haptic("success");
        if (code.length >= 6) {
          window.setTimeout(() => {
            router.push(
              text.includes("/invite/")
                ? `/invite/${code}`
                : `/r/${code}`,
            );
          }, 600);
        }
      } catch {
        /* permission */
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [router, t]);

  return null;
}

/** Indicateur réseau 2g/3g/4g + data saver. */
export function NetworkQualityChip() {
  const [meta, setMeta] = useState(connectionMeta());
  useEffect(() => {
    const c = (
      navigator as Navigator & {
        connection?: EventTarget & { effectiveType?: string };
      }
    ).connection;
    const upd = () => setMeta(connectionMeta());
    c?.addEventListener?.("change", upd);
    return () => c?.removeEventListener?.("change", upd);
  }, []);
  if (meta.type === "unknown" || meta.type === "4g") return null;
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold",
        meta.type === "2g" || meta.saveData
          ? "bg-amber-100 text-amber-900"
          : "bg-ink/[0.06] text-ink-mute",
      )}
      title={meta.saveData ? "Data saver" : meta.type}
    >
      {meta.saveData ? "Data saver" : meta.type.toUpperCase()}
    </span>
  );
}

/** Sync fond + périodique au démarrage PWA. */
export function BackgroundSyncRuntime() {
  useEffect(() => {
    void registerBackgroundSync();
    void registerPeriodicSync();
  }, []);
  return null;
}

/** Auto-relock WebAuthn après idle. */
export function IdleRelock({ minutes = 5 }: { minutes?: number }) {
  useEffect(() => {
    if (localStorage.getItem("akiba-webauthn-lock") !== "1") return;
    let timer: number | null = null;
    const arm = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(
        () => {
          // Force re-check gate on next paint via storage poke
          localStorage.setItem("akiba-webauthn-idle", String(Date.now()));
          window.dispatchEvent(new Event("akiba-idle-lock"));
        },
        minutes * 60_000,
      );
    };
    const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    arm();
    return () => {
      if (timer) window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, arm));
    };
  }, [minutes]);
  return null;
}

/** Scanner QR plein écran. */
export function QrScanner({
  open,
  onClose,
  onResult,
}: {
  open: boolean;
  onClose: () => void;
  onResult: (value: string) => void;
}) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const ac = new AbortController();
    let stream: MediaStream | null = null;
    (async () => {
      stream = await openCameraStream();
      if (!stream || !videoRef.current) {
        setErr(t("native.cameraDenied"));
        return;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => undefined);
      const value = await scanBarcodeFromVideo(videoRef.current, ac.signal);
      if (value) {
        haptic("success");
        onResult(value);
        onClose();
      }
    })();
    return () => {
      ac.abort();
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [open, onClose, onResult, t]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-ink">
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <p className="font-display text-base font-bold">{t("native.scanTitle")}</p>
        <button
          type="button"
          className="rounded-xl bg-white/15 px-3 py-1.5 text-sm font-semibold"
          onClick={onClose}
        >
          {t("common.close")}
        </button>
      </div>
      <div className="relative mx-4 flex-1 overflow-hidden rounded-3xl bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-48 w-48 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
      </div>
      <p className="px-4 py-4 text-center text-sm text-white/80 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {err ?? t("native.scanHint")}
      </p>
    </div>
  );
}

export function NativeCapabilitiesSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [geo, setGeo] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const locate = useCallback(async () => {
    const g = await getGeoOnce();
    if (!g) {
      pushToast(t("native.geoDenied"), "warn");
      return;
    }
    setGeo(`${g.lat.toFixed(3)}, ${g.lng.toFixed(3)}`);
    pushToast(t("native.geoOk"), "ok");
    haptic("success");
    router.push("/app/discover");
  }, [router, t]);

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title={t("native.labTitle")}>
        <div className="space-y-2 pb-2">
          <p className="px-2 text-xs text-ink-mute">{t("native.labHint")}</p>
          <div className="rounded-2xl border border-ink/[0.06] bg-surface p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-mute">
              {t("native.theme")}
            </p>
            <ThemeSwitcher />
          </div>
          <button
            type="button"
            className="native-pressable flex w-full items-center justify-between rounded-2xl border border-ink/[0.06] bg-surface px-4 py-3.5 text-left text-sm font-semibold"
            onClick={() => {
              setScanOpen(true);
              onClose();
            }}
          >
            {t("native.scanCta")}
            <span aria-hidden>›</span>
          </button>
          <button
            type="button"
            className="native-pressable flex w-full items-center justify-between rounded-2xl border border-ink/[0.06] bg-surface px-4 py-3.5 text-left text-sm font-semibold"
            onClick={() => void locate()}
          >
            {t("native.geoCta")}
            <span aria-hidden>›</span>
          </button>
          {geo ? (
            <p className="px-2 text-xs text-ink-mute">{geo}</p>
          ) : null}
          <button
            type="button"
            className="native-pressable flex w-full items-center justify-between rounded-2xl border border-ink/[0.06] bg-surface px-4 py-3.5 text-left text-sm font-semibold"
            onClick={() => {
              onClose();
              router.push("/app/profile/edit");
            }}
          >
            {t("native.securityCta")}
            <span aria-hidden>›</span>
          </button>
        </div>
      </BottomSheet>
      <QrScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onResult={(value) => {
          const code = extractInviteFromText(value) ?? value;
          if (value.includes("/invite/")) router.push(`/invite/${code}`);
          else if (value.includes("/r/")) router.push(`/r/${code}`);
          else if (value.startsWith("http")) window.location.assign(value);
          else router.push(`/invite/${code}`);
        }}
      />
    </>
  );
}

export function NativePlusBundle({ children }: { children?: ReactNode }) {
  return (
    <>
      <ThemeRuntime />
      <NavigationPolish />
      <ClipboardInviteWatcher />
      <BackgroundSyncRuntime />
      <IdleRelock />
      {children}
    </>
  );
}
