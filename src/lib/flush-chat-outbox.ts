import { bffApi } from "@/lib/bff";
import { bffFetch, BffError } from "@/lib/bff-fetch";
import {
  base64ToBlob,
  bumpOutboxAttempt,
  listChatOutbox,
  putLocalMediaBlob,
  removeChatOutbox,
  type ChatOutboxItem,
} from "@/lib/chat-cache";
import type { ChatMessage } from "@/lib/portal-api";

export const OUTBOX_CHANGED = "akiba:outbox-changed";

const PERMANENT = new Set([400, 403, 404, 409, 413, 415, 422]);
const MAX_ATTEMPTS = 6;

let running = false;

export type FlushedChat = {
  clientMessageId: string;
  message: ChatMessage;
};

function statusOf(error: unknown): number {
  if (error instanceof BffError) return error.status;
  return 0;
}

async function sendText(item: ChatOutboxItem): Promise<ChatMessage> {
  return bffFetch<ChatMessage>(`/chat/rooms/${item.roomId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: item.content,
      clientMessageId: item.clientMessageId,
      replyToId: item.replyToId ?? undefined,
    }),
  });
}

async function sendFile(item: ChatOutboxItem): Promise<ChatMessage> {
  const blob = base64ToBlob(
    item.fileBase64 || "",
    item.mimeType || "application/octet-stream",
  );
  const fd = new FormData();
  fd.append(
    "file",
    new File([blob], item.fileName || "fichier", {
      type: item.mimeType || "application/octet-stream",
    }),
  );
  fd.append("clientMessageId", item.clientMessageId);
  if (item.content) fd.append("caption", item.content);
  const res = await fetch(bffApi(`/chat/rooms/${item.roomId}/file`), {
    method: "POST",
    credentials: "include",
    body: fd,
  });
  if (!res.ok) throw new BffError(await res.text(), res.status, "");
  const created = (await res.json()) as ChatMessage;
  if (created?.id) void putLocalMediaBlob(item.roomId, created.id, blob);
  return created;
}

async function sendOne(item: ChatOutboxItem): Promise<ChatMessage | null> {
  if (item.kind === "file" && item.fileBase64 && item.fileName) {
    return sendFile(item);
  }
  if (!item.content?.trim()) return null;
  return sendText(item);
}

/** Envoie la file chat (texte + fichiers) et retire ce qui est parti ou mort. */
export async function flushChatOutbox(): Promise<FlushedChat[]> {
  if (running) return [];
  if (typeof navigator !== "undefined" && !navigator.onLine) return [];
  running = true;
  const sent: FlushedChat[] = [];
  try {
    const pending = await listChatOutbox();
    for (const item of pending) {
      await pushItem(item, sent);
    }
    return sent;
  } finally {
    running = false;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(OUTBOX_CHANGED, { detail: sent }));
    }
  }
}

async function pushItem(item: ChatOutboxItem, sent: FlushedChat[]): Promise<void> {
  try {
    const message = await sendOne(item);
    await removeChatOutbox(item.clientMessageId);
    if (message?.id) {
      sent.push({ clientMessageId: item.clientMessageId, message });
    }
  } catch (error) {
    const status = statusOf(error);
    const dead = PERMANENT.has(status) || (item.attempts ?? 0) >= MAX_ATTEMPTS;
    if (dead) {
      await removeChatOutbox(item.clientMessageId);
      return;
    }
    await bumpOutboxAttempt(item.clientMessageId);
  }
}
