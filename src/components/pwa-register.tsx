"use client";

import { useEffect } from "react";

/** Enregistre le SW généré par next-pwa (prod). */
export function PwaRegister() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }
    void navigator.serviceWorker
      .register("/sw.js")
      .catch(() => undefined);
  }, []);
  return null;
}
