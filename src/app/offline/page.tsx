"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { haptic } from "@/lib/native";

export default function OfflinePage() {
  const { t } = useI18n();
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? false : navigator.onLine,
  );

  useEffect(() => {
    const go = () => {
      setOnline(true);
      haptic("success");
      window.setTimeout(() => {
        window.location.href = "/app";
      }, 600);
    };
    const off = () => setOnline(false);
    window.addEventListener("online", go);
    window.addEventListener("offline", off);
    if (navigator.onLine) {
      // Déjà online (cache hit SW) — tenter retour
      window.setTimeout(() => {
        window.location.href = "/app";
      }, 400);
    }
    return () => {
      window.removeEventListener("online", go);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon-192.png"
        alt=""
        width={72}
        height={72}
        className="mb-6 rounded-2xl shadow-lift"
      />
      <h1 className="font-display text-2xl font-bold text-ink">
        {online ? t("pwa.offlineBack") : t("pwa.offlineTitle")}
      </h1>
      <p className="mt-3 text-sm text-ink-mute">
        {online ? t("pwa.offlineReconnecting") : t("pwa.offlineBody")}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            haptic("medium");
            window.location.reload();
          }}
          className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-lift native-pressable"
        >
          {t("pwa.offlineRetry")}
        </button>
        <Link
          href="/app"
          className="rounded-xl border border-ink/[0.1] bg-surface px-5 py-2.5 text-sm font-semibold text-ink"
        >
          {t("nav.home")}
        </Link>
      </div>
    </main>
  );
}
