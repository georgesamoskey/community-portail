"use client";

import { useEffect, useRef, useState } from "react";
import { bffFetch } from "@/lib/bff-fetch";
import type { TrustSignals } from "@/components/member-trust-badge";

/** Charge les signaux de confiance pour une liste d’userIds (batch). */
export function useTrustBatch(userIds: Array<string | undefined | null>) {
  const [trustByUser, setTrustByUser] = useState<Record<string, TrustSignals>>(
    {},
  );
  const cacheRef = useRef<Record<string, TrustSignals>>({});

  const key = userIds
    .filter((id): id is string => !!id)
    .sort()
    .join(",");

  useEffect(() => {
    const ids = key ? key.split(",") : [];
    if (!ids.length) return;
    const missing = ids.filter((id) => !cacheRef.current[id]);
    if (!missing.length) {
      setTrustByUser({ ...cacheRef.current });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await bffFetch<Record<string, TrustSignals>>(
          `/engagement/trust/batch?ids=${missing.slice(0, 60).join(",")}`,
        );
        if (cancelled || !data || typeof data !== "object") return;
        cacheRef.current = { ...cacheRef.current, ...data };
        setTrustByUser({ ...cacheRef.current });
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return trustByUser;
}
