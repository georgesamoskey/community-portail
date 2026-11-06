"use client";

import Link from "next/link";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { bffFetch, BffError } from "@/lib/bff-fetch";
import { useBff } from "@/lib/use-bff";
import { useChatSocket } from "@/lib/use-chat-socket";
import {
  chatSenderLabel,
  normalizeList,
  sortRoomsByActivity,
  type ChatMessage,
  type ChatRoom,
} from "@/lib/portal-api";
import { cx } from "@/lib/cx";
import { useI18n } from "@/lib/i18n/context";
import { ChatEventCard } from "@/components/chat-event-card";
import { activityKind } from "@/components/live-activity-list";
import { resolveSystemEvent, systemEventCopy } from "@/lib/system-event-text";
import {
  ChatMessageRow,
  chatDayKey,
  chatDayLabel,
  chatListTime,
} from "@/components/chat-message-row";
import {
  insertMention,
  mentionHandle,
  mentionQuery,
} from "@/lib/chat-mentions";
import { MemberAvatar, MemberAvatarStack } from "@/components/member-avatar";
import {
  MemberTrustBadge,
  type TrustSignals,
} from "@/components/member-trust-badge";
import {
  loadCachedMessages,
  saveCachedMessages,
  prefetchRoomMedia,
  pullMeshSync,
  enqueueChatOutbox,
  listChatOutbox,
  removeChatOutbox,
} from "@/lib/chat-cache";
import { ChatMediaBubble } from "@/components/chat-media-bubble";
import { acquireWakeLock, releaseWakeLock } from "@/lib/native";
import { VoiceRecorder } from "@/components/voice-recorder";
import { ChatEmojiPicker } from "@/components/chat-emoji-picker";
import { ChatAttachSheet } from "@/components/chat-attach-sheet";
import { compressImage } from "@/lib/secure-store";
import {
  flushChatOutbox,
  OUTBOX_CHANGED,
  type FlushedChat,
} from "@/lib/flush-chat-outbox";
import { SkeletonList } from "@/components/native-pro";
import { markPushMoment } from "@/components/push-prompt";
import { RichEmpty } from "@/components/rich-empty";

const QUICK_REACTIONS = ["👍", "❤️", "👏", "🔥", "😂"];

const QUICK_REPLIES_FR = [
  { id: "paid", text: "J’ai cotisé ✅" },
  { id: "tomorrow", text: "Je cotise demain 🤝" },
  { id: "nudge", text: "On avance ensemble — qui suit ?" },
];

function ChatFallback() {
  const { t } = useI18n();
  return (
    <div className="flex h-[70vh] items-center justify-center text-sm text-ink-mute">
      {t("chat.opening")}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={<ChatFallback />}
    >
      <ChatInner />
    </Suspense>
  );
}

