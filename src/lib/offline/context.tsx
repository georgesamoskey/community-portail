"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  enqueueCotisation,
  flushPendingSync,
  getPendingCount,
  isOnline,
  listPendingActions,
  prepareForOffline,
  startOfflineSyncRuntime,
  subscribeOfflineSync,
} from "@/lib/offline/sync-manager";
import type {
  OfflineCotisationPayload,
  PendingSyncItem,
} from "@/lib/offline/types";

type OfflineContextValue = {
  online: boolean;
  pendingCount: number;
  pending: PendingSyncItem[];
  syncing: boolean;
  enqueueCotisation: (
    payload: OfflineCotisationPayload,
    clientId?: string,
  ) => Promise<string>;
  flush: () => Promise<void>;
  prepare: () => Promise<void>;
};

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [pending, setPending] = useState<PendingSyncItem[]>([]);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setOnline(isOnline());
    const [count, list] = await Promise.all([
      getPendingCount(),
      listPendingActions(),
    ]);
    setPendingCount(count);
    setPending(list);
  }, []);

  useEffect(() => {
    const stop = startOfflineSyncRuntime();
    void refresh();
    const unsub = subscribeOfflineSync(() => {
      void refresh();
    });
    const onMsg = (event: MessageEvent) => {
      const type = (event.data as { type?: string } | null)?.type;
      if (type === "AKIBA_FLUSH_SYNC" || type === "AKIBA_PERIODIC_SYNC") {
        void flushPendingSync().then(() => refresh());
      }
    };
    navigator.serviceWorker?.addEventListener("message", onMsg);
    return () => {
      stop();
      unsub();
      navigator.serviceWorker?.removeEventListener("message", onMsg);
    };
  }, [refresh]);

  const flush = useCallback(async () => {
    setSyncing(true);
    try {
      await flushPendingSync();
      await refresh();
    } finally {
      setSyncing(false);
    }
  }, [refresh]);

  const prepare = useCallback(async () => {
    await prepareForOffline(true);
    await refresh();
  }, [refresh]);

  const value = useMemo<OfflineContextValue>(
    () => ({
      online,
      pendingCount,
      pending,
      syncing,
      enqueueCotisation,
      flush,
      prepare,
    }),
    [online, pendingCount, pending, syncing, flush, prepare],
  );

  return (
    <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
  );
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) {
    throw new Error("useOffline must be used within OfflineProvider");
  }
  return ctx;
}

/** Safe hors provider (pages marketing). */
export function useOfflineOptional(): OfflineContextValue | null {
  return useContext(OfflineContext);
}
