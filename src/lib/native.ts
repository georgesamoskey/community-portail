/** Capacité natives navigateur — PWA Android / iOS / desktop. */

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const ios =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || ios || document.referrer.startsWith("android-app://");
}

export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0
  );
}

export type HapticKind =
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error"
  | "selection"
  | "celebrate";

export function haptic(kind: HapticKind = "light"): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const map: Record<HapticKind, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: 35,
      selection: 8,
      success: [12, 40, 12],
      warning: [20, 30, 20],
      error: [40, 40, 40],
      celebrate: [15, 40, 15, 40, 30],
    };
    void navigator.vibrate(map[kind]);
  } catch {
    /* ignore */
  }
}

export async function nativeShare(input: {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}): Promise<"shared" | "copied" | "aborted" | "failed"> {
  const payload = {
    title: input.title ?? "Akiba One",
    text: input.text,
    url: input.url,
  };
  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      const data: ShareData = {};
      if (payload.title) data.title = payload.title;
      if (payload.text) data.text = payload.text;
      if (payload.url) data.url = payload.url;
      if (input.files?.length) data.files = input.files;
      const can =
        typeof navigator.canShare !== "function" || navigator.canShare(data);
      if (can) {
        await navigator.share(data);
        haptic("success");
        return "shared";
      }
    }
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return "aborted";
  }
  const full = [payload.text, payload.url].filter(Boolean).join("\n");
  try {
    await navigator.clipboard.writeText(full || payload.title || "");
    haptic("light");
    return "copied";
  } catch {
    return "failed";
  }
}

export async function setAppBadge(count: number): Promise<void> {
  try {
    if (!("setAppBadge" in navigator)) return;
    if (count > 0) await navigator.setAppBadge(count);
    else await navigator.clearAppBadge?.();
  } catch {
    /* ignore */
  }
}

export async function clearAppBadge(): Promise<void> {
  try {
    await navigator.clearAppBadge?.();
  } catch {
    /* ignore */
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

let wakeLock: WakeLockSentinel | null = null;

export async function acquireWakeLock(): Promise<boolean> {
  try {
    if (!("wakeLock" in navigator)) return false;
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
    });
    return true;
  } catch {
    return false;
  }
}

export async function releaseWakeLock(): Promise<void> {
  try {
    await wakeLock?.release();
  } catch {
    /* ignore */
  } finally {
    wakeLock = null;
  }
}

export function networkOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function connectionType(): string {
  const c = (
    navigator as Navigator & {
      connection?: { effectiveType?: string; saveData?: boolean; downlink?: number };
    }
  ).connection;
  return c?.effectiveType ?? "unknown";
}

export function connectionMeta(): {
  type: string;
  saveData: boolean;
  downlink: number | null;
} {
  const c = (
    navigator as Navigator & {
      connection?: { effectiveType?: string; saveData?: boolean; downlink?: number };
    }
  ).connection;
  return {
    type: c?.effectiveType ?? "unknown",
    saveData: Boolean(c?.saveData),
    downlink: typeof c?.downlink === "number" ? c.downlink : null,
  };
}

export function bindVisualViewport(): () => void {
  if (typeof window === "undefined") return () => undefined;
  const root = document.documentElement;
  const apply = () => {
    const vv = window.visualViewport;
    const h = vv?.height ?? window.innerHeight;
    root.style.setProperty("--app-vh", `${h * 0.01}px`);
    root.style.setProperty("--vv-offset-top", `${vv?.offsetTop ?? 0}px`);
    root.style.setProperty(
      "--keyboard-inset",
      `${Math.max(0, window.innerHeight - h - (vv?.offsetTop ?? 0))}px`,
    );
  };
  apply();
  window.visualViewport?.addEventListener("resize", apply);
  window.visualViewport?.addEventListener("scroll", apply);
  window.addEventListener("resize", apply);
  return () => {
    window.visualViewport?.removeEventListener("resize", apply);
    window.visualViewport?.removeEventListener("scroll", apply);
    window.removeEventListener("resize", apply);
  };
}

export type ThemeMode = "system" | "light" | "dark";
const THEME_KEY = "akiba-theme";

export function getThemeMode(): ThemeMode {
  if (typeof localStorage === "undefined") return "system";
  const v = localStorage.getItem(THEME_KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  localStorage.setItem(THEME_KEY, mode);
  const dark =
    mode === "dark" ||
    (mode === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#0b1a2b" : "#337AB7");
}

export async function lockPortrait(): Promise<boolean> {
  try {
    const o = screen.orientation as ScreenOrientation & {
      lock?: (o: string) => Promise<void>;
    };
    await o.lock?.("portrait");
    return true;
  } catch {
    return false;
  }
}

export async function requestFullscreen(el?: Element): Promise<boolean> {
  try {
    const node = el ?? document.documentElement;
    if (!document.fullscreenElement) {
      await (node as HTMLElement).requestFullscreen?.();
      haptic("medium");
      return true;
    }
    await document.exitFullscreen();
    return false;
  } catch {
    return false;
  }
}

export async function getGeoOnce(): Promise<{
  lat: number;
  lng: number;
} | null> {
  if (!navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 120_000 },
    );
  });
}