function ChatInner() {
  const { t } = useI18n();
  const search = useSearchParams();
  const roomParam = search.get("room");
  const { data: session } = useSession();
  const myName =
    session?.user?.name ?? session?.user?.preferred_username ?? "";

  const me = useBff<{ id?: string }>("/users/me");
  const myId = me.data?.id ?? session?.user?.id;

  const roomsBff = useBff<ChatRoom[] | { items?: ChatRoom[] }>("/chat/rooms");
  const unread = useBff<{ count?: number }>("/chat/unread");
  const unreadRooms = useBff<{ counts?: Record<string, number> }>(
    "/chat/unread/by-room",
  );
  const engagement = useBff<{
    currentStreak?: number;
    level?: number;
    streakAtRisk?: boolean;
    stats?: { invitationsAccepted?: number };
  }>("/engagement/me");
  const referralBrief = useBff<{ acceptedCount?: number }>(
    "/referral/me/cercle",
  );
  const myTrust = useMemo(() => {
    const accepted =
      referralBrief.data?.acceptedCount ??
      engagement.data?.stats?.invitationsAccepted ??
      0;
    return {
      currentStreak: engagement.data?.currentStreak,
      level: engagement.data?.level,
      streakAtRisk: engagement.data?.streakAtRisk,
      ambassador: accepted >= 5,
    };
  }, [engagement.data, referralBrief.data]);

  const rooms = useMemo(() => {
    const list = Array.isArray(roomsBff.data)
      ? roomsBff.data
      : normalizeList<ChatRoom>(roomsBff.data, ["items", "rooms", "data"]);
    return sortRoomsByActivity(list);
  }, [roomsBff.data]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [mobileShowThread, setMobileShowThread] = useState(!!roomParam);
  const [showTools, setShowTools] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [recording, setRecording] = useState(false);
  const [threadQuery, setThreadQuery] = useState("");
  const [threadSearch, setThreadSearch] = useState(false);
  const [roomUnread, setRoomUnread] = useState<Record<string, number>>({});
  const [pollQ, setPollQ] = useState("");
  const [commitAmt, setCommitAmt] = useState("");
  const defaultPollOpts = useMemo(() => `${t("chat.yes")}\n${t("chat.no")}`, [t]);
  const [pollOpts, setPollOpts] = useState(defaultPollOpts);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickBottom = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showJump, setShowJump] = useState(false);
  const [seenAt, setSeenAt] = useState<Record<string, number>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const {
    connected,
    status: wsStatus,
    error: wsError,
    liveMessages,
    clearLive,
    typing,
    onlineUsers,
    roomOnlineIds,
    readsByMessage,
    joinRoom,
    emitTyping,
    markAsRead,
    reconnect,
  } = useChatSocket(true);

  const [trustByUser, setTrustByUser] = useState<
    Record<string, TrustSignals>
  >({});
  const [outboxCount, setOutboxCount] = useState(0);
  const [showPresence, setShowPresence] = useState(false);

  useEffect(() => {
    if (roomParam) {
      setSelectedId(roomParam);
      setMobileShowThread(true);
      return;
    }
    if (!selectedId && rooms[0]?.id) setSelectedId(rooms[0].id);
  }, [rooms, selectedId, roomParam]);

  useEffect(() => {
    if (!selectedId) return;
    let alive = true;
    void acquireWakeLock();
    const onVis = () => {
      if (document.visibilityState === "visible" && alive) {
        void acquireWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVis);
      void releaseWakeLock();
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    clearLive();
    joinRoom(selectedId);
    let cancelled = false;
    (async () => {
      setLoadingMsg(true);
      setSendError(null);
      // Cache d’abord → sensation instantanée
      const cached = await loadCachedMessages<ChatMessage>(selectedId);
      if (!cancelled && cached.length) {
        setHistory(cached);
        setLoadingMsg(false);
      }
      try {
        const data = await bffFetch<ChatMessage[] | { items?: ChatMessage[] }>(
          `/chat/rooms/${selectedId}/messages?limit=80`,
        );
        if (cancelled) return;
        const list = Array.isArray(data)
          ? data
          : normalizeList<ChatMessage>(data, ["items", "messages", "data"]);
        const ordered = list.slice().reverse();
        setHistory(ordered);
        void saveCachedMessages(selectedId, ordered);
        void prefetchRoomMedia(
          ordered.map((m) => ({ ...m, roomId: m.roomId ?? selectedId })),
        );
        void pullMeshSync(selectedId, (path) => bffFetch(path));
        const last = [...list].sort((a, b) => {
          const ta = Date.parse(a.createdAt ?? "") || 0;
          const tb = Date.parse(b.createdAt ?? "") || 0;
          return tb - ta;
        })[0];
        if (last?.id) markAsRead(selectedId, last.id);
        try {
          await bffFetch(`/chat/rooms/${selectedId}/read`, { method: "POST" });
        } catch {
          if (last?.id) {
            await bffFetch(`/chat/messages/${last.id}/read`, {
              method: "POST",
            }).catch(() => null);
          }
        }
        setRoomUnread((prev) => ({ ...prev, [selectedId]: 0 }));
        void unread.refresh();
        void unreadRooms.refresh();
      } catch (e) {
        if (!cancelled && !cached.length) {
          setHistory([]);
          setSendError(
            e instanceof BffError ? e.message : t("chat.historyFail"),
          );
        }
      } finally {
        if (!cancelled) setLoadingMsg(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh identité volatile
  }, [selectedId, clearLive, joinRoom, markAsRead]);

  const pulse = useBff<{
    circleStreakDays?: number;
    progressPct?: number | null;
    todaySystemEvents?: number;
    pinnedMessageId?: string | null;
  }>(selectedId ? `/chat/rooms/${selectedId}/pulse` : null);

  const roomLive = useMemo(
    () => liveMessages.filter((m) => !m.roomId || m.roomId === selectedId),
    [liveMessages, selectedId],
  );

  useEffect(() => {
    if (unreadRooms.data?.counts) setRoomUnread(unreadRooms.data.counts);
  }, [unreadRooms.data]);

  const liveCursor = useRef(0);
  const livePrimed = useRef(false);
  useEffect(() => {
    if (!livePrimed.current) {
      livePrimed.current = true;
      liveCursor.current = liveMessages.length;
      return;
    }
    if (liveMessages.length < liveCursor.current) {
      liveCursor.current = liveMessages.length;
      return;
    }
    const fresh = liveMessages.slice(liveCursor.current);
    liveCursor.current = liveMessages.length;
    if (!fresh.length) return;
    setRoomUnread((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const msg of fresh) {
        if (!msg.roomId || msg.roomId === selectedId || msg.senderId === myId) continue;
        next[msg.roomId] = (next[msg.roomId] ?? 0) + 1;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [liveMessages, selectedId, myId]);

  const messages = useMemo(() => {
    const byId = new Map<string, ChatMessage>();
    const byClient = new Map<string, string>();
    const upsert = (m: ChatMessage) => {
      if (!m.id) return;
      const cid = m.clientMessageId;
      if (cid && byClient.has(cid)) {
        const prevId = byClient.get(cid)!;
        // Préférer l’ID serveur (non mesh-*) si les deux existent
        const preferServer =
          !String(m.id).startsWith("mesh-") ||
          String(prevId).startsWith("mesh-");
        if (preferServer) {
          byId.delete(prevId);
          byId.set(m.id, { ...m, pending: false, failed: false });
          byClient.set(cid, m.id);
        }
        return;
      }
      byId.set(m.id, m);
      if (cid) byClient.set(cid, m.id);
    };
    for (const m of history) upsert(m);
    for (const m of roomLive) upsert(m);
    const list = [...byId.values()].sort((a, b) =>
      String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")),
    );
    return list.filter((m) => {
      if (!String(m.id).startsWith("tmp-") && !String(m.id).startsWith("mesh-"))
        return true;
      if (!m.pending && !m.failed) return true;
      return !list.some(
        (o) =>
          o.id !== m.id &&
          (o.clientMessageId === m.clientMessageId ||
            o.clientMessageId === m.id) &&
          !o.pending,
      );
    });
  }, [history, roomLive]);

  const needle = threadQuery.trim();
  const visibleMessages = useMemo(() => {
    if (needle.length < 2) return messages;
    const q = needle.toLowerCase();
    return messages.filter((m) => (m.content ?? "").toLowerCase().includes(q));
  }, [messages, needle]);

  useEffect(() => {
    if (!selectedId || needle.length < 2) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void bffFetch<ChatMessage[]>(
        `/chat/rooms/${selectedId}/search?q=${encodeURIComponent(needle)}`,
      )
        .then((rows) => {
          if (cancelled || !Array.isArray(rows) || !rows.length) return;
          setHistory((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const extra = rows.filter((m) => m.id && !ids.has(m.id));
            return extra.length ? [...extra, ...prev] : prev;
          });
        })
        .catch(() => null);
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [needle, selectedId]);

  useEffect(() => {
    if (selectedId && messages.length) {
      void saveCachedMessages(
        selectedId,
        messages.filter((m) => !m.pending && !String(m.id).startsWith("tmp-")),
      );
    }
  }, [selectedId, messages]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("akiba-chat-seen");
      if (raw) setSeenAt(JSON.parse(raw) as Record<string, number>);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setSeenAt((prev) => {
      const next = { ...prev, [selectedId]: Date.now() };
      localStorage.setItem("akiba-chat-seen", JSON.stringify(next));
      return next;
    });
    setReplyTo(null);
    setThreadQuery("");
    setRecording(false);
    stickBottom.current = true;
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || !messages.length) return;
    const last = [...messages].reverse().find((m) => m.content || m.media);
    const text = last?.content?.trim() || (last?.media ? "📎" : "");
    if (!text) return;
    setPreviews((prev) =>
      prev[selectedId] === text ? prev : { ...prev, [selectedId]: text },
    );
  }, [messages, selectedId]);

  useEffect(() => {
    if (!stickBottom.current) {
      setShowJump(true);
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typing, selectedId]);

  useEffect(() => {
    const ids = [
      ...new Set(
        messages
          .map((m) => m.senderId ?? m.sender?.id)
          .filter((id): id is string => !!id),
      ),
    ].slice(0, 60);
    if (!ids.length) return;
    const missing = ids.filter((id) => !trustByUser[id]);
    if (!missing.length) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await bffFetch<Record<string, TrustSignals>>(
          `/engagement/trust/batch?ids=${missing.join(",")}`,
        );
        if (cancelled || !data || typeof data !== "object") return;
        setTrustByUser((prev) => ({ ...prev, ...data }));
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- trustByUser lu pour skip cache
  }, [messages]);

  const filteredRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter(
      (r) =>
        (r.name ?? "").toLowerCase().includes(q) ||
        (r.type ?? "").toLowerCase().includes(q),
    );
  }, [rooms, query]);

  const applyFlushed = useCallback((sent: FlushedChat[]) => {
    if (!sent.length) return;
    setHistory((prev) => {
      let next = prev;
      for (const row of sent) {
        next = next.filter(
          (m) =>
            m.id !== row.clientMessageId &&
            m.clientMessageId !== row.clientMessageId,
        );
        next = [...next, { ...row.message, clientMessageId: row.clientMessageId }];
      }
      return next;
    });
  }, []);

  const flushOutbox = useCallback(async () => {
    await flushChatOutbox();
  }, []);

  useEffect(() => {
    const refreshOutbox = () => {
      void listChatOutbox().then((rows) => setOutboxCount(rows.length));
    };
    const onOnline = () => {
      void flushOutbox().then(refreshOutbox);
    };
    const onOutbox = (event: Event) => {
      const sent = (event as CustomEvent<FlushedChat[]>).detail ?? [];
      applyFlushed(sent);
      refreshOutbox();
    };
    const id = window.setInterval(refreshOutbox, 8_000);
    window.addEventListener("online", onOnline);
    window.addEventListener(OUTBOX_CHANGED, onOutbox);
    refreshOutbox();
    void flushOutbox();
    return () => {
      window.clearInterval(id);
      window.removeEventListener("online", onOnline);
      window.removeEventListener(OUTBOX_CHANGED, onOutbox);
    };
  }, [flushOutbox, applyFlushed]);

  const onSend = useCallback(async () => {
    const content = draft.trim();
    if (!content || !selectedId) return;
    const quoted = replyTo;
    setSendError(null);
    setDraft("");
    setReplyTo(null);
    emitTyping(selectedId, false);

    const clientMessageId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? `mesh-${crypto.randomUUID()}`
        : `mesh-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: clientMessageId,
      roomId: selectedId,
      content,
      type: "text",
      senderId: myId,
      senderName: myName,
      createdAt: new Date().toISOString(),
      pending: true,
      clientMessageId,
      replyToId: quoted?.id,
      replyToPreview: quoted
        ? {
            senderName: chatSenderLabel(quoted),
            snippet: (quoted.content ?? "").slice(0, 80),
          }
        : undefined,
    };
    setHistory((prev) => [...prev, optimistic]);

    // REST d’abord (idempotent). Le hub broadcast WS aux *autres* membres.
    try {
      const created = await bffFetch<ChatMessage>(
        `/chat/rooms/${selectedId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            content,
            clientMessageId,
            replyToId: quoted?.id,
          }),
        },
      );
      setHistory((prev) => {
        const without = prev.filter(
          (m) =>
            m.id !== clientMessageId && m.clientMessageId !== clientMessageId,
        );
        return [...without, { ...created, clientMessageId }];
      });
      void removeChatOutbox(clientMessageId);
      markPushMoment("send");
    } catch (e) {
      await enqueueChatOutbox({
        clientMessageId,
        roomId: selectedId,
        kind: "text",
        content,
        replyToId: quoted?.id,
        createdAt: new Date().toISOString(),
        attempts: 0,
      });
      setHistory((prev) =>
        prev.map((m) =>
          m.id === clientMessageId || m.clientMessageId === clientMessageId
            ? { ...m, pending: true, failed: !navigator.onLine }
            : m,
        ),
      );
      if (!(e instanceof BffError && e.status >= 500) && navigator.onLine) {
        setSendError(e instanceof BffError ? e.message : t("chat.sendFail"));
      }
    }
  }, [
    draft,
    selectedId,
    emitTyping,
    t,
    myId,
    myName,
    replyTo,
  ]);

  const onSendFile = async (file: File) => {
    if (!selectedId) return;
    setSendError(null);
    const clientMessageId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? `mesh-${crypto.randomUUID()}`
        : `mesh-${Date.now()}`;
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("clientMessageId", clientMessageId);
      const { bffApi } = await import("@/lib/bff");
      const res = await fetch(bffApi(`/chat/rooms/${selectedId}/file`), {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Erreur ${res.status}`);
      }
      const created = (await res.json()) as ChatMessage;
      if (created?.id) {
        const { putLocalMediaBlob } = await import("@/lib/chat-cache");
        void putLocalMediaBlob(selectedId, created.id, file);
      }
      setHistory((prev) => [...prev, { ...created, clientMessageId }]);
      void pullMeshSync(selectedId, (path) => bffFetch(path));
    } catch (e) {
      try {
        const { fileToBase64, putLocalMediaBlob, enqueueChatOutbox } =
          await import("@/lib/chat-cache");
        const b64 = await fileToBase64(file);
        await putLocalMediaBlob(selectedId, clientMessageId, file);
        await enqueueChatOutbox({
          clientMessageId,
          roomId: selectedId,
          kind: "file",
          content: "",
          createdAt: new Date().toISOString(),
          attempts: 0,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileBase64: b64,
        });
        setHistory((prev) => [
          ...prev,
          {
            id: clientMessageId,
            roomId: selectedId,
            content: file.name,
            type: file.type.startsWith("image/") ? "image" : "file",
            senderId: myId,
            senderName: myName,
            createdAt: new Date().toISOString(),
            pending: true,
            clientMessageId,
            media: {
              url: null,
              fileName: file.name,
              mimeType: file.type,
              size: file.size,
              purged: false,
            },
          },
        ]);
      } catch {
        setSendError(e instanceof Error ? e.message : t("chat.fileFail"));
      }
    }
  };

  const react = async (messageId: string, reaction: string) => {
    try {
      await bffFetch(`/chat/messages/${messageId}/reactions`, {
        method: "POST",
        body: JSON.stringify({ reaction }),
      });
      // Optimistic merge
      setHistory((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const existing = m.reactions ?? [];
          const mine = existing.find(
            (r) => r.userId === myId && r.reaction === reaction,
          );
          if (mine) {
            return {
              ...m,
              reactions: existing.filter((r) => r !== mine),
            };
          }
          return {
            ...m,
            reactions: [
              ...existing,
              { userId: myId, reaction },
            ],
          };
        }),
      );
    } catch {
      /* ignore */
    }
  };

  const selected = rooms.find((r) => r.id === selectedId);
  const contextHref = selected?.contributionId
    ? `/app/contributions/${selected.contributionId}`
    : selected?.tontineId
      ? `/app/tontines/${selected.tontineId}`
      : null;

  const roomMembers = useMemo(() => {
    return (selected?.members ?? []).map((m) => {
      const id = m.id ?? m.userId ?? "";
      const name =
        m.fullName ||
        `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() ||
        t("common.member");
      return {
        id,
        name,
        avatar: m.avatar,
        online: !!(id && (onlineUsers[id] || roomOnlineIds.includes(id))),
      };
    });
  }, [selected?.members, onlineUsers, roomOnlineIds, t]);

  const onlineInRoom = useMemo(
    () => roomMembers.filter((m) => m.online),
    [roomMembers],
  );
  const mentionQ = mentionQuery(draft);
  const mentionHits = useMemo(() => {
    if (mentionQ === null) return [];
    const q = mentionQ.toLowerCase();
    return roomMembers
      .filter((m) => m.id && m.id !== myId)
      .filter((m) => {
        if (!q) return true;
        const handle = mentionHandle(m.name).toLowerCase();
        return m.name.toLowerCase().includes(q) || handle.includes(q);
      })
      .slice(0, 6);
  }, [mentionQ, roomMembers, myId]);

  const selectRoom = (id: string) => {
    setSelectedId(id);
    setMobileShowThread(true);
    setShowPresence(false);
    inputRef.current?.focus();
  };

  return (
    <div className="chat-shell flex h-[calc(100dvh-4.25rem)] flex-col overflow-hidden border-ink/[0.06] bg-surface max-md:h-[calc(100dvh-3.75rem-env(safe-area-inset-bottom))] md:h-[calc(100dvh-8.5rem)] md:rounded-2.5xl md:border md:shadow-chat">
      <div
        className={cx(
          "flex items-center justify-between gap-2 border-b border-ink/[0.06] px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3.5 md:px-5",
          !mobileShowThread && "mobile-trust-gradient border-transparent text-white md:bg-none md:!text-ink",
          mobileShowThread && "hidden md:flex",
        )}
      >
        <div>
          <h1
            className={cx(
              "font-display text-xl font-bold tracking-tight md:text-2xl",
              mobileShowThread ? "text-ink" : "text-white md:text-ink",
            )}
          >
            {t("chat.title")}
          </h1>
          <p
            className={cx(
              "mt-0.5 text-xs",
              mobileShowThread ? "text-ink-mute" : "text-white/75 md:text-ink-mute",
            )}
          >
            {t("chat.subtitle")}
            {(unread.data?.count ?? 0) > 0
              ? ` ${t("chat.unread", { n: unread.data!.count ?? 0 })}`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (wsStatus !== "connected") reconnect();
            }}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold transition",
              wsStatus === "connected"
                ? "bg-mint-100 text-mint-800"
                : wsStatus === "offline" || wsStatus === "error"
                  ? "bg-amber-100 text-amber-900"
                  : "bg-brand-50 text-brand-800",
            )}
            title={
              wsStatus !== "connected" ? t("chat.retryWs") : t("chat.online")
            }
          >
            <span
              className={cx(
                "h-1.5 w-1.5 rounded-full",
                wsStatus === "connected"
                  ? "online-dot bg-mint-500"
                  : wsStatus === "reconnecting" || wsStatus === "connecting"
                    ? "animate-pulse bg-brand-500"
                    : "bg-amber-500",
              )}
            />
            {wsStatus === "connected"
              ? t("chat.online")
              : wsStatus === "offline"
                ? t("chat.offline")
                : wsStatus === "reconnecting"
                  ? t("chat.reconnecting")
                  : wsStatus === "connecting"
                    ? t("chat.connecting")
                    : t("chat.retryWs")}
          </button>
          <MemberTrustBadge signals={myTrust} size="xs" />
          {outboxCount > 0 ? (
            <button
              type="button"
              onClick={() => void flushOutbox().then(() =>
                listChatOutbox().then((rows) => setOutboxCount(rows.length)),
              )}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900"
              title={t("chat.outboxRetry")}
            >
              {t("chat.outboxPending", { n: outboxCount })}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void roomsBff.refresh()}
            className="rounded-xl border border-ink/[0.08] px-2.5 py-1 text-xs font-semibold text-ink-soft hover:bg-brand-50"
          >
            {t("common.refresh")}
          </button>
        </div>
      </div>

      {(wsError || sendError) && (
        <div className="flex items-center justify-between gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-sm text-amber-950">
          <p className="min-w-0 flex-1 truncate">{sendError ?? wsError}</p>
          {wsError && !connected ? (
            <button
              type="button"
              className="shrink-0 rounded-lg bg-amber-200/80 px-2.5 py-1 text-xs font-bold"
              onClick={() => reconnect()}
            >
              {t("chat.retryWs")}
            </button>
          ) : null}
        </div>
      )}

      <div className="grid min-h-0 flex-1 lg:grid-cols-[300px_1fr]">
        <aside
          className={cx(
            "min-h-0 flex-col border-ink/[0.06] bg-surface-sunken/40 lg:flex lg:border-r",
            mobileShowThread ? "hidden lg:flex" : "flex",
          )}
        >
          <div className="border-b border-ink/[0.06] p-3">
            <input
              className="w-full rounded-full border-0 bg-surface px-4 py-2.5 text-sm text-ink shadow-soft outline-none placeholder:text-ink-faint"
              placeholder={t("chat.searchPh")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {roomsBff.loading && !rooms.length ? (
              <p className="px-4 py-6 text-sm text-ink-mute">{t("common.loading")}</p>
            ) : filteredRooms.length === 0 ? (
              <div className="space-y-3 px-5 py-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lift">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M7 18.5 4 21V7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v8a2.5 2.5 0 0 1-2.5 2.5H7Z"
                      stroke="currentColor"
                      strokeWidth="1.75"
                    />
                  </svg>
                </div>
                <p className="font-display text-sm font-bold text-ink">
                  {t("chat.emptyTitle")}
                </p>
                <p className="text-xs leading-relaxed text-ink-mute">
                  {t("chat.emptyHint")}
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <Link
                    href="/app/tontines"
                    className="rounded-xl bg-brand-500 px-3 py-2.5 text-sm font-bold text-white shadow-lift"
                  >
                    {t("chat.seeTontines")}
                  </Link>
                  <Link
                    href="/app/contributions"
                    className="rounded-xl border border-ink/[0.1] bg-surface px-3 py-2.5 text-sm font-semibold text-ink"
                  >
                    {t("chat.seePots")}
                  </Link>
                </div>
              </div>
            ) : (
              <ul>
                {filteredRooms.map((r) => {
                  const active = selectedId === r.id;
                  const label = r.name ?? t("chat.roomFallback", { id: r.id.slice(0, 8) });
                  const faces = (r.members ?? [])
                    .slice(0, 4)
                    .map((m) => ({
                      name:
                        m.fullName ||
                        `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() ||
                        "Membre",
                      avatarUrl: m.avatar,
                    }));
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => selectRoom(r.id)}
                        className={cx(
                          "chat-list-row flex w-full items-center gap-3 px-3 py-2.5 text-left transition native-pressable",
                          active ? "bg-brand-50" : "hover:bg-surface/80",
                        )}
                      >
                        {faces.length >= 2 ? (
                          <MemberAvatarStack members={faces} max={3} />
                        ) : (
                          <MemberAvatar name={label} avatarUrl={r.avatar} />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate text-[15px] font-semibold text-ink">
                              {label}
                            </p>
                            <span
                              className={cx(
                                "shrink-0 text-[11px] font-medium",
                                !active && (roomUnread[r.id] ?? 0) > 0
                                  ? "text-mint-700"
                                  : "text-ink-faint",
                              )}
                            >
                              {chatListTime(
                                r.lastMessageAt ?? r.updatedAt,
                                t("chat.yesterday"),
                              )}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2">
                            <p className="min-w-0 flex-1 truncate text-[13px] text-ink-mute">
                              {previews[r.id] ||
                                (r.memberCount
                                  ? t("chat.people", { n: r.memberCount })
                                  : t("chat.groupConvo"))}
                            </p>
                            {!active && (roomUnread[r.id] ?? 0) > 0 ? (
                              <span className="chat-unread-pill">
                                {(roomUnread[r.id] ?? 0) > 99
                                  ? "99+"
                                  : roomUnread[r.id]}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section
          className={cx(
            "chat-thread-bg relative min-h-0 flex-col",
            mobileShowThread ? "flex" : "hidden lg:flex",
          )}
        >
          <header className="relative flex items-center gap-2 border-b border-ink/[0.06] bg-surface/95 px-2 py-2.5 backdrop-blur-md sm:gap-3 sm:px-4 sm:py-3">
            <button
              type="button"
              className="min-h-10 min-w-10 shrink-0 rounded-xl px-2 py-1 text-sm font-semibold text-ink-soft hover:bg-brand-50 lg:hidden"
              onClick={() => setMobileShowThread(false)}
              aria-label={t("common.back")}
            >
              ←
            </button>
            {selected || selectedId ? (
              <>
                <MemberAvatar
                  name={selected?.name ?? t("chat.groupChat")}
                  avatarUrl={selected?.avatar}
                  online={onlineInRoom.length > 0}
                  trustRing={(pulse.data?.circleStreakDays ?? 0) > 0}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <p className="truncate font-display text-base font-bold tracking-tight text-ink sm:text-lg">
                      {selected?.name ?? t("chat.roomFallback", { id: selectedId?.slice(0, 8) ?? "" })}
                    </p>
                    {pulse.data?.circleStreakDays ? (
                      <span
                        className="hidden rounded-md bg-mint-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-mint-900 xs:inline sm:inline"
                        title={t("chat.circleStreak", {
                          n: pulse.data.circleStreakDays,
                        })}
                      >
                        🔥 {pulse.data.circleStreakDays}j
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="truncate text-left text-xs font-medium text-ink-mute hover:text-brand-600"
                    onClick={() => setShowPresence((v) => !v)}
                  >
                    {typing
                      ? `${typing.userName ? `${typing.userName}…` : t("chat.typing")}`
                      : onlineInRoom.length > 0
                        ? t("chat.onlineCount", { n: onlineInRoom.length })
                        : [
                            selected?.memberCount
                              ? t("chat.people", { n: selected.memberCount })
                              : null,
                            connected ? t("chat.live") : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || t("chat.groupConvo")}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPresence((v) => !v)}
                  className="hidden shrink-0 items-center gap-1 rounded-xl border border-mint-200 bg-mint-50 px-2.5 py-1.5 text-[11px] font-bold text-mint-900 sm:inline-flex"
                >
                  <span className="online-dot h-1.5 w-1.5 rounded-full bg-mint-500" />
                  {t("chat.onlineCount", { n: onlineInRoom.length })}
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-soft hover:bg-brand-50"
                  aria-label={t("chat.searchIn")}
                  onClick={() => {
                    setThreadSearch((v) => !v);
                    if (threadSearch) setThreadQuery("");
                  }}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.75" />
                    <path d="M16 16.5 20 20.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  </svg>
                </button>
                {contextHref ? (
                  <Link
                    href={contextHref}
                    className="hidden shrink-0 rounded-xl border border-ink/[0.08] bg-surface px-3 py-1.5 text-xs font-bold text-ink hover:border-brand-300 hover:text-brand-600 sm:inline-flex"
                  >
                    {t("chat.seeGroup")}
                  </Link>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-ink-mute">{t("chat.pick")}</p>
            )}
            {showPresence && (selected || selectedId) ? (
              <div className="absolute left-2 right-2 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-ink/[0.08] bg-surface p-3 shadow-lift sm:left-auto sm:right-4 sm:w-72">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-mute">
                    {t("chat.presenceTitle")}
                  </p>
                  <button
                    type="button"
                    className="text-xs font-semibold text-ink-mute"
                    onClick={() => setShowPresence(false)}
                  >
                    ✕
                  </button>
                </div>
                {roomMembers.length === 0 ? (
                  <p className="text-xs text-ink-mute">{t("chat.presenceEmpty")}</p>
                ) : (
                  <ul className="space-y-2">
                    {[...roomMembers]
                      .sort((a, b) => Number(b.online) - Number(a.online))
                      .map((m) => (
                        <li key={m.id || m.name} className="flex items-center gap-2">
                          <MemberAvatar
                            name={m.name}
                            avatarUrl={m.avatar}
                            size="sm"
                            online={m.online}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink">
                              {m.name}
                            </p>
                            <p className="text-[10px] font-medium text-ink-mute">
                              {m.online ? t("chat.online") : t("chat.offline")}
                            </p>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            ) : null}
          </header>
          {(() => {
            const latest = [...messages]
              .reverse()
              .find((m) => m.eventType || m.type === "system");
            if (!latest || !selectedId) return null;
            const kind = activityKind(
              resolveSystemEvent(latest.eventType, latest.eventData),
            );
            const copy = systemEventCopy(
              t,
              latest.eventType,
              latest.eventData,
              latest.content,
            );
            return (
              <div className="border-b border-ink/[0.06] bg-surface px-3 py-2 text-xs font-semibold text-ink">
                {kind.icon} {copy.body}
              </div>
            );
          })()}
          {threadSearch && selectedId ? (
            <div className="border-b border-ink/[0.06] bg-surface px-3 py-2">
              <input
                className="w-full rounded-full border-0 bg-surface-sunken px-4 py-2 text-sm text-ink outline-none"
                placeholder={t("chat.searchIn")}
                value={threadQuery}
                onChange={(e) => setThreadQuery(e.target.value)}
              />
            </div>
          ) : null}

          <div
            ref={scrollerRef}
            className="chat-thread-scroll min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 py-3 sm:px-4"
            onScroll={() => {
              const el = scrollerRef.current;
              if (!el) return;
              const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
              stickBottom.current = dist < 96;
              setShowJump(dist > 180);
            }}
          >
            {!selectedId && (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
                <RichEmpty
                  title={t("chat.threadEmpty")}
                  hint={t("chat.threadHint")}
                  actionLabel={t("chat.seeTontines")}
                  href="/app/tontines"
                />
              </div>
            )}
            {loadingMsg && (
              <div className="space-y-3 p-2">
                <SkeletonList n={3} />
              </div>
            )}
            {!loadingMsg && needle.length >= 2 && visibleMessages.length === 0 && (
              <p className="py-8 text-center text-sm text-ink-mute">{t("chat.noHit")}</p>
            )}
            {!loadingMsg && messages.length === 0 && selectedId && needle.length < 2 && (
              <RichEmpty
                title={t("chat.startConvo")}
                hint={t("chat.startHint")}
                actionLabel={t("chat.inviteCta")}
                href="/app/invitations"
                className="mx-auto max-w-sm"
              />
            )}
            {visibleMessages.map((m, idx) => {
              const mine =
                !!myId &&
                (m.senderId === myId || m.sender?.id === myId);
              const senderKey = m.senderId ?? m.sender?.id ?? "";
              const prev = visibleMessages[idx - 1];
              const sameAuthor =
                !!prev &&
                !prev.eventType &&
                prev.type !== "system" &&
                (prev.senderId ?? prev.sender?.id) === senderKey &&
                chatDayKey(prev.createdAt) === chatDayKey(m.createdAt);
              const isSystem = !!m.eventType || m.type === "system";
              const showDay =
                !prev || chatDayKey(prev.createdAt) !== chatDayKey(m.createdAt);
              const day = showDay ? (
                <div key={`${m.id}-day`} className="my-3 flex justify-center">
                  <span className="rounded-lg bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-ink-soft shadow-soft">
                    {chatDayLabel(m.createdAt, t)}
                  </span>
                </div>
              ) : null;

              if (isSystem) {
                return (
                  <div key={m.id}>
                    {day}
                    <ChatEventCard
                      message={m}
                      highlight={
                        pulse.data?.pinnedMessageId != null &&
                        pulse.data.pinnedMessageId === m.id
                      }
                    />
                  </div>
                );
              }

              return (
                <div key={m.id}>
                  {day}
                  <ChatMessageRow
                    message={m}
                    mine={mine}
                    sameAuthor={sameAuthor}
                    online={!!(senderKey && onlineUsers[senderKey])}
                    trust={mine ? myTrust : trustByUser[senderKey] ?? m.senderTrust ?? null}
                    myTrust={myTrust}
                    roomId={selectedId ?? m.roomId ?? ""}
                    read={
                      (readsByMessage[m.id]?.length ?? m.readBy?.length ?? 0) > 0
                    }
                    mark={needle.length >= 2 ? needle : undefined}
                    t={t}
                    onReact={(id, emoji) => void react(id, emoji)}
                    onReply={setReplyTo}
                    onPin={(id) => {
                      if (!selectedId) return;
                      void bffFetch(`/chat/rooms/${selectedId}/pin`, {
                        method: "PUT",
                        body: JSON.stringify({ messageId: id }),
                      }).catch(() => null);
                    }}
                    onDelete={(id) => {
                      void bffFetch(`/chat/messages/${id}`, { method: "DELETE" }).then(
                        () => setHistory((prev) => prev.filter((x) => x.id !== id)),
                      );
                    }}
                    onVote={(id, oi) => {
                      void bffFetch(`/chat/messages/${id}/poll/vote`, {
                        method: "POST",
                        body: JSON.stringify({ optionIndex: oi }),
                      });
                    }}
                    onMedia={(updated) => {
                      setHistory((prev) =>
                        prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)),
                      );
                    }}
                  />
                </div>
              );
            })}
            {typing && (
              <div className="flex items-center gap-2 px-2 py-2">
                <span className="typing-dots inline-flex gap-1 rounded-2xl bg-surface px-3 py-2 shadow-soft ring-1 ring-ink/[0.05]">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="text-xs font-medium text-ink-mute">
                  {typing.userName ?? t("chat.typing").replace("…", "")}…
                </span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          {showJump ? (
            <button
              type="button"
              className="absolute bottom-28 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-surface text-lg text-ink shadow-lift ring-1 ring-ink/[0.06]"
              aria-label={t("chat.scrollDown")}
              onClick={() => {
                stickBottom.current = true;
                setShowJump(false);
                bottomRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              ↓
            </button>
          ) : null}

          <footer className="chat-composer border-t border-ink/[0.06] bg-[#f0f2f5] p-1.5 sm:p-2 dark:bg-surface">
            {selectedId ? (
              <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {QUICK_REPLIES_FR.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    className="shrink-0 rounded-full border border-ink/[0.08] bg-surface-sunken/50 px-3 py-1.5 text-xs font-semibold text-ink hover:border-brand-300 hover:bg-brand-50"
                    onClick={() => {
                      setDraft(q.text);
                      inputRef.current?.focus();
                    }}
                  >
                    {q.text}
                  </button>
                ))}
                <Link
                  href="/app/invitations"
                  className="shrink-0 rounded-full border border-mint-200 bg-mint-50 px-3 py-1.5 text-xs font-bold text-mint-900"
                >
                  {t("chat.inviteCta")}
                </Link>
              </div>
            ) : null}
            {showTools && selectedId && (
              <div className="mb-3 grid gap-3 rounded-2xl border border-ink/[0.06] bg-surface-sunken/40 p-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase text-ink-mute">
                    {t("chat.poll")}
                  </p>
                  <input
                    className="mb-1 w-full rounded-lg border border-ink/[0.08] px-2 py-1.5 text-sm"
                    placeholder={t("chat.question")}
                    value={pollQ}
                    onChange={(e) => setPollQ(e.target.value)}
                  />
                  <textarea
                    className="mb-1 w-full rounded-lg border border-ink/[0.08] px-2 py-1.5 text-sm"
                    rows={3}
                    placeholder={t("chat.options")}
                    value={pollOpts}
                    onChange={(e) => setPollOpts(e.target.value)}
                  />
                  <button
                    type="button"
                    className="rounded-lg bg-mint-600 px-3 py-1.5 text-xs font-bold text-white"
                    onClick={() =>
                      void bffFetch(`/chat/rooms/${selectedId}/poll`, {
                        method: "POST",
                        body: JSON.stringify({
                          question: pollQ,
                          options: pollOpts
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        }),
                      }).then((created) => {
                        setHistory((prev) => [
                          ...prev,
                          created as ChatMessage,
                        ]);
                        setPollQ("");
                      })
                    }
                  >
                    {t("chat.publishPoll")}
                  </button>
                </div>
                <div>
                  <p className="mb-1 text-xs font-bold uppercase text-ink-mute">
                    {t("chat.publicCommit")}
                  </p>
                  <input
                    className="mb-1 w-full rounded-lg border border-ink/[0.08] px-2 py-1.5 text-sm"
                    placeholder={t("common.amount")}
                    value={commitAmt}
                    onChange={(e) => setCommitAmt(e.target.value)}
                  />
                  <button
                    type="button"
                    className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-bold text-white"
                    onClick={() =>
                      void bffFetch(`/chat/rooms/${selectedId}/commitment`, {
                        method: "POST",
                        body: JSON.stringify({ amount: Number(commitAmt) }),
                      }).then(() => setCommitAmt(""))
                    }
                  >
                    {t("chat.announce")}
                  </button>
                </div>
              </div>
            )}
            {mentionHits.length > 0 ? (
              <ul className="mb-2 overflow-hidden rounded-2xl bg-surface shadow-lift ring-1 ring-ink/[0.08]">
                {mentionHits.map((member) => (
                  <li key={member.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-brand-50"
                      onClick={() => {
                        setDraft((value) => insertMention(value, member.name));
                        inputRef.current?.focus();
                      }}
                    >
                      <MemberAvatar
                        name={member.name}
                        avatarUrl={member.avatar}
                        size="sm"
                        online={member.online}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {member.name}
                        </span>
                        <span className="text-xs font-bold text-brand-700">
                          @{mentionHandle(member.name)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {replyTo ? (
              <div className="mb-2 flex items-start gap-2 rounded-xl border-l-4 border-brand-500 bg-brand-50 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-brand-700">
                    {chatSenderLabel(replyTo)}
                  </p>
                  <p className="truncate text-xs text-ink-mute">
                    {replyTo.content || t("chat.attach")}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-sm font-bold text-ink-mute"
                  onClick={() => setReplyTo(null)}
                  aria-label={t("common.cancel")}
                >
                  ✕
                </button>
              </div>
            ) : null}
            {showAttach && selectedId ? (
              <ChatAttachSheet
                camera={t("chat.camera")}
                gallery={t("chat.gallery")}
                document={t("chat.document")}
                poll={t("chat.poll")}
                onPoll={() => {
                  setShowAttach(false);
                  setShowTools(true);
                }}
                onFile={(file) => {
                  setShowAttach(false);
                  void (async () => {
                    const ready = await compressImage(file);
                    await onSendFile(ready);
                  })();
                }}
              />
            ) : null}
            {showEmoji && selectedId ? (
              <ChatEmojiPicker
                label={t("chat.emoji")}
                onPick={(emoji) => {
                  const el = inputRef.current;
                  const start = el?.selectionStart ?? draft.length;
                  const end = el?.selectionEnd ?? draft.length;
                  const next = draft.slice(0, start) + emoji + draft.slice(end);
                  setDraft(next);
                  const pos = start + emoji.length;
                  requestAnimationFrame(() => {
                    el?.focus();
                    el?.setSelectionRange(pos, pos);
                  });
                }}
              />
            ) : null}
            {recording && selectedId ? (
              <VoiceRecorder
                cancelLabel={t("common.cancel")}
                sendLabel={t("chat.send")}
                mediaTitle={t("chat.voice")}
                onCancel={() => setRecording(false)}
                onRecorded={(file) => {
                  setRecording(false);
                  void onSendFile(file);
                }}
              />
            ) : (
            <form
              className="flex items-end gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                void onSend();
              }}
            >
              <button
                type="button"
                className="inline-flex h-11 w-9 shrink-0 items-center justify-center text-xl text-ink-soft"
                title={t("chat.tools")}
                aria-label={t("chat.tools")}
                onClick={() => {
                  setShowAttach((v) => !v);
                  setShowEmoji(false);
                }}
              >
                +
              </button>
              <label className="inline-flex h-11 w-9 shrink-0 cursor-pointer items-center justify-center text-ink-soft">
                <span className="sr-only">{t("chat.attach")}</span>
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M21 12.5V16a5 5 0 0 1-10 0V7a3 3 0 1 1 6 0v8.5a1.5 1.5 0 1 1-3 0V8"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  type="file"
                  className="hidden"
                  disabled={!selectedId}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      void (async () => {
                        const compressed = await compressImage(f);
                        await onSendFile(compressed);
                      })();
                    }
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                className="inline-flex h-11 w-9 shrink-0 items-center justify-center text-lg"
                aria-label={t("chat.emoji")}
                disabled={!selectedId}
                onClick={() => {
                  setShowEmoji((v) => !v);
                  setShowAttach(false);
                }}
              >
                😊
              </button>
              <input
                ref={inputRef}
                className="min-w-0 flex-1 rounded-3xl border-0 bg-surface px-4 py-2.5 text-base text-ink shadow-soft outline-none placeholder:text-ink-faint"
                placeholder={selectedId ? t("chat.yourMsg") : t("chat.pick")}
                value={draft}
                disabled={!selectedId}
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (selectedId) emitTyping(selectedId, e.target.value.length > 0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (mentionHits[0]) {
                      setDraft((value) => insertMention(value, mentionHits[0].name));
                      return;
                    }
                    void onSend();
                  }
                }}
              />
              {draft.trim() ? (
                <button
                  type="submit"
                  disabled={!selectedId}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white shadow-lift"
                  aria-label={t("chat.send")}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M3.4 20.6 21 12 3.4 3.4l2 7.2L16 12l-10.6 1.4-2 7.2Z" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!selectedId}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-lg text-white disabled:opacity-40"
                  aria-label={t("chat.voice")}
                  onClick={() => setRecording(true)}
                >
                  🎤
                </button>
              )}
            </form>
            )}
          </footer>
        </section>
      </div>
    </div>
  );
}
