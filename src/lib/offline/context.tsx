"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { flushChatOutbox } from "@/lib/flush-chat-outbox";
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
  const flushing = useRef(false);

  const refresh = useCallback(async () => {
    setOnline(isOnline());
    const [count, list] = await Promise.all([
      getPendingCount(),
      listPendingActions(),
    ]);
    setPendingCount(count);
    setPending(list);
  }, []);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    setSyncing(true);
    try {
      await flushPendingSync({ includeFailed: true });
      await flushChatOutbox();
      await refresh();
    } finally {
      setSyncing(false);
      flushing.current = false;
    }
  }, [refresh]);

  useEffect(() => {
    const stop = startOfflineSyncRuntime();
    void refresh();
    const unsub = subscribeOfflineSync(() => {
      void refresh();
    });
    const onMsg = (event: MessageEvent) => {
      const type = (event.data as { type?: string } | null)?.type;
      if (type === "AKIBA_FLUSH_SYNC" || type === "AKIBA_PERIODIC_SYNC") {
        void flush();
      }
    };
    navigator.serviceWorker?.addEventListener("message", onMsg);

    const onOnline = () => {
      setOnline(true);
      void (async () => {
        const count = await getPendingCount();
        if (count > 0) await flush();
        else await refresh();
        window.dispatchEvent(
          new CustomEvent("akiba:online-sync", { detail: { pending: count } }),
        );
      })();
    };
    const onOffline = () => {
      setOnline(false);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      stop();
      unsub();
      navigator.serviceWorker?.removeEventListener("message", onMsg);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refresh, flush]);

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
