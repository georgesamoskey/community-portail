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
  initialsFrom,
  normalizeList,
  sortRoomsByActivity,
  type ChatMessage,
  type ChatRoom,
} from "@/lib/portal-api";
import { cx } from "@/lib/cx";
import { useI18n } from "@/lib/i18n/context";
import { formatDateTime } from "@/lib/ui";
import { ChatEventCard } from "@/components/chat-event-card";
import { loadCachedMessages, saveCachedMessages } from "@/lib/chat-cache";
import { africaShareLinks } from "@/lib/africa-share";

const QUICK_REACTIONS = ["👍", "❤️", "👏", "🔥", "😂"];

const QUICK_REPLIES_FR = [
  { id: "paid", text: "J’ai cotisé ✅" },
  { id: "tomorrow", text: "Je cotise demain 🤝" },
  { id: "nudge", text: "On avance ensemble — qui suit ?" },
];

function relativeTime(
  iso: string | null | undefined,
  tr: (path: string, params?: Record<string, string | number>) => string,
): string {
  if (!iso) return "";
  const ts = Date.parse(iso);
  if (!ts) return "";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return tr("chat.justNow");
  if (m < 60) return tr("chat.minAgo", { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return tr("chat.hAgo", { n: h });
  const d = Math.floor(h / 24);
  if (d < 7) return tr("chat.dAgo", { n: d });
  return formatDateTime(ts);
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs";
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-mint-600 font-bold text-white shadow-soft",
        dim,
      )}
    >
      {initialsFrom(name) || "?"}
    </span>
  );
}

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
  const [pollQ, setPollQ] = useState("");
  const [commitAmt, setCommitAmt] = useState("");
  const defaultPollOpts = useMemo(() => `${t("chat.yes")}\n${t("chat.no")}`, [t]);
  const [pollOpts, setPollOpts] = useState(defaultPollOpts);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    connected,
    error: wsError,
    liveMessages,
    clearLive,
    typing,
    sendMessage,
    joinRoom,
    emitTyping,
    markAsRead,
  } = useChatSocket(true);

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
        const last = list[0] ?? list[list.length - 1];
        if (last?.id) {
          markAsRead(selectedId, last.id);
          try {
            await bffFetch(`/chat/messages/${last.id}/read`, {
              method: "POST",
            });
          } catch {
            /* optional */
          }
        }
        void unread.refresh();
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

  const messages = useMemo(() => {
    const byId = new Map<string, ChatMessage>();
    for (const m of history) if (m.id) byId.set(m.id, m);
    for (const m of roomLive) if (m.id) byId.set(m.id, m);
    const list = [...byId.values()].sort((a, b) =>
      String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")),
    );
    // Drop optimistic tmp if real message arrived
    return list.filter((m) => {
      if (!String(m.id).startsWith("tmp-")) return true;
      return !list.some(
        (o) =>
          !String(o.id).startsWith("tmp-") &&
          o.content === m.content &&
          o.senderId === m.senderId,
      );
    });
  }, [history, roomLive]);

  useEffect(() => {
    if (selectedId && messages.length) {
      void saveCachedMessages(
        selectedId,
        messages.filter((m) => !m.pending && !String(m.id).startsWith("tmp-")),
      );
    }
  }, [selectedId, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typing, selectedId]);

  const filteredRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter(
      (r) =>
        (r.name ?? "").toLowerCase().includes(q) ||
        (r.type ?? "").toLowerCase().includes(q),
    );
  }, [rooms, query]);

  const onSend = useCallback(async () => {
    const content = draft.trim();
    if (!content || !selectedId) return;
    setSendError(null);
    setDraft("");
    emitTyping(selectedId, false);

    const tmpId = `tmp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tmpId,
      roomId: selectedId,
      content,
      type: "text",
      senderId: myId,
      senderName: myName,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setHistory((prev) => [...prev, optimistic]);

    if (connected) {
      sendMessage(selectedId, content);
      return;
    }
    try {
      const created = await bffFetch<ChatMessage>(
        `/chat/rooms/${selectedId}/messages`,
        { method: "POST", body: JSON.stringify({ content }) },
      );
      setHistory((prev) => [
        ...prev.filter((m) => m.id !== tmpId),
        created,
      ]);
    } catch (e) {
      setHistory((prev) =>
        prev.map((m) =>
          m.id === tmpId ? { ...m, pending: false, failed: true } : m,
        ),
      );
      setSendError(e instanceof BffError ? e.message : t("chat.sendFail"));
      setDraft(content);
    }
  }, [
    draft,
    selectedId,
    connected,
    sendMessage,
    emitTyping,
    t,
    myId,
    myName,
  ]);

  const onSendFile = async (file: File) => {
    if (!selectedId) return;
    setSendError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { bffApi } = await import("@/lib/bff");
      const res = await fetch(bffApi(`/chat/rooms/${selectedId}/file`), {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Erreur ${res.status}`);
      }
      const created = (await res.json()) as ChatMessage;
      if (created?.id) setHistory((prev) => [...prev, created]);
      else {
        // refresh history
        const data = await bffFetch<ChatMessage[] | { items?: ChatMessage[] }>(
          `/chat/rooms/${selectedId}/messages?limit=80`,
        );
        const list = Array.isArray(data)
          ? data
          : normalizeList<ChatMessage>(data, ["items", "messages", "data"]);
        setHistory(list.slice().reverse());
      }
    } catch (e) {
      setSendError(e instanceof Error ? e.message : t("chat.fileFail"));
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

  const selectRoom = (id: string) => {
    setSelectedId(id);
    setMobileShowThread(true);
    inputRef.current?.focus();
  };

  return (
    <div className="chat-shell flex h-[calc(100dvh-7.5rem)] flex-col overflow-hidden border-ink/[0.06] bg-surface md:h-[calc(100dvh-8.5rem)] md:rounded-2.5xl md:border md:shadow-chat">
      <div className="flex items-center justify-between gap-3 border-b border-ink/[0.06] px-4 py-3.5 md:px-5">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-ink md:text-2xl">
            {t("chat.title")}
          </h1>
          <p className="mt-0.5 text-xs text-ink-mute">
            {t("chat.subtitle")}
            {(unread.data?.count ?? 0) > 0
              ? ` ${t("chat.unread", { n: unread.data!.count ?? 0 })}`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cx(
              "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold",
              connected
                ? "bg-mint-100 text-mint-800"
                : "bg-amber-100 text-amber-900",
            )}
          >
            <span
              className={cx(
                "online-dot h-1.5 w-1.5 rounded-full",
                connected ? "bg-mint-500" : "bg-amber-500",
              )}
            />
            {connected ? t("chat.online") : t("chat.offline")}
          </span>
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
        <p className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-sm text-amber-950">
          {sendError ?? wsError}
        </p>
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
              className="w-full rounded-xl border border-ink/[0.08] bg-surface px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
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
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => selectRoom(r.id)}
                        className={cx(
                          "flex w-full items-center gap-3 px-3 py-3 text-left transition",
                          active
                            ? "bg-surface shadow-soft ring-1 ring-inset ring-brand-200"
                            : "hover:bg-surface/80",
                        )}
                      >
                        <Avatar name={label} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate font-semibold text-ink">
                              {label}
                            </p>
                            <span className="shrink-0 text-[10px] font-medium text-ink-faint">
                              {relativeTime(r.lastMessageAt ?? r.updatedAt, t)}
                            </span>
                          </div>
                          <p className="truncate text-xs text-ink-mute">
                            {r.memberCount
                              ? t("chat.people", { n: r.memberCount })
                              : r.type ?? "discussion"}
                            {r.messageCount
                              ? ` · ${t("chat.messagesCount", { n: r.messageCount })}`
                              : ""}
                          </p>
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
            "chat-thread-bg min-h-0 flex-col",
            mobileShowThread ? "flex" : "hidden lg:flex",
          )}
        >
          <header className="flex items-center gap-3 border-b border-ink/[0.06] bg-surface/90 px-3 py-3 backdrop-blur-md sm:px-4">
            <button
              type="button"
              className="rounded-xl px-2 py-1 text-sm font-semibold text-ink-soft hover:bg-brand-50 lg:hidden"
              onClick={() => setMobileShowThread(false)}
            >
              ←
            </button>
            {selected || selectedId ? (
              <>
                <Avatar
                  name={selected?.name ?? selectedId?.slice(0, 8) ?? "?"}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg font-bold tracking-tight text-ink">
                    {selected?.name ?? t("chat.roomFallback", { id: selectedId?.slice(0, 8) ?? "" })}
                  </p>
                  <p className="truncate text-xs text-ink-mute">
                    {typing
                      ? `${typing.userName ? `${typing.userName}…` : t("chat.typing")}`
                      : [
                          selected?.memberCount
                            ? t("chat.people", { n: selected.memberCount })
                            : null,
                          pulse.data?.circleStreakDays
                            ? `🔥 ${pulse.data.circleStreakDays}j`
                            : null,
                          pulse.data?.progressPct != null
                            ? `${pulse.data.progressPct}%`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || t("chat.groupConvo")}
                  </p>
                </div>
                {contextHref ? (
                  <Link
                    href={contextHref}
                    className="shrink-0 rounded-xl border border-ink/[0.08] bg-surface px-3 py-1.5 text-xs font-bold text-ink hover:border-brand-300 hover:text-brand-600"
                  >
                    {t("chat.seeGroup")}
                  </Link>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-ink-mute">{t("chat.pick")}</p>
            )}
          </header>

          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4 sm:px-5">
            {!selectedId && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-mint-600 text-white shadow-lift">
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M7 18.5 4 21V7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v8a2.5 2.5 0 0 1-2.5 2.5H7Z"
                      stroke="currentColor"
                      strokeWidth="1.75"
                    />
                  </svg>
                </div>
                <p className="font-display text-xl font-bold tracking-tight text-ink">
                  {t("chat.threadEmpty")}
                </p>
                <p className="max-w-sm text-sm leading-relaxed text-ink-mute">
                  {t("chat.threadHint")}
                </p>
              </div>
            )}
            {loadingMsg && (
              <p className="text-center text-sm text-ink-mute">
                {t("chat.loadingMsgs")}
              </p>
            )}
            {!loadingMsg && messages.length === 0 && selectedId && (
              <div className="mx-auto max-w-sm rounded-2.5xl border border-dashed border-ink/10 bg-surface/80 p-6 text-center shadow-soft">
                <p className="font-display font-bold text-ink">
                  {t("chat.startConvo")}
                </p>
                <p className="mt-1.5 text-sm text-ink-mute">
                  {t("chat.startHint")}
                </p>
              </div>
            )}
            {messages.map((m, idx) => {
              const mine =
                !!myId &&
                (m.senderId === myId || m.sender?.id === myId);
              const label = chatSenderLabel(m);
              const prev = messages[idx - 1];
              const sameAuthor =
                prev &&
                (prev.senderId ?? prev.sender?.id) ===
                  (m.senderId ?? m.sender?.id);
              const isSystem = !!m.eventType || m.type === "system";
              const reactionMap = new Map<string, number>();
              for (const r of m.reactions ?? []) {
                reactionMap.set(
                  r.reaction,
                  (reactionMap.get(r.reaction) ?? 0) + 1,
                );
              }

              if (isSystem) {
                return (
                  <ChatEventCard
                    key={m.id}
                    message={m}
                    highlight={
                      pulse.data?.pinnedMessageId != null &&
                      pulse.data.pinnedMessageId === m.id
                    }
                  />
                );
              }

              return (
                <div
                  key={m.id}
                  className={cx(
                    "chat-msg group flex gap-2",
                    mine ? "flex-row-reverse" : "flex-row",
                    sameAuthor ? "mt-0.5" : "mt-3",
                    m.pending && "opacity-70",
                    m.failed && "opacity-50",
                  )}
                >
                  {!mine && !sameAuthor ? (
                    <Avatar name={label} size="sm" />
                  ) : (
                    <span className="w-8 shrink-0" />
                  )}
                  <div className="max-w-[min(85%,28rem)]">
                    {!mine && !sameAuthor && (
                      <p className="mb-0.5 px-1 text-[11px] font-bold text-ink-soft">
                        {label}
                      </p>
                    )}
                    <div
                      className={cx(
                        "relative rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                        mine
                          ? "rounded-br-md bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lift"
                          : "rounded-bl-md bg-surface text-ink shadow-soft ring-1 ring-ink/[0.05]",
                      )}
                    >
                      {m.replyToPreview ? (
                        <p
                          className={cx(
                            "mb-1 border-l-2 pl-2 text-[11px] opacity-80",
                            mine ? "border-white/50" : "border-brand-300",
                          )}
                        >
                          {m.replyToPreview.senderName}:{" "}
                          {m.replyToPreview.snippet}
                        </p>
                      ) : null}
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      <p
                        className={cx(
                          "mt-1 text-[10px] font-medium",
                          mine ? "text-white/70" : "text-ink-faint",
                        )}
                      >
                        {m.createdAt
                          ? formatDateTime(m.createdAt).split(", ").pop() ?? formatDateTime(m.createdAt)
                          : ""}
                      </p>
                      <div
                        className={cx(
                          "absolute -bottom-3 flex gap-0.5 opacity-0 transition group-hover:opacity-100",
                          mine ? "right-2" : "left-2",
                        )}
                      >
                        {QUICK_REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className="rounded-lg bg-surface px-1.5 py-0.5 text-xs shadow-soft ring-1 ring-ink/[0.06] hover:bg-brand-50"
                            onClick={() => void react(m.id, emoji)}
                            title={t("chat.react")}
                          >
                            {emoji}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="rounded-lg bg-surface px-1.5 py-0.5 text-[10px] font-bold shadow-soft ring-1 ring-ink/[0.06] hover:bg-brand-50"
                          title={t("chat.pin")}
                          onClick={() =>
                            void bffFetch(`/chat/rooms/${selectedId}/pin`, {
                              method: "PUT",
                              body: JSON.stringify({ messageId: m.id }),
                            }).catch(() => null)
                          }
                        >
                          {t("chat.pin")}
                        </button>
                        {mine ? (
                          <button
                            type="button"
                            className="rounded-lg bg-surface px-1.5 py-0.5 text-[10px] font-bold text-rose-700 shadow-soft ring-1 ring-ink/[0.06]"
                            title={t("chat.delete")}
                            onClick={() =>
                              void bffFetch(`/chat/messages/${m.id}`, {
                                method: "DELETE",
                              }).then(() =>
                                setHistory((prev) =>
                                  prev.filter((x) => x.id !== m.id),
                                ),
                              )
                            }
                          >
                            {t("chat.delete")}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {m.poll?.options?.length ? (
                      <div className="mt-2 space-y-1">
                        {m.poll.options.map((opt, oi) => (
                          <button
                            key={oi}
                            type="button"
                            className="block w-full rounded-lg bg-surface px-2 py-1 text-left text-xs ring-1 ring-ink/[0.06] hover:bg-brand-50"
                            onClick={() =>
                              void bffFetch(
                                `/chat/messages/${m.id}/poll/vote`,
                                {
                                  method: "POST",
                                  body: JSON.stringify({ optionIndex: oi }),
                                },
                              )
                            }
                          >
                            {typeof opt === "string" ? opt : String(opt)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {reactionMap.size > 0 && (
                      <div
                        className={cx(
                          "mt-2 flex flex-wrap gap-1",
                          mine ? "justify-end" : "justify-start",
                        )}
                      >
                        {[...reactionMap.entries()].map(([emoji, count]) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => void react(m.id, emoji)}
                            className="rounded-lg bg-surface px-2 py-0.5 text-[11px] shadow-soft ring-1 ring-ink/[0.06]"
                          >
                            {emoji} {count > 1 ? count : ""}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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

          <footer className="border-t border-ink/[0.06] bg-surface p-3 sm:p-4">
            {selectedId ? (
              <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
                {QUICK_REPLIES_FR.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    className="shrink-0 rounded-full border border-ink/[0.08] bg-surface-sunken/50 px-3 py-1 text-xs font-semibold text-ink hover:border-brand-300 hover:bg-brand-50"
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
                  className="shrink-0 rounded-full border border-mint-200 bg-mint-50 px-3 py-1 text-xs font-bold text-mint-900"
                >
                  + Inviter
                </Link>
                {selected?.contributionId || selected?.tontineId ? (
                  <a
                    href={
                      africaShareLinks(
                        `Rejoins notre cercle « ${selected?.name ?? "Community"} » sur Community`,
                        typeof window !== "undefined"
                          ? `${window.location.origin}/app/chat?room=${selectedId}`
                          : "",
                      ).whatsapp
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-full bg-[#25D366] px-3 py-1 text-xs font-bold text-white"
                  >
                    WhatsApp
                  </a>
                ) : null}
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
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void onSend();
              }}
            >
              <button
                type="button"
                className="inline-flex h-[46px] w-[46px] items-center justify-center rounded-2xl border border-ink/[0.08] text-xs font-bold text-ink-soft hover:bg-brand-50"
                title={t("chat.tools")}
                onClick={() => setShowTools((v) => !v)}
              >
                +
              </button>
              <label className="inline-flex h-[46px] w-[46px] cursor-pointer items-center justify-center rounded-2xl border border-ink/[0.08] text-ink-soft hover:bg-brand-50">
                <span className="sr-only">{t("chat.attach")}</span>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
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
                    if (f) void onSendFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <input
                ref={inputRef}
                className="flex-1 rounded-2xl border border-ink/[0.08] bg-surface-sunken/50 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-brand-400 focus:bg-surface focus:ring-2 focus:ring-brand-500/20"
                placeholder={
                  selectedId
                    ? myName
                      ? t("chat.writeAs", { name: myName.split(" ")[0] })
                      : t("chat.yourMsg")
                    : t("chat.pick")
                }
                value={draft}
                disabled={!selectedId}
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (selectedId)
                    emitTyping(selectedId, e.target.value.length > 0);
                }}
              />
              <button
                type="submit"
                disabled={!selectedId || !draft.trim()}
                className="rounded-2xl bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-lift transition hover:bg-brand-600 disabled:opacity-40"
              >
                {t("chat.send")}
              </button>
            </form>
          </footer>
        </section>
      </div>
    </div>
  );
}
