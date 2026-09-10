export function apiOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_EAGASEKE_ORIGIN?.replace(/\/$/, "") ||
    "http://localhost:30009"
  );
}

export function wsOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_EAGASEKE_WS_ORIGIN?.replace(/\/$/, "") ||
    apiOrigin()
  );
}

export function normalizeList<T>(data: unknown, keys: string[] = ["items", "data", "results"]): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    for (const key of keys) {
      if (Array.isArray(o[key])) return o[key] as T[];
    }
  }
  return [];
}

export type ChatRoom = {
  id: string;
  name?: string;
  description?: string | null;
  type?: string;
  avatar?: string | null;
  contributionId?: string | null;
  tontineId?: string | null;
  lastMessageAt?: string | null;
  messageCount?: number;
  memberCount?: number;
  members?: Array<{
    id?: string;
    userId?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    avatar?: string | null;
  }>;
  pinnedMessageId?: string | null;
  updatedAt?: string;
};

export type ChatReaction = {
  id?: string;
  userId?: string;
  reaction: string;
};

export type ChatMessage = {
  id: string;
  roomId?: string;
  content?: string;
  type?: string;
  createdAt?: string;
  senderId?: string;
  senderName?: string | null;
  senderAvatar?: string | null;
  sender?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
  };
  replyToId?: string | null;
  replyToPreview?: {
    id?: string;
    senderName?: string | null;
    snippet?: string;
  } | null;
  reactions?: ChatReaction[];
  isPinned?: boolean;
  eventType?: string | null;
  eventData?: Record<string, unknown> | null;
  /** Optimistic local send */
  pending?: boolean;
  failed?: boolean;
  poll?: {
    question?: string;
    options?: string[];
    votes?: Record<string, unknown>;
  } | null;
};

export function chatSenderLabel(m: ChatMessage): string {
  if (m.senderName) return m.senderName;
  const s = m.sender;
  if (!s) return "Membre";
  if (s.fullName) return s.fullName;
  const n = `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim();
  return n || "Membre";
}

export function initialsFrom(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function sortRoomsByActivity(rooms: ChatRoom[]): ChatRoom[] {
  return [...rooms].sort((a, b) => {
    const ta = Date.parse(a.lastMessageAt ?? a.updatedAt ?? "") || 0;
    const tb = Date.parse(b.lastMessageAt ?? b.updatedAt ?? "") || 0;
    return tb - ta;
  });
}

export type NotificationRow = {
  id: string;
  title?: string;
  message?: string;
  body?: string;
  type?: string;
  isRead?: boolean;
  readAt?: string | null;
  createdAt?: string;
};
