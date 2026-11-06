"use client";

import { useRef, useState, type PointerEvent } from "react";
import { MemberAvatar } from "@/components/member-avatar";
import {
  MemberTrustBadge,
  type TrustSignals,
} from "@/components/member-trust-badge";
import { ChatMediaBubble } from "@/components/chat-media-bubble";
import { chatSenderLabel, type ChatMessage } from "@/lib/portal-api";
import { cx } from "@/lib/cx";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "👏", "🔥"];
const TOKEN =
  /https?:\/\/[^\s<>"']+|@[\p{L}0-9._-]{2,32}(?![\p{L}0-9._-])/gu;

type Piece = { kind: "text" | "at" | "url"; value: string };

function splitText(text: string): Piece[] {
  const out: Piece[] = [];
  const re = new RegExp(TOKEN.source, "gu");
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      out.push({ kind: "text", value: text.slice(last, match.index) });
    }
    const value = match[0];
    out.push({ kind: value.startsWith("@") ? "at" : "url", value });
    last = match.index + value.length;
  }
  if (last < text.length) out.push({ kind: "text", value: text.slice(last) });
  return out;
}

function Marked({ text, mark }: { text: string; mark?: string }) {
  const q = mark?.trim() ?? "";
  if (q.length < 2) return <>{text}</>;
  const at = text.toLowerCase().indexOf(q.toLowerCase());
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded bg-amber-200/90 px-0.5 text-inherit">
        {text.slice(at, at + q.length)}
      </mark>
      {text.slice(at + q.length)}
    </>
  );
}

function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function ChatText({ text, mark }: { text: string; mark?: string }) {
  const parts = splitText(text);
  const urls = parts.filter((part) => part.kind === "url").slice(0, 2);
  return (
    <>
      {parts.map((part, i) => {
        if (part.kind === "at") {
          return (
            <span key={i} className="chat-mention">
              {part.value}
            </span>
          );
        }
        if (part.kind === "url") {
          return (
            <a
              key={i}
              href={part.value}
              target="_blank"
              rel="noopener noreferrer"
              className="chat-link break-all"
            >
              {part.value}
            </a>
          );
        }
        return <Marked key={i} text={part.value} mark={mark} />;
      })}
      {urls.map((part) => (
        <a
          key={part.value}
          href={part.value}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 block rounded-lg bg-black/[0.06] px-2.5 py-1.5"
        >
          <span className="block text-[11px] font-bold uppercase tracking-wide text-brand-700">
            {linkHost(part.value)}
          </span>
          <span className="block truncate text-[12px] opacity-80">{part.value}</span>
        </a>
      ))}
    </>
  );
}

function useSwipeReply(onFire: () => void) {
  const origin = useRef<{ x: number; y: number; lock: "" | "x" | "y" } | null>(
    null,
  );
  const [shift, setShift] = useState(0);
  const shiftRef = useRef(0);

  const onDown = (e: PointerEvent) => {
    const el = e.target as HTMLElement;
    if (el.closest("button,a,video,audio,input")) return;
    origin.current = { x: e.clientX, y: e.clientY, lock: "" };
  };
  const onMove = (e: PointerEvent) => {
    const start = origin.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!start.lock) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      start.lock = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (start.lock !== "x") return;
    const next = Math.max(0, Math.min(72, dx));
    shiftRef.current = next;
    setShift(next);
  };
  const onUp = () => {
    if (shiftRef.current >= 56) onFire();
    shiftRef.current = 0;
    setShift(0);
    origin.current = null;
  };

  return { shift, onDown, onMove, onUp };
}

export function chatDayKey(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function chatDayLabel(
  iso: string | undefined,
  t: (path: string) => string,
): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const start = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(now) - start(d)) / 86400000);
  if (diff === 0) return t("chat.today");
  if (diff === 1) return t("chat.yesterday");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function chatClock(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function chatListTime(
  iso: string | null | undefined,
  yesterday: string,
): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const start = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(now) - start(d)) / 86400000);
  if (diff === 0) return chatClock(iso);
  if (diff === 1) return yesterday;
  if (diff < 7) {
    return d.toLocaleDateString(undefined, { weekday: "short" });
  }
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" });
}

function Ticks({
  pending,
  read,
}: {
  pending?: boolean;
  read: boolean;
}) {
  if (pending) {
    return (
      <span className="chat-tick" aria-hidden>
        ○
      </span>
    );
  }
  return (
    <span className={cx("chat-tick", read && "chat-tick-read")} aria-hidden>
      {read ? "✓✓" : "✓"}
    </span>
  );
}