export async function pickContacts(
  multiple = true,
): Promise<Array<{ name?: string; tel?: string[] }> | null> {
  const nav = navigator as Navigator & {
    contacts?: {
      select: (
        props: string[],
        opts: { multiple: boolean },
      ) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
    };
  };
  if (!nav.contacts?.select) return null;
  try {
    const rows = await nav.contacts.select(["name", "tel"], { multiple });
    return rows.map((r) => ({
      name: r.name?.[0],
      tel: r.tel,
    }));
  } catch {
    return null;
  }
}

export async function scanBarcodeFromVideo(
  video: HTMLVideoElement,
  signal?: AbortSignal,
): Promise<string | null> {
  const BD = (
    window as unknown as {
      BarcodeDetector?: new (o: { formats: string[] }) => {
        detect: (s: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
      };
    }
  ).BarcodeDetector;
  if (!BD) return null;
  const detector = new BD({
    formats: ["qr_code", "aztec", "data_matrix"],
  });
  while (!signal?.aborted) {
    try {
      const codes = await detector.detect(video);
      if (codes[0]?.rawValue) return codes[0].rawValue;
    } catch {
      /* keep scanning */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

export async function openCameraStream(): Promise<MediaStream | null> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
  } catch {
    return null;
  }
}

export function setMediaSession(meta: {
  title: string;
  artist?: string;
  artwork?: string;
  onPlay?: () => void;
  onPause?: () => void;
}): void {
  if (!("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: meta.title,
      artist: meta.artist ?? "Akiba One",
      artwork: meta.artwork
        ? [{ src: meta.artwork, sizes: "192x192", type: "image/png" }]
        : [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    });
    if (meta.onPlay) {
      navigator.mediaSession.setActionHandler("play", meta.onPlay);
    }
    if (meta.onPause) {
      navigator.mediaSession.setActionHandler("pause", meta.onPause);
    }
  } catch {
    /* ignore */
  }
}

export async function registerBackgroundSync(): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator) || !("SyncManager" in window)) return false;
    const reg = await navigator.serviceWorker.ready;
    const syncReg = reg as ServiceWorkerRegistration & {
      sync?: { register: (tag: string) => Promise<void> };
    };
    await syncReg.sync?.register("akiba-offline-sync");
    return true;
  } catch {
    return false;
  }
}

export async function registerPeriodicSync(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const ps = reg as ServiceWorkerRegistration & {
      periodicSync?: {
        register: (tag: string, opts: { minInterval: number }) => Promise<void>;
      };
    };
    if (!ps.periodicSync) return false;
    await ps.periodicSync.register("akiba-periodic-sync", {
      minInterval: 12 * 60 * 60 * 1000,
    });
    return true;
  } catch {
    return false;
  }
}

export async function saveBlobNative(
  blob: Blob,
  filename: string,
): Promise<boolean> {
  try {
    const anyWin = window as unknown as {
      showSaveFilePicker?: (o: {
        suggestedName: string;
      }) => Promise<{ createWritable: () => Promise<{ write: (b: Blob) => Promise<void>; close: () => Promise<void> }> }>;
    };
    if (anyWin.showSaveFilePicker) {
      const handle = await anyWin.showSaveFilePicker({ suggestedName: filename });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      haptic("success");
      return true;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

export function extractInviteFromText(text: string): string | null {
  const url =
    text.match(/https?:\/\/[^\s]+\/(?:invite|r)\/([A-Za-z0-9_-]+)/i) ||
    text.match(/(?:invite|code)[=:\s]+([A-Za-z0-9_-]{4,})/i);
  if (url?.[1]) return url[1];
  const bare = text.trim();
  if (/^[A-Za-z0-9_-]{6,24}$/.test(bare)) return bare;
  return null;
}

export function navigateWithViewTransition(href: string): void {
  const go = () => {
    window.location.assign(href);
  };
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => void;
  };
  if (typeof doc.startViewTransition === "function") {
    doc.startViewTransition(go);
  } else {
    go();
  }
}

export function celebrate(): void {
  haptic("celebrate");
  document.documentElement.classList.add("akiba-celebrate");
  window.setTimeout(() => {
    document.documentElement.classList.remove("akiba-celebrate");
  }, 900);
}
