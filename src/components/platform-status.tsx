"use client";

import { useEffect, useState } from "react";
import { apiOrigin } from "@/lib/portal-api";

type HealthState =
  | { status: "loading" }
  | { status: "ok"; detail?: string }
  | { status: "degraded"; detail?: string }
  | { status: "down"; detail?: string };

export function PlatformStatusBanner() {
  const [state, setState] = useState<HealthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const origin = apiOrigin();
    (async () => {
      try {
        const res = await fetch(`${origin}/api/health`, {
          cache: "no-store",
        });
        if (cancelled) return;
        if (res.ok) {
          setState({ status: "ok", detail: "API opérationnelle" });
        } else {
          setState({
            status: "degraded",
            detail: `API HTTP ${res.status}`,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setState({
            status: "down",
            detail: e instanceof Error ? e.message : "Injoignable",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tone =
    state.status === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : state.status === "loading"
        ? "border-ink-100 bg-white text-ink-700"
        : state.status === "degraded"
          ? "border-amber-200 bg-amber-50 text-amber-950"
          : "border-rose-200 bg-rose-50 text-rose-900";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${tone}`}>
      <span className="font-medium">Statut plateforme · </span>
      {state.status === "loading"
        ? "Vérification…"
        : state.detail ?? state.status}
    </div>
  );
}
