"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ChatMessage } from "@/lib/portal-api";

type WsTokenResponse = { accessToken: string; wsOrigin: string };

async function fetchWsCreds(): Promise<WsTokenResponse> {
  const res = await fetch("/api/ws-token", { credentials: "include" });
  if (!res.ok) throw new Error("Impossible d’obtenir le jeton WebSocket");
  return res.json() as Promise<WsTokenResponse>;
}

export function useChatSocket(enabled: boolean) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState<{ userId: string; userName?: string } | null>(
    null,
  );

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let socket: Socket | null = null;

    (async () => {
      try {
        const { accessToken, wsOrigin } = await fetchWsCreds();
        if (cancelled) return;
        socket = io(`${wsOrigin}/chat`, {
          transports: ["websocket", "polling"],
          auth: { token: accessToken },
          query: { token: accessToken },
          reconnection: true,
          reconnectionAttempts: 8,
        });
        socketRef.current = socket;

        socket.on("connect", () => {
          setConnected(true);
          setError(null);
        });
        socket.on("disconnect", () => setConnected(false));
        socket.on("connect_error", (err) => {
          setError(err.message || "Connexion chat impossible");
          setConnected(false);
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
            if (p.isTyping) setTyping({ userId: p.userId, userName: p.userName });
            else setTyping(null);
          },
        );
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erreur WebSocket");
        }
      }
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [enabled]);

  const clearLive = useCallback(() => setLiveMessages([]), []);

  const sendMessage = useCallback((roomId: string, content: string) => {
    socketRef.current?.emit("sendMessage", { roomId, content });
  }, []);

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
    error,
    liveMessages,
    clearLive,
    typing,
    sendMessage,
    joinRoom,
    emitTyping,
    markAsRead,
  };
}
