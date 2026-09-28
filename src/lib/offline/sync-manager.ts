/**
 * Source de vérité file hors-ligne (parité OfflineSyncManager Android).
 * - enqueue cotisations → IndexedDB
 * - flush via POST /regional/offline/sync (+ checksum MD5)
 * - prepare via POST /regional/offline/prepare au retour réseau
 */

import { bffFetch, BffError } from "@/lib/bff-fetch";
import { checksumForData } from "./checksum";
import {
  countPending,
  deletePending,
  gcPending,
  getLastPrepareMeta,
  listPending,
  markPendingFailed,
  savePreparedBundle,
  upsertPending,
} from "./db";
import {
  ACTION_CREATE,
  TYPE_COTISATION,
  type OfflineBundleItem,
  type OfflineCotisationPayload,
  type OfflinePrepareResponse,
  type OfflineSyncResponse,
  type PendingSyncItem,
} from "./types";

const PREPARE_MIN_INTERVAL_MS = 5 * 60 * 1000;
const PERIODIC_FLUSH_MS = 15 * 60 * 1000;

type Listener = () => void;

let flushing = false;
let started = false;
let periodicTimer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<Listener>();

function notify() {
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* ignore */
    }
  }
}

export function subscribeOfflineSync(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueueCotisation(
  payload: OfflineCotisationPayload,
  clientId?: string,
): Promise<string> {
  const id = newId();
  const now = Date.now();
  const item: PendingSyncItem = {
    id,
    entityType: TYPE_COTISATION,
    actionType: ACTION_CREATE,
    payload: JSON.stringify(payload),
    clientId: clientId ?? id,
    status: "pending",
    attempts: 0,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  };
  await upsertPending(item);
  notify();
  if (isOnline()) {
    void flushPendingSync();
  }
  return id;
}

function parseCotisationPayload(
  raw: string,
): OfflineCotisationPayload | null {
  try {
    const p = JSON.parse(raw) as OfflineCotisationPayload;
    if (!p?.contributionId || typeof p.montant !== "number") return null;
    return p;
  } catch {
    return null;
  }
}

async function syncCotisationBatch(
  actions: PendingSyncItem[],
): Promise<{ okIds: string[]; failed: Array<{ id: string; error: string; permanent: boolean }> }> {
  const items: OfflineBundleItem[] = [];
  const byLocalId = new Map<string, PendingSyncItem>();
  const invalid: Array<{ id: string; error: string; permanent: boolean }> = [];

  for (const action of actions) {
    if (action.actionType !== ACTION_CREATE) {
      invalid.push({
        id: action.id,
        error: "Action non supportée",
        permanent: true,
      });
      continue;
    }
    const payload = parseCotisationPayload(action.payload);
    if (!payload) {
      invalid.push({
        id: action.id,
        error: "Payload invalide",
        permanent: true,
      });
      continue;
    }
    const localId = action.clientId?.trim() || action.id;
    byLocalId.set(localId, action);
    items.push({
      type: "cotisation",
      id: localId,
      updatedAt: new Date().toISOString(),
      operation: "create",
      payload,
    });
  }

  if (items.length === 0) {
    return { okIds: [], failed: invalid };
  }

  const checksum = checksumForData(items);
  try {
    const response = await bffFetch<OfflineSyncResponse>(
      "/regional/offline/sync",
      {
        method: "POST",
        body: JSON.stringify({ data: items, checksum }),
      },
    );

    const okIds: string[] = [];
    const failed = [...invalid];
    const mmIds: string[] = [];

    for (const result of response.results ?? []) {
      const action = byLocalId.get(result.localId);
      if (!action) continue;
      if (result.status === "synced" || result.status === "skipped") {
        okIds.push(action.id);
        const isMm =
          items.find((i) => i.id === result.localId)?.payload.paymentMethod
            ?.toLowerCase() === "mobile_money";
        if (isMm && result.cotisationId) mmIds.push(result.cotisationId);
      } else if (result.status === "conflict") {
        failed.push({
          id: action.id,
          error: result.error || "Conflit de synchronisation",
          permanent: true,
        });
      } else {
        failed.push({
          id: action.id,
          error: result.error || "Échec sync",
          permanent: false,
        });
      }
    }

    for (const action of actions) {
      if (
        !okIds.includes(action.id) &&
        !failed.some((f) => f.id === action.id)
      ) {
        failed.push({
          id: action.id,
          error: "Réponse sync absente",
          permanent: true,
        });
      }
    }

    if (mmIds.length > 0) {
      void bffFetch("/regional/offline/mobile-money/refresh", {
        method: "POST",
        body: JSON.stringify({ cotisationIds: [...new Set(mmIds)].slice(0, 50) }),
      }).catch(() => undefined);
    }

    return { okIds, failed };
  } catch (e) {
    const msg = e instanceof BffError ? e.message : (e as Error).message;
    const permanent =
      e instanceof BffError && e.status >= 400 && e.status < 500 && e.status !== 0;
    return {
      okIds: [],
      failed: [
        ...invalid,
        ...actions.map((a) => ({
          id: a.id,
          error: msg || "Erreur réseau",
          permanent,
        })),
      ],
    };
  }
}

export async function flushPendingSync(): Promise<{
  synced: number;
  failed: number;
}> {
  if (flushing || !isOnline()) return { synced: 0, failed: 0 };
  flushing = true;
  let synced = 0;
  let failed = 0;
  try {
    await gcPending();
    const all = await listPending();
    const cotisations = all.filter((a) => a.entityType === TYPE_COTISATION);
    if (cotisations.length === 0) return { synced: 0, failed: 0 };

    for (const a of cotisations) {
      await upsertPending({ ...a, status: "syncing", updatedAt: Date.now() });
    }
    notify();

    const result = await syncCotisationBatch(cotisations);
    for (const id of result.okIds) {
      await deletePending(id);
      synced++;
    }
    for (const f of result.failed) {
      await markPendingFailed(f.id, f.error);
      if (f.permanent) {
        /* leave as failed for UI */
      }
      failed++;
    }
    notify();
    return { synced, failed };
  } finally {
    flushing = false;
  }
}

export async function prepareForOffline(force = false): Promise<number> {
  if (!isOnline()) return 0;
  if (!force) {
    const meta = await getLastPrepareMeta();
    if (meta && Date.now() - meta.at < PREPARE_MIN_INTERVAL_MS) {
      return meta.count;
    }
  }
  try {
    const res = await bffFetch<OfflinePrepareResponse>(
      "/regional/offline/prepare",
      {
        method: "POST",
        body: JSON.stringify({
          dataTypes: ["contribution", "cotisation", "tontine", "message"],
          options: { days: 30 },
        }),
      },
    );
    const data = res.data ?? [];
    await savePreparedBundle(data);
    notify();
    return data.length;
  } catch {
    return 0;
  }
}

export async function getPendingCount(): Promise<number> {
  return countPending();
}

export async function listPendingActions(): Promise<PendingSyncItem[]> {
  return listPending();
}

/** Démarre observe réseau + flush périodique (comme WorkManager 15 min). */
export function startOfflineSyncRuntime(): () => void {
  if (typeof window === "undefined" || started) {
    return () => undefined;
  }
  started = true;

  const onOnline = () => {
    void flushPendingSync().then(() => prepareForOffline());
  };
  const onOffline = () => notify();

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  if (isOnline()) {
    void flushPendingSync().then(() => prepareForOffline());
  }

  periodicTimer = setInterval(() => {
    if (isOnline()) void flushPendingSync();
  }, PERIODIC_FLUSH_MS);

  // Background Sync API (Chrome / Android PWA)
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    void navigator.serviceWorker.ready
      .then((reg) => {
        const syncReg = reg as ServiceWorkerRegistration & {
          sync?: { register: (tag: string) => Promise<void> };
        };
        return syncReg.sync?.register("akiba-offline-sync");
      })
      .catch(() => undefined);
  }

  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    if (periodicTimer) clearInterval(periodicTimer);
    periodicTimer = null;
    started = false;
  };
}
