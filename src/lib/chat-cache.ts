/** Cache local chat (IndexedDB) — reopen = instantané. */

const DB_NAME = "community-chat-v1";
const STORE = "room_messages";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("no idb"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "roomId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadCachedMessages<T>(roomId: string): Promise<T[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(roomId);
      req.onsuccess = () => {
        const row = req.result as { messages?: T[] } | undefined;
        resolve(Array.isArray(row?.messages) ? row!.messages! : []);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function saveCachedMessages<T>(
  roomId: string,
  messages: T[],
): Promise<void> {
  try {
    const db = await openDb();
    const slim = messages.slice(-120);
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({
        roomId,
        messages: slim,
        updatedAt: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}
