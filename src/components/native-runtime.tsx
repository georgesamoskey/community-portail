"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  bindVisualViewport,
  clearAppBadge,
  haptic,
  isStandalone,
  networkOnline,
  requestPersistentStorage,
  setAppBadge,
} from "@/lib/native";
import { NativeToastHost, pushToast } from "@/components/native-ux";
import { useI18n } from "@/lib/i18n/context";
import { useOfflineOptional } from "@/lib/offline/context";

/** Runtime PWA : viewport, standalone, réseau, badge, stockage. */
export function NativeRuntime({ badgeCount = 0 }: { badgeCount?: number }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const offline = useOfflineOptional();
  const wasOnline = useRef(true);
  const prevPath = useRef(pathname);

  useEffect(() => {
    const root = document.documentElement;
    const syncStandalone = () => {
      if (isStandalone()) root.classList.add("akiba-standalone");
      else root.classList.remove("akiba-standalone");
    };
    syncStandalone();
    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener?.("change", syncStandalone);

    const unbind = bindVisualViewport();
    void requestPersistentStorage();

    return () => {
      unbind();
      mq.removeEventListener?.("change", syncStandalone);
    };
  }, []);

  useEffect(() => {
    void setAppBadge(badgeCount);
    return () => {
      if (badgeCount <= 0) void clearAppBadge();
    };
  }, [badgeCount]);

  useEffect(() => {
    if (
      pathname.startsWith("/app/chat") ||
      pathname.startsWith("/app/notifications")
    ) {
      void clearAppBadge();
    }
  }, [pathname]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void setAppBadge(badgeCount);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [badgeCount]);

  useEffect(() => {
    const onOnline = () => {
      if (!wasOnline.current) {
        pushToast(t("native.backOnline"), "ok");
        haptic("success");
      }
      wasOnline.current = true;
      document.documentElement.classList.remove("akiba-offline");
    };
    const onOffline = () => {
      wasOnline.current = false;
      document.documentElement.classList.add("akiba-offline");
      pushToast(t("native.wentOffline"), "warn");
      haptic("warning");
    };
    wasOnline.current = networkOnline();
    if (!wasOnline.current) {
      document.documentElement.classList.add("akiba-offline");
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [t]);

  // Toast après sync auto au retour réseau
  useEffect(() => {
    const onSync = (e: Event) => {
      const pending = (e as CustomEvent<{ pending?: number }>).detail?.pending ?? 0;
      if (pending > 0) {
        pushToast(t("native.syncDone", { n: pending }), "ok");
        haptic("success");
      }
    };
    window.addEventListener("akiba:online-sync", onSync);
    return () => window.removeEventListener("akiba:online-sync", onSync);
  }, [t]);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      haptic("selection");
      prevPath.current = pathname;
      if (!window.location.hash) {
        window.scrollTo({ top: 0 });
      }
    }
  }, [pathname]);

  // Préparer le cache offline une fois connecté en app
  useEffect(() => {
    if (!offline || !offline.online) return;
    if (!pathname.startsWith("/app")) return;
    const key = "akiba-offline-warmed";
    if (sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");
    void offline.prepare().catch(() => undefined);
  }, [offline, pathname]);

  return <NativeToastHost />;
}
