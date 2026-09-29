"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ChatMessage } from "@/lib/portal-api";

type WsTokenResponse = { accessToken: string; wsOrigin: string };

export type ChatSocketStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline"
  | "error";

async function fetchWsCreds(): Promise<WsTokenResponse> {
  const res = await fetch("/api/ws-token", {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("SESSION_EXPIRED");
    throw new Error("Impossible d’obtenir le jeton WebSocket");
  }
  const data = (await res.json()) as WsTokenResponse;
  const origin = (data.wsOrigin || "").replace(/\/$/, "");
  const unreachable =
    !origin ||
    origin.includes("localhost") ||
    origin.includes("127.0.0.1") ||
    origin.includes("://app");
  return {
    accessToken: data.accessToken,
    wsOrigin: unreachable
      ? typeof window !== "undefined"
        ? window.location.origin
        : origin
      : origin,
  };
}

export function useChatSocket(enabled: boolean) {
  const socketRef = useRef<Socket | null>(null);
  const tokenRef = useRef<string>("");
  const originRef = useRef<string>("");
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<ChatSocketStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState<{
    userId: string;
    userName?: string;
  } | null>(null);
  const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bindSocket = useCallback((socket: Socket) => {
    socket.on("connect", () => {
      setConnected(true);
      setStatus("connected");
      setError(null);
    });
    socket.on("disconnect", (reason) => {
      setConnected(false);
      if (reason === "io client disconnect") return;
      setStatus(
        typeof navigator !== "undefined" && !navigator.onLine
          ? "offline"
          : "reconnecting",
      );
    });
    socket.io.on("reconnect_attempt", () => {
      setStatus("reconnecting");
    });
    socket.io.on("reconnect", () => {
      setConnected(true);
      setStatus("connected");
      setError(null);
    });
    socket.io.on("reconnect_failed", () => {
      setStatus("error");
      setError("Connexion chat perdue — réessayez");
    });
    socket.on("connect_error", (err) => {
      if (socket.connected) return;
      setConnected(false);
      setStatus(
        typeof navigator !== "undefined" && !navigator.onLine
          ? "offline"
          : "reconnecting",
      );
      setError(err.message || "Connexion chat impossible");
    });
    socket.on("error", (msg: unknown) => {
      setError(typeof msg === "string" ? msg : "Erreur chat");
    });
    socket.on("newMessage", (msg: ChatMessage) => {
      setLiveMessages((prev) => [...prev, msg]);
    });
    socket.on("messageUpdated", (msg: ChatMessage) => {
      if (!msg?.id) return;
      setLiveMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === msg.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...msg };
          return next;
        }
        return [...prev, msg];
      });
    });
    socket.on(
      "messageReaction",
      (payload: {
        messageId?: string;
        userId?: string;
        reaction?: string;
        removed?: boolean;
        roomId?: string;
      }) => {
        if (!payload.messageId || !payload.reaction) return;
        setLiveMessages((prev) =>
          prev.map((m) => {
            if (m.id !== payload.messageId) return m;
            const reactions = [...(m.reactions ?? [])];
            if (payload.removed) {
              return {
                ...m,
                reactions: reactions.filter(
                  (r) =>
                    !(
                      r.userId === payload.userId &&
                      r.reaction === payload.reaction
                    ),
                ),
              };
            }
            return {
              ...m,
              reactions: [
                ...reactions,
                {
                  userId: payload.userId,
                  reaction: payload.reaction!,
                },
              ],
            };
          }),
        );
      },
    );
    socket.on(
      "userTyping",
      (p: { userId: string; userName?: string; isTyping?: boolean }) => {
        if (typingClearRef.current) clearTimeout(typingClearRef.current);
        if (p.isTyping) {
          setTyping({ userId: p.userId, userName: p.userName });
          typingClearRef.current = setTimeout(() => setTyping(null), 4000);
        } else {
          setTyping(null);
        }
      },
    );
  }, []);

  const connect = useCallback(async () => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      setStatus("offline");
      setConnected(false);
      setError("Hors ligne");
      return;
    }
    setStatus("connecting");
    const { accessToken, wsOrigin } = await fetchWsCreds();
    tokenRef.current = accessToken;
    originRef.current = wsOrigin;

    socketRef.current?.removeAllListeners();
    socketRef.current?.disconnect();

    const socket = io(`${wsOrigin}/chat`, {
      path: "/socket.io/",
      transports: ["polling", "websocket"],
      upgrade: true,
      rememberUpgrade: true,
      auth: (cb) => {
        cb({ token: tokenRef.current });
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
      reconnectionDelayMax: 8_000,
      randomizationFactor: 0.4,
      timeout: 15_000,
      forceNew: true,
    });
    socketRef.current = socket;
    bindSocket(socket);
  }, [bindSocket]);

  const reconnect = useCallback(() => {
    void (async () => {
      try {
        // Rafraîchir le jeton avant de forcer une reconnexion
        const { accessToken } = await fetchWsCreds();
        tokenRef.current = accessToken;
        setError(null);
        setStatus("reconnecting");
        const s = socketRef.current;
        if (s) {
          s.auth = { token: accessToken };
          s.connect();
        } else {
          await connect();
        }
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Erreur WebSocket");
      }
    })();
  }, [connect]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      try {
        if (cancelled) return;
        await connect();
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setError(e instanceof Error ? e.message : "Erreur WebSocket");
        }
      }
    })();

    const onOnline = () => {
      setStatus("reconnecting");
      reconnect();
    };
    const onOffline = () => {
      setConnected(false);
      setStatus("offline");
      setError("Hors ligne");
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const s = socketRef.current;
      if (!s?.connected && navigator.onLine) reconnect();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
      if (typingClearRef.current) clearTimeout(typingClearRef.current);
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [enabled, connect, reconnect]);

  const clearLive = useCallback(() => setLiveMessages([]), []);

  const sendMessage = useCallback(
    (
      roomId: string,
      content: string,
      opts?: { clientMessageId?: string; replyToId?: string },
    ) => {
      socketRef.current?.emit("sendMessage", {
        roomId,
        content,
        clientMessageId: opts?.clientMessageId,
        replyTo: opts?.replyToId,
      });
    },
    [],
  );

  const joinRoom = useCallback((roomId: string) => {
    socketRef.current?.emit("joinRoom", { roomId });
  }, []);

  const emitTyping = useCallback((roomId: string, isTyping: boolean) => {
    socketRef.current?.emit("typing", { roomId, isTyping });
  }, []);

  const markAsRead = useCallback((roomId: string, messageId: string) => {
    socketRef.current?.emit("markAsRead", { roomId, messageId });
  }, []);

  return {
    connected,
    status,
    error,
    liveMessages,
    clearLive,
    typing,
    sendMessage,
    joinRoom,
    emitTyping,
    markAsRead,
    reconnect,
  };
}
