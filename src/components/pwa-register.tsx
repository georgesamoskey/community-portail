"use client";

import { useEffect } from "react";
import { haptic } from "@/lib/native";

/** Enregistre le SW + feedback install + check update au focus. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const onInstalled = () => haptic("success");
    window.addEventListener("appinstalled", onInstalled);

    let reg: ServiceWorkerRegistration | null = null;

    if (process.env.NODE_ENV === "production") {
      void navigator.serviceWorker
        .register("/sw.js")
        .then((r) => {
          reg = r;
        })
        .catch(() => undefined);
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__akibaDeferredInstall = e;
    };
    window.addEventListener("beforeinstallprompt", onBip);

    const onFocus = () => {
      void reg?.update();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") onFocus();
    });

    return () => {
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
  return null;
}