export function ChatMessageRow({
  message: m,
  mine,
  sameAuthor,
  online,
  trust,
  myTrust,
  roomId,
  read,
  onReact,
  onReply,
  onPin,
  onDelete,
  onVote,
  onMedia,
  mark,
  t,
}: {
  message: ChatMessage;
  mine: boolean;
  sameAuthor: boolean;
  online: boolean;
  trust: TrustSignals | null;
  myTrust: TrustSignals;
  roomId: string;
  read: boolean;
  onReact: (id: string, emoji: string) => void;
  onReply: (m: ChatMessage) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onVote: (id: string, index: number) => void;
  onMedia: (updated: ChatMessage) => void;
  mark?: string;
  t: (path: string) => string;
}) {
  const [menu, setMenu] = useState(false);
  const swipe = useSwipeReply(() => onReply(m));
  const label = chatSenderLabel(m);
  const reactionMap = new Map<string, number>();
  for (const r of m.reactions ?? []) {
    reactionMap.set(r.reaction, (reactionMap.get(r.reaction) ?? 0) + 1);
  }

  return (
    <div
      className={cx(
        "chat-msg group flex gap-2",
        mine ? "flex-row-reverse" : "flex-row",
        sameAuthor ? "mt-0.5" : "mt-2.5",
        m.pending && "opacity-80",
        m.failed && "opacity-50",
      )}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu(true);
      }}
      onPointerDown={swipe.onDown}
      onPointerMove={swipe.onMove}
      onPointerUp={swipe.onUp}
      onPointerCancel={swipe.onUp}
    >
      {!mine && !sameAuthor ? (
        <MemberAvatar
          name={label}
          avatarUrl={m.senderAvatar}
          size="sm"
          online={online}
          trustRing={
            !!(trust?.currentStreak || trust?.level || trust?.ambassador)
          }
        />
      ) : (
        <span className="w-8 shrink-0" />
      )}
      <div
        className="relative max-w-[min(82%,26rem)]"
        style={swipe.shift ? { transform: `translateX(${swipe.shift}px)` } : undefined}
      >
        {swipe.shift > 12 ? (
          <span
            className="absolute -left-7 top-1/2 -translate-y-1/2 text-sm text-brand-600"
            aria-hidden
          >
            ↩
          </span>
        ) : null}
        {!mine && !sameAuthor ? (
          <div className="mb-0.5 flex items-center gap-1.5 px-1">
            <p className="text-[12px] font-bold text-brand-700">{label}</p>
            <MemberTrustBadge signals={trust} size="xs" />
          </div>
        ) : null}
        <div
          className={cx(
            "chat-bubble relative px-3 pb-5 pt-2 text-[15.5px] leading-relaxed",
            mine ? "chat-bubble-out" : "chat-bubble-in",
            sameAuthor && (mine ? "chat-bubble-out-cont" : "chat-bubble-in-cont"),
          )}
        >
          {m.replyToPreview ? (
            <p
              className={cx(
                "mb-1 rounded-md border-l-[3px] px-2 py-1 text-[12px] leading-snug",
                mine
                  ? "border-white/70 bg-white/15"
                  : "border-brand-500 bg-brand-50 text-ink-soft",
              )}
            >
              <span className="font-bold">
                {m.replyToPreview.senderName ?? t("chat.you")}
              </span>
              <span className="mt-0.5 block truncate opacity-80">
                {m.replyToPreview.snippet}
              </span>
            </p>
          ) : null}
          {m.media ? (
            <ChatMediaBubble
              roomId={m.roomId ?? roomId}
              messageId={m.id}
              media={m.media}
              mine={mine}
              onRestored={(updated) => {
                const u = updated as ChatMessage;
                if (u?.id) onMedia(u);
              }}
            />
          ) : null}
          {m.content ? (
            <p className="whitespace-pre-wrap break-words pr-16">
              <ChatText text={m.content} mark={mark} />
            </p>
          ) : (
            <span className="inline-block w-12" />
          )}
          <span
            className={cx(
              "chat-meta absolute bottom-1 right-2 inline-flex items-center gap-0.5 text-[11px] leading-none",
              !mine && "text-ink-faint",
            )}
          >
            {chatClock(m.createdAt)}
            {mine ? <Ticks pending={m.pending} read={read} /> : null}
          </span>
          <button
            type="button"
            className="absolute -top-1 right-1 rounded-full px-1 text-[10px] text-ink-faint opacity-70 hover:opacity-100"
            aria-label={t("chat.react")}
            onClick={() => setMenu((v) => !v)}
          >
            ▾
          </button>
        </div>
        {menu ? (
          <div
            className={cx(
              "absolute z-10 mt-1 flex max-w-full flex-wrap gap-1 rounded-full bg-surface px-1.5 py-1 shadow-lift ring-1 ring-ink/[0.08]",
              mine ? "right-0" : "left-8",
            )}
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="rounded-full px-1.5 py-0.5 text-base hover:bg-brand-50"
                onClick={() => {
                  onReact(m.id, emoji);
                  setMenu(false);
                }}
              >
                {emoji}
              </button>
            ))}
            <button
              type="button"
              className="rounded-full px-2 py-0.5 text-[11px] font-bold text-ink-soft hover:bg-brand-50"
              onClick={() => {
                onReply(m);
                setMenu(false);
              }}
            >
              {t("chat.reply")}
            </button>
            <button
              type="button"
              className="rounded-full px-2 py-0.5 text-[11px] font-bold text-ink-soft hover:bg-brand-50"
              onClick={() => {
                onPin(m.id);
                setMenu(false);
              }}
            >
              {t("chat.pin")}
            </button>
            {mine ? (
              <button
                type="button"
                className="rounded-full px-2 py-0.5 text-[11px] font-bold text-rose-700 hover:bg-rose-50"
                onClick={() => {
                  onDelete(m.id);
                  setMenu(false);
                }}
              >
                {t("chat.delete")}
              </button>
            ) : null}
          </div>
        ) : null}
        {m.poll?.options?.length ? (
          <div className="mt-1 space-y-1">
            {m.poll.options.map((opt, oi) => (
              <button
                key={oi}
                type="button"
                className="block w-full rounded-xl bg-surface px-3 py-2 text-left text-sm ring-1 ring-ink/[0.06] hover:bg-brand-50"
                onClick={() => onVote(m.id, oi)}
              >
                {typeof opt === "string" ? opt : String(opt)}
              </button>
            ))}
          </div>
        ) : null}
        {reactionMap.size > 0 ? (
          <div className={cx("mt-1 flex gap-1", mine ? "justify-end" : "justify-start")}>
            {[...reactionMap.entries()].map(([emoji, count]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(m.id, emoji)}
                className="-mt-2 rounded-full bg-surface px-1.5 py-0.5 text-[12px] shadow-soft ring-1 ring-ink/[0.06]"
              >
                {emoji}
                {count > 1 ? ` ${count}` : ""}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
