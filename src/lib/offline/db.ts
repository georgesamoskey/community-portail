/** IndexedDB file de sync + cache prepare (parité Room Android). */

import type { PendingSyncItem, PreparedBundleItem } from "./types";

const DB_NAME = "akiba-offline-v1";
const DB_VERSION = 1;
const PENDING = "pending_sync";
const PREPARED = "prepared_bundle";
const META = "meta";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB indisponible"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PENDING)) {
        const store = db.createObjectStore(PENDING, { keyPath: "id" });
        store.createIndex("by_status", "status", { unique: false });
        store.createIndex("by_entity", "entityType", { unique: false });
      }
      if (!db.objectStoreNames.contains(PREPARED)) {
        const store = db.createObjectStore(PREPARED, { keyPath: "key" });
        store.createIndex("by_type", "type", { unique: false });
      }
      if (!db.objectStoreNames.contains(META)) {
        db.createObjectStore(META, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("openDb failed"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("tx error"));
    tx.onabort = () => reject(tx.error ?? new Error("tx abort"));
  });
}

export async function upsertPending(item: PendingSyncItem): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(PENDING, "readwrite");
  tx.objectStore(PENDING).put(item);
  await txDone(tx);
  db.close();
}

export async function listPending(): Promise<PendingSyncItem[]> {
  const db = await openDb();
  const tx = db.transaction(PENDING, "readonly");
  const req = tx.objectStore(PENDING).getAll();
  const rows = await new Promise<PendingSyncItem[]>((resolve, reject) => {
    req.onsuccess = () => resolve((req.result as PendingSyncItem[]) || []);
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
  db.close();
  return rows.sort((a, b) => a.createdAt - b.createdAt);
}

export async function countPending(): Promise<number> {
  const rows = await listPending();
  return rows.filter((r) => r.status !== "failed" || r.attempts < 10).length;
}

export async function deletePending(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(PENDING, "readwrite");
  tx.objectStore(PENDING).delete(id);
  await txDone(tx);
  db.close();
}

export async function markPendingFailed(
  id: string,
  error: string,
): Promise<void> {
  const rows = await listPending();
  const item = rows.find((r) => r.id === id);
  if (!item) return;
  await upsertPending({
    ...item,
    status: "failed",
    attempts: item.attempts + 1,
    lastError: error.slice(0, 280),
    updatedAt: Date.now(),
  });
}

export async function gcPending(opts?: {
  maxAttempts?: number;
  maxAgeMs?: number;
}): Promise<void> {
  const maxAttempts = opts?.maxAttempts ?? 10;
  const maxAgeMs = opts?.maxAgeMs ?? 7 * 24 * 3600 * 1000;
  const cutoff = Date.now() - maxAgeMs;
  const rows = await listPending();
  for (const row of rows) {
    if (row.attempts >= maxAttempts || row.createdAt < cutoff) {
      await deletePending(row.id);
    }
  }
}

export async function savePreparedBundle(
  items: PreparedBundleItem[],
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([PREPARED, META], "readwrite");
  const store = tx.objectStore(PREPARED);
  // Remplace le bundle : clear puis insert
  store.clear();
  for (const item of items) {
    store.put({
      key: `${item.type}:${item.id}`,
      type: item.type,
      id: item.id,
      updatedAt: item.updatedAt,
      data: item.data,
    });
  }
  tx.objectStore(META).put({
    key: "last_prepare",
    at: Date.now(),
    count: items.length,
  });
  await txDone(tx);
  db.close();
}

export async function loadPreparedByType(
  type: string,
): Promise<PreparedBundleItem[]> {
  const db = await openDb();
  const tx = db.transaction(PREPARED, "readonly");
  const store = tx.objectStore(PREPARED);
  const idx = store.index("by_type");
  const req = idx.getAll(type);
  const rows = await new Promise<
    Array<{
      key: string;
      type: string;
      id: string;
      updatedAt: string;
      data?: unknown;
    }>
  >((resolve, reject) => {
    req.onsuccess = () =>
      resolve(
        (req.result as Array<{
          key: string;
          type: string;
          id: string;
          updatedAt: string;
          data?: unknown;
        }>) || [],
      );
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
  db.close();
  return rows.map(({ type: t, id, updatedAt, data }) => ({
    type: t,
    id,
    updatedAt,
    data,
  }));
}

export async function getLastPrepareMeta(): Promise<{
  at: number;
  count: number;
} | null> {
  const db = await openDb();
  const tx = db.transaction(META, "readonly");
  const req = tx.objectStore(META).get("last_prepare");
  const row = await new Promise<{ at?: number; count?: number } | undefined>(
    (resolve, reject) => {
      req.onsuccess = () => resolve(req.result as { at?: number; count?: number });
      req.onerror = () => reject(req.error);
    },
  );
  await txDone(tx);
  db.close();
  if (!row?.at) return null;
  return { at: row.at, count: row.count ?? 0 };
}
