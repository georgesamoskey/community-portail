"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  cacheChatMedia,
  getCachedChatMediaBlob,
  getCachedChatMediaUrl,
} from "@/lib/chat-cache";
import { bffFetch } from "@/lib/bff-fetch";
import { useI18n } from "@/lib/i18n/context";
import { cx } from "@/lib/cx";

type Media = {
  url?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  size?: number | null;
  purged?: boolean;
};

type Props = {
  roomId: string;
  messageId: string;
  media: Media;
  mine?: boolean;
  onRestored?: (message: unknown) => void;
};

function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function VoiceNote({ src, mine }: { src: string; mine?: boolean }) {
  const { t } = useI18n();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dur, setDur] = useState(0);

  return (
    <div
      className={cx(
        "flex w-[min(100%,240px)] items-center gap-2 rounded-full px-1.5 py-1",
        mine ? "bg-black/10" : "bg-brand-50",
      )}
    >
      <button
        type="button"
        className={cx(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
          mine ? "bg-[#00a884]" : "bg-brand-600",
        )}
        aria-label={playing ? t("chat.pause") : t("chat.play")}
        onClick={() => {
          const el = audioRef.current;
          if (!el) return;
          if (playing) el.pause();
          else void el.play();
        }}
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <div className="min-w-0 flex-1">
        <div className="h-1 overflow-hidden rounded-full bg-black/10">
          <div
            className={cx("h-full rounded-full", mine ? "bg-[#00a884]" : "bg-brand-500")}
            style={{ width: `${dur ? (progress / dur) * 100 : 0}%` }}
          />
        </div>
        <p className={cx("mt-1 text-[11px] tabular-nums", mine ? "text-[#667781]" : "text-ink-mute")}>
          {clock(playing ? progress : dur)}
        </p>
      </div>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
      />
    </div>
  );
}

/**
 * Affiche une PJ : cache local d’abord, sinon le hub.
 */
export function ChatMediaBubble({
  roomId,
  messageId,
  media,
  mine,
  onRestored,
}: Props) {
  const { t } = useI18n();
  const [src, setSrc] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  const [asked, setAsked] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restored, setRestored] = useState(false);
  const mime = media.mimeType || "";
  const isImage = mime.startsWith("image/");
  const isAudio = mime.startsWith("audio/");
  const isVideo = mime.startsWith("video/");

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    (async () => {
      const local = await getCachedChatMediaUrl(roomId, messageId);
      if (cancelled) {
        if (local) URL.revokeObjectURL(local);
        return;
      }
      if (local) {
        revoked = local;
        setSrc(local);
        return;
      }
      if (media.purged || !media.url) {
        setSrc(null);
        return;
      }
      const cached = await cacheChatMedia(roomId, messageId, media.url);
      if (cancelled) {
        if (cached) URL.revokeObjectURL(cached);
        return;
      }
      if (cached) {
        revoked = cached;
        setSrc(cached);
      }
    })();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [roomId, messageId, media.url, media.purged]);

  const requestReshare = async () => {
    setAsking(true);
    try {
      await bffFetch(`/chat/messages/${messageId}/request-media`, {
        method: "POST",
      });
      setAsked(true);
    } catch {
      /* ignore */
    } finally {
      setAsking(false);
    }
  };

  const restoreToHub = async () => {
    setRestoring(true);
    try {
      const blob = await getCachedChatMediaBlob(roomId, messageId);
      if (!blob) return;
      const fd = new FormData();
      fd.append("file", blob, media.fileName || "fichier");
      const updated = await bffFetch(`/chat/messages/${messageId}/restore-media`, {
        method: "POST",
        body: fd,
      });
      setRestored(true);
      onRestored?.(updated);
    } catch {
      /* ignore */
    } finally {
      setRestoring(false);
    }
  };

  const btnClass = mine
    ? "bg-black/10 text-ink hover:bg-black/15"
    : "bg-brand-50 text-brand-800 hover:bg-brand-100";

  if (media.purged && !src && !restored) {
    return (
      <div className="mb-1.5 space-y-1.5 text-[12px] leading-snug text-ink-mute">
        <p>{t("chat.mediaGone")}</p>
        <button
          type="button"
          disabled={asking || asked}
          onClick={() => void requestReshare()}
          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${btnClass} disabled:opacity-60`}
        >
          {asked ? t("chat.asked") : asking ? "…" : t("chat.askMembers")}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-1.5 space-y-1.5">
      {isImage && src ? (
        <button type="button" className="block" onClick={() => setOpen(true)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={media.fileName || t("chat.image")}
            className="max-h-72 w-[min(100%,260px)] rounded-lg object-cover"
          />
        </button>
      ) : null}
      {isAudio && src ? <VoiceNote src={src} mine={mine} /> : null}
      {isVideo && src ? (
        <video
          src={src}
          controls
          playsInline
          preload="metadata"
          className="max-h-72 w-[min(100%,260px)] rounded-lg bg-black"
          aria-label={media.fileName || t("chat.video")}
        />
      ) : null}
      {!isImage && !isAudio && !isVideo && src ? (
        <a
          href={src}
          download={media.fileName || t("chat.file")}
          className={`inline-flex max-w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] font-semibold ${btnClass}`}
        >
          <span aria-hidden>📄</span>
          <span className="truncate">{media.fileName || t("chat.file")}</span>
        </a>
      ) : null}
      {media.purged && src && !restored ? (
        <div className="space-y-1 text-[12px] leading-snug text-ink-mute">
          <p>{t("chat.localCopy")}</p>
          <button
            type="button"
            disabled={restoring}
            onClick={() => void restoreToHub()}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${btnClass} disabled:opacity-60`}
          >
            {restoring ? t("chat.restoring") : t("chat.restore")}
          </button>
        </div>
      ) : null}
      {restored ? (
        <p className="text-[11px] font-semibold text-brand-700">{t("chat.restored")}</p>
      ) : null}
      {open && src
        ? createPortal(
            <button
              type="button"
              className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4"
              onClick={() => setOpen(false)}
              aria-label={t("common.close")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={media.fileName || t("chat.image")}
                className="max-h-[90dvh] max-w-full rounded-lg object-contain"
              />
            </button>,
            document.body,
          )
        : null}
    </div>
  );
}
