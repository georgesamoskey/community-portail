"use client";

import { useEffect, useState } from "react";
import {
  cacheChatMedia,
  getCachedChatMediaBlob,
  getCachedChatMediaUrl,
} from "@/lib/chat-cache";
import { bffFetch } from "@/lib/bff-fetch";

type Props = {
  roomId: string;
  messageId: string;
  media: {
    url?: string | null;
    fileName?: string | null;
    mimeType?: string | null;
    size?: number | null;
    purged?: boolean;
  };
  mine?: boolean;
  /** Après restore-media réussi (mettre à jour l’historique parent). */
  onRestored?: (message: unknown) => void;
};

/**
 * Affiche une PJ : cache local Afri-Mesh d’abord, sinon hub,
 * sinon message si purged + bouton « demander aux membres ».
 * Si cache local + purged → re-upload réel (restore-media).
 */
export function ChatMediaBubble({
  roomId,
  messageId,
  media,
  mine,
  onRestored,
}: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [asked, setAsked] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restored, setRestored] = useState(false);
  const isImage = (media.mimeType || "").startsWith("image/");

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
      fd.append(
        "file",
        blob,
        media.fileName || "fichier",
      );
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
    ? "bg-white/20 text-white hover:bg-white/30"
    : "bg-brand-50 text-brand-800 hover:bg-brand-100";

  if (media.purged && !src && !restored) {
    return (
      <div className={`mb-1 space-y-1 text-[11px] ${mine ? "text-white/80" : "text-ink-mute"}`}>
        <p>
          Fichier retiré du serveur (30 j) — encore possible sur les téléphones
          des membres qui l’ont ouvert.
        </p>
        <button
          type="button"
          disabled={asking || asked}
          onClick={() => void requestReshare()}
          className={`rounded-lg px-2 py-1 text-[10px] font-bold ${btnClass} disabled:opacity-60`}
        >
          {asked ? "Demande envoyée" : asking ? "…" : "Demander aux membres"}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-1 space-y-1">
      {isImage && src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={media.fileName || "Image"}
          className="max-h-56 w-full rounded-xl object-cover"
        />
      ) : src ? (
        <a
          href={src}
          download={media.fileName || "fichier"}
          className={`inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-semibold ${
            mine
              ? "bg-white/15 text-white hover:bg-white/25"
              : "bg-brand-50 text-brand-800 hover:bg-brand-100"
          }`}
        >
          📎 {media.fileName || "Fichier"}
        </a>
      ) : null}

      {media.purged && src && !restored ? (
        <div className={`space-y-1 text-[11px] ${mine ? "text-white/80" : "text-ink-mute"}`}>
          <p>Copie locale — le hub n’a plus ce fichier.</p>
          <button
            type="button"
            disabled={restoring}
            onClick={() => void restoreToHub()}
            className={`rounded-lg px-2 py-1 text-[10px] font-bold ${btnClass} disabled:opacity-60`}
          >
            {restoring ? "Envoi…" : "Remettre sur le serveur"}
          </button>
        </div>
      ) : null}

      {restored ? (
        <p className={`text-[10px] font-semibold ${mine ? "text-white/90" : "text-brand-700"}`}>
          Remis sur le serveur
        </p>
      ) : null}
    </div>
  );
}
