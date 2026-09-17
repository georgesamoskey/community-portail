/** Cache IndexedDB messages + outbox texte/PJ + Cache API blobs + cursor sync. */

import { bffApi } from "@/lib/bff";

const DB_NAME = "community-chat-v3";
const LEGACY_DB_NAME = "community-chat-v2";
const STORE = "room_messages";
const OUTBOX = "outbox";
const CURSORS = "mesh_cursors";
const MEDIA_CACHE = "community-chat-media-v1";

/** Quota soft Cache API médias (octets approximatifs). */
const MEDIA_CACHE_MAX_BYTES = 80 * 1024 * 1024;

let migrateOnce: Promise<void> | null = null;

/**
 * Passage community-chat-v2 → v3 : copie best-effort des stores.
 * Si v2 absent ou illisible, v3 démarre vide (outbox/cursors OK).
 */
function migrateFromV2Once(): Promise<void> {
  if (migrateOnce) return migrateOnce;
  migrateOnce = (async () => {
    if (typeof indexedDB === "undefined") return;
    const legacy = await new Promise<IDBDatabase | null>((resolve) => {
      try {
        const req = indexedDB.open(LEGACY_DB_NAME);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onupgradeneeded = () => {
          /* ne pas créer de stores v2 */
        };
      } catch {
        resolve(null);
      }
    });
    if (!legacy) return;

    const readAll = <T,>(storeName: string): Promise<T[]> =>
      new Promise((resolve) => {
        if (!legacy.objectStoreNames.contains(storeName)) {
          resolve([]);
          return;
        }
        try {
          const tx = legacy.transaction(storeName, "readonly");
          const req = tx.objectStore(storeName).getAll();
          req.onsuccess = () => resolve((req.result as T[]) || []);
          req.onerror = () => resolve([]);
        } catch {
          resolve([]);
        }
      });

    const [rooms, outbox, cursors] = await Promise.all([
      readAll<Record<string, unknown>>(STORE),
      readAll<Record<string, unknown>>(OUTBOX),
      readAll<Record<string, unknown>>(CURSORS),
    ]);
    legacy.close();

    if (rooms.length === 0 && outbox.length === 0 && cursors.length === 0) {
      try {
        indexedDB.deleteDatabase(LEGACY_DB_NAME);
      } catch {
        /* ignore */
      }
      return;
    }

    const v3 = await openDbRaw();
    await new Promise<void>((resolve) => {
      try {
        const names = [STORE, OUTBOX, CURSORS].filter((n) =>
          v3.objectStoreNames.contains(n),
        );
        if (names.length === 0) {
          resolve();
          return;
        }
        const tx = v3.transaction(names, "readwrite");
        for (const row of rooms) {
          if (row && typeof row === "object" && "roomId" in row) {
            tx.objectStore(STORE).put(row);
          }
        }
        for (const row of outbox) {
          if (row && typeof row === "object" && "clientMessageId" in row) {
            tx.objectStore(OUTBOX).put(row);
          }
        }
        for (const row of cursors) {
          if (row && typeof row === "object" && "roomId" in row) {
            tx.objectStore(CURSORS).put(row);
          }
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
    v3.close();

    try {
      indexedDB.deleteDatabase(LEGACY_DB_NAME);
    } catch {
      /* ignore */
    }
  })().catch(() => {
    /* migration non critique */
  });
  return migrateOnce;
}

function openDbRaw(): Promise<IDBDatabase> {
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
      if (!db.objectStoreNames.contains(OUTBOX)) {
        db.createObjectStore(OUTBOX, { keyPath: "clientMessageId" });
      }
      if (!db.objectStoreNames.contains(CURSORS)) {
        db.createObjectStore(CURSORS, { keyPath: "roomId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function openDb(): Promise<IDBDatabase> {
  await migrateFromV2Once();
  return openDbRaw();
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

export type ChatOutboxItem = {
  clientMessageId: string;
  roomId: string;
  kind: "text" | "file";
  content: string;
  replyToId?: string | null;
  createdAt: string;
  attempts: number;
  /** PJ : métadonnées + octets base64 (outbox offline). */
  fileName?: string;
  mimeType?: string;
  fileBase64?: string;
};

export async function enqueueChatOutbox(item: ChatOutboxItem): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(OUTBOX, "readwrite");
      tx.objectStore(OUTBOX).put({ ...item, kind: item.kind || "text" });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

export async function listChatOutbox(): Promise<ChatOutboxItem[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(OUTBOX, "readonly");
      const req = tx.objectStore(OUTBOX).getAll();
      req.onsuccess = () =>
        resolve(((req.result as ChatOutboxItem[]) || []).map((i) => ({
          ...i,
          kind: i.kind || "text",
        })));
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function removeChatOutbox(clientMessageId: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(OUTBOX, "readwrite");
      tx.objectStore(OUTBOX).delete(clientMessageId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

export async function bumpOutboxAttempt(clientMessageId: string): Promise<void> {
  const all = await listChatOutbox();
  const hit = all.find((i) => i.clientMessageId === clientMessageId);
  if (!hit) return;
  await enqueueChatOutbox({ ...hit, attempts: (hit.attempts || 0) + 1 });
}

export async function outboxFailureStats(): Promise<{
  pending: number;
  withAttempts: number;
}> {
  const all = await listChatOutbox();
  return {
    pending: all.length,
    withAttempts: all.filter((i) => (i.attempts || 0) > 0).length,
  };
}

export async function getMeshCursor(roomId: string): Promise<string | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(CURSORS, "readonly");
      const req = tx.objectStore(CURSORS).get(roomId);
      req.onsuccess = () => {
        const row = req.result as { cursor?: string } | undefined;
        resolve(row?.cursor ?? null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setMeshCursor(
  roomId: string,
  cursor: string | null,
): Promise<void> {
  if (!cursor) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(CURSORS, "readwrite");
      tx.objectStore(CURSORS).put({ roomId, cursor, updatedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

function mediaKey(roomId: string, messageId: string): string {
  return `chat-media:${roomId}:${messageId}`;
}

function resolveMediaFetchUrl(url: string): string {
  if (url.startsWith("http")) return url;
  const path = url.replace(/^\/api/, "");
  return bffApi(path.startsWith("/") ? path : `/${path}`);
}

export async function cacheChatMedia(
  roomId: string,
  messageId: string,
  url: string,
): Promise<string | null> {
  if (typeof caches === "undefined" || !url) return null;
  try {
    const key = mediaKey(roomId, messageId);
    const cache = await caches.open(MEDIA_CACHE);
    const fetchUrl = resolveMediaFetchUrl(url);
    const res = await fetch(fetchUrl, { credentials: "include" });
    if (!res.ok) return null;
    const blob = await res.blob();
    await cache.put(key, new Response(blob.clone(), { headers: res.headers }));
    void gcMediaCache();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export async function putLocalMediaBlob(
  roomId: string,
  messageId: string,
  blob: Blob,
): Promise<string | null> {
  if (typeof caches === "undefined") return null;
  try {
    const cache = await caches.open(MEDIA_CACHE);
    await cache.put(
      mediaKey(roomId, messageId),
      new Response(blob, {
        headers: { "Content-Type": blob.type || "application/octet-stream" },
      }),
    );
    void gcMediaCache();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export async function getCachedChatMediaUrl(
  roomId: string,
  messageId: string,
): Promise<string | null> {
  const blob = await getCachedChatMediaBlob(roomId, messageId);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

/** Blob brut du cache (re-share restore-media). */
export async function getCachedChatMediaBlob(
  roomId: string,
  messageId: string,
): Promise<Blob | null> {
  if (typeof caches === "undefined") return null;
  try {
    const cache = await caches.open(MEDIA_CACHE);
    const hit = await cache.match(mediaKey(roomId, messageId));
    if (!hit) return null;
    return await hit.blob();
  } catch {
    return null;
  }
}

/** GC FIFO approximatif si le cache médias dépasse le quota. */
export async function gcMediaCache(
  maxBytes: number = MEDIA_CACHE_MAX_BYTES,
): Promise<{ deleted: number; bytesApprox: number }> {
  if (typeof caches === "undefined") return { deleted: 0, bytesApprox: 0 };
  try {
    const cache = await caches.open(MEDIA_CACHE);
    const keys = await cache.keys();
    const entries: { req: Request; size: number; date: number }[] = [];
    let total = 0;
    for (const req of keys) {
      const res = await cache.match(req);
      if (!res) continue;
      const buf = await res.clone().arrayBuffer();
      const size = buf.byteLength;
      total += size;
      const dateHdr = res.headers.get("date");
      entries.push({
        req,
        size,
        date: dateHdr ? Date.parse(dateHdr) || 0 : 0,
      });
    }
    if (total <= maxBytes) return { deleted: 0, bytesApprox: total };
    entries.sort((a, b) => a.date - b.date);
    let deleted = 0;
    for (const e of entries) {
      if (total <= maxBytes) break;
      await cache.delete(e.req);
      total -= e.size;
      deleted += 1;
    }
    return { deleted, bytesApprox: total };
  } catch {
    return { deleted: 0, bytesApprox: 0 };
  }
}

type Mediaish = {
  id?: string;
  roomId?: string;
  media?: {
    url?: string | null;
    purged?: boolean;
    mimeType?: string | null;
    fileName?: string | null;
  } | null;
};

export async function prefetchRoomMedia(messages: Mediaish[]): Promise<void> {
  for (const m of messages) {
    const media = m.media;
    if (!media || media.purged || !media.url || !m.id) continue;
    const roomId = m.roomId;
    if (!roomId) continue;
    const existing = await getCachedChatMediaUrl(roomId, m.id);
    if (existing) {
      URL.revokeObjectURL(existing);
      continue;
    }
    await cacheChatMedia(roomId, m.id, media.url);
  }
}

/** Tire syncpack hub (delta via cursor) + précharge blobs. */
export async function pullMeshSync(
  roomId: string,
  fetchJson: <T>(path: string) => Promise<T>,
): Promise<void> {
  try {
    const since = await getMeshCursor(roomId);
    const q = new URLSearchParams({ limit: "100" });
    if (since) q.set("since", since);
    const pack = await fetchJson<{
      nextCursor?: string | null;
      blobs?: Array<{
        messageId: string;
        roomId: string;
        url?: string | null;
        purged?: boolean;
        hubAvailable?: boolean;
      }>;
    }>(`/chat/rooms/${roomId}/mesh/sync?${q.toString()}`);
    const blobs = pack.blobs ?? [];
    for (const b of blobs) {
      if (!b.hubAvailable || b.purged || !b.url) continue;
      await cacheChatMedia(b.roomId || roomId, b.messageId, b.url);
    }
    if (pack.nextCursor) await setMeshCursor(roomId, pack.nextCursor);
  } catch {
    /* hub offline — cache local suffit */
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = String(reader.result || "");
      const b64 = r.includes(",") ? r.split(",")[1] : r;
      resolve(b64 || "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mimeType || "application/octet-stream" });
}
