/** Cache local des réponses BFF GET (lecture hors ligne). */

const DB_NAME = "akiba-bff-cache-v1";
const STORE = "responses";
const MAX_AGE_MS = 7 * 24 * 3600 * 1000;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB indisponible"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "path" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("openDb"));
  });
}

export async function cacheBffGet(path: string, data: unknown): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ path, data, at: Date.now() });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}

export async function readCachedBffGet<T>(path: string): Promise<T | null> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(path);
    const row = await new Promise<{ data?: T; at?: number } | undefined>(
      (resolve, reject) => {
        req.onsuccess = () => resolve(req.result as { data?: T; at?: number });
        req.onerror = () => reject(req.error);
      },
    );
    db.close();
    if (!row?.data || !row.at || Date.now() - row.at > MAX_AGE_MS) return null;
    return row.data;
  } catch {
    return null;
  }
}
