"use client";

import { useRef } from "react";

type Props = {
  camera: string;
  gallery: string;
  document: string;
  poll: string;
  onFile: (file: File) => void;
  onPoll: () => void;
};

function Tile({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-2xl bg-surface px-2 py-3 text-xs font-semibold text-ink shadow-soft ring-1 ring-ink/[0.06]"
    >
      <span className="text-xl" aria-hidden>
        {icon}
      </span>
      {label}
    </button>
  );
}

/** Feuille caméra, galerie, document, sondage. */
export function ChatAttachSheet({
  camera,
  gallery,
  document,
  poll,
  onFile,
  onPoll,
}: Props) {
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  const take = (list: FileList | null) => {
    const file = list?.[0];
    if (file) onFile(file);
  };

  return (
    <div className="mb-2 grid grid-cols-4 gap-2">
      <Tile label={camera} icon="📷" onClick={() => camRef.current?.click()} />
      <Tile label={gallery} icon="🖼️" onClick={() => galRef.current?.click()} />
      <Tile label={document} icon="📄" onClick={() => docRef.current?.click()} />
      <Tile label={poll} icon="📊" onClick={onPoll} />
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={galRef}
        type="file"
        accept="image/*,video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={docRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,application/pdf"
        className="hidden"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
