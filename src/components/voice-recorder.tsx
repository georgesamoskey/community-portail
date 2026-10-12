"use client";

import { useEffect, useRef, useState } from "react";
import { haptic, setMediaSession } from "@/lib/native";

type Props = {
  cancelLabel: string;
  sendLabel: string;
  mediaTitle: string;
  onRecorded: (file: File) => void;
  onCancel: () => void;
};

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const list = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return list.find((mime) => MediaRecorder.isTypeSupported(mime)) ?? "";
}

function clock(sec: number): string {
  const s = Math.max(0, sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Waveform({ stream }: { stream: MediaStream | null }) {
  const bars = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    if (!stream) return;
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 80) return;
      last = now;
      analyser.getByteFrequencyData(data);
      const step = Math.max(1, Math.floor(data.length / bars.current.length));
      bars.current.forEach((el, i) => {
        if (!el) return;
        const level = (data[i * step] ?? 0) / 255;
        el.style.height = `${6 + level * 22}px`;
      });
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      void ctx.close();
    };
  }, [stream]);

  return (
    <div className="flex h-8 min-w-0 flex-1 items-center gap-[3px]" aria-hidden>
      {Array.from({ length: 18 }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            bars.current[i] = el;
          }}
          className="w-[3px] rounded-full bg-rose-500"
          style={{ height: 6 }}
        />
      ))}
    </div>
  );
}

/** Barre d’enregistrement : annuler, forme d’onde, envoyer. */
export function VoiceRecorder({
  cancelLabel,
  sendLabel,
  mediaTitle,
  onRecorded,
  onCancel,
}: Props) {
  const [secs, setSecs] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const sendRef = useRef(false);
  const pendingRef = useRef<boolean | null>(null);
  const mimeRef = useRef("audio/webm");
  const doneRef = useRef(onRecorded);
  const cancelRef = useRef(onCancel);
  const titleRef = useRef(mediaTitle);
  doneRef.current = onRecorded;
  cancelRef.current = onCancel;
  titleRef.current = mediaTitle;

  useEffect(() => {
    let dead = false;
    let timer = 0;
    const stopTracks = (media: MediaStream) => {
      media.getTracks().forEach((track) => track.stop());
    };
    const boot = async () => {
      try {
        const media = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (dead) {
          stopTracks(media);
          return;
        }
        const mime = pickMime();
        mimeRef.current = (mime || "audio/webm").split(";")[0];
        const rec = mime
          ? new MediaRecorder(media, { mimeType: mime })
          : new MediaRecorder(media);
        chunks.current = [];
        rec.ondataavailable = (e) => {
          if (e.data.size) chunks.current.push(e.data);
        };
        rec.onstop = () => {
          stopTracks(media);
          if (!sendRef.current || !chunks.current.length) return;
          const type = mimeRef.current;
          const ext = type.includes("mp4") ? "m4a" : "webm";
          const blob = new Blob(chunks.current, { type });
          if (!blob.size) return;
          haptic("success");
          setMediaSession({ title: titleRef.current, artist: "Akiba One" });
          doneRef.current(new File([blob], `voice-${Date.now()}.${ext}`, { type }));
        };
        recRef.current = rec;
        rec.start();
        setStream(media);
        if (pendingRef.current !== null) {
          sendRef.current = pendingRef.current;
          const want = pendingRef.current;
          pendingRef.current = null;
          rec.stop();
          if (!want) cancelRef.current();
          return;
        }
        haptic("medium");
        timer = window.setInterval(() => {
          setSecs((value) => {
            if (value >= 59) {
              sendRef.current = true;
              if (rec.state !== "inactive") rec.stop();
              window.clearInterval(timer);
              return 60;
            }
            return value + 1;
          });
        }, 1000);
      } catch {
        haptic("error");
        cancelRef.current();
      }
    };
    void boot();
    return () => {
      dead = true;
      window.clearInterval(timer);
      const rec = recRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
    };
  }, []);

  const finish = (send: boolean) => {
    const rec = recRef.current;
    if (!rec || rec.state === "inactive") {
      pendingRef.current = send;
      if (!send) cancelRef.current();
      return;
    }
    sendRef.current = send;
    rec.stop();
    if (!send) cancelRef.current();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="shrink-0 text-sm font-bold text-rose-600"
        onClick={() => finish(false)}
      >
        {cancelLabel}
      </button>
      <span className="w-10 shrink-0 text-xs font-semibold tabular-nums text-rose-600">
        {clock(secs)}
      </span>
      <Waveform stream={stream} />
      <button
        type="button"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white"
        aria-label={sendLabel}
        onClick={() => finish(true)}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M3.4 20.6 21 12 3.4 3.4l2 7.2L16 12l-10.6 1.4-2 7.2Z" />
        </svg>
      </button>
    </div>
  );
}
