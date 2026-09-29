"use client";

import { useEffect, useRef, useState } from "react";
import { haptic, setMediaSession } from "@/lib/native";
import { cx } from "@/lib/cx";

/** Bouton micro — MediaRecorder vocal pour le chat. */
export function VoiceRecordButton({
  disabled,
  onRecorded,
  label,
}: {
  disabled?: boolean;
  onRecorded: (file: File) => void;
  label: string;
}) {
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearInterval(timer.current);
      recRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const stop = () => {
    recRef.current?.stop();
    setRecording(false);
    if (timer.current) window.clearInterval(timer.current);
    setSecs(0);
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunks.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: mime });
        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: mime,
        });
        haptic("success");
        setMediaSession({
          title: "Message vocal Akiba",
          artist: "Akiba One",
        });
        onRecorded(file);
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
      setSecs(0);
      haptic("medium");
      timer.current = window.setInterval(() => {
        setSecs((s) => {
          if (s >= 59) {
            stop();
            return 59;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      haptic("error");
    }
  };

  return (
    <button
      type="button"
      disabled={disabled}
      title={label}
      aria-label={label}
      onClick={() => (recording ? stop() : void start())}
      className={cx(
        "inline-flex h-[46px] w-[46px] items-center justify-center rounded-2xl border text-sm font-bold transition",
        recording
          ? "border-rose-300 bg-rose-500 text-white animate-pulse"
          : "border-ink/[0.08] text-ink-soft hover:bg-brand-50",
      )}
    >
      {recording ? `${secs}s` : "🎙"}
    </button>
  );
}
