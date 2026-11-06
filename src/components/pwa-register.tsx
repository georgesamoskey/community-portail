"use client";

import { useEffect } from "react";
import { haptic } from "@/lib/native";
import { prepareForOffline } from "@/lib/offline/sync-manager";

/** Enregistre le SW + feedback install + check update au focus. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const onInstalled = () => {
      haptic("celebrate");
      localStorage.setItem("akiba-pwa-installed", "1");
      void prepareForOffline(true).catch(() => undefined);
    };
    window.addEventListener("appinstalled", onInstalled);

    let reg: ServiceWorkerRegistration | null = null;

    if (process.env.NODE_ENV === "production") {
      void navigator.serviceWorker
        .register("/sw.js")
        .then((r) => {
          reg = r;
          // SW déjà waiting (maj précédente non appliquée)
          if (r.waiting) {
            window.dispatchEvent(
              new CustomEvent("akiba:sw-waiting", { detail: r.waiting }),
            );
          }
          r.addEventListener("updatefound", () => {
            const sw = r.installing;
            sw?.addEventListener("statechange", () => {
              if (sw.state === "installed" && navigator.serviceWorker.controller) {
                window.dispatchEvent(
                  new CustomEvent("akiba:sw-waiting", {
                    detail: r.waiting ?? sw,
                  }),
                );
              }
            });
          });
        })
        .catch(() => undefined);
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__akibaDeferredInstall = e;
      window.dispatchEvent(new CustomEvent("akiba:install-ready"));
    };
    window.addEventListener("beforeinstallprompt", onBip);

    const onFocus = () => {
      void reg?.update().catch(() => undefined);
    };
    window.addEventListener("focus", onFocus);
    const onVis = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return null;
}
