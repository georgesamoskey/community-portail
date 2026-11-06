"use client";

import { useState } from "react";
import { cx } from "@/lib/cx";
import { memberInitials } from "@/lib/member-display";
import { resolveMediaUrl } from "@/lib/media-url";

type Size = "xs" | "sm" | "md" | "lg";

const sizeClass: Record<Size, string> = {
  xs: "h-7 w-7 text-[9px] rounded-lg",
  sm: "h-8 w-8 text-[10px] rounded-xl",
  md: "h-10 w-10 text-xs rounded-xl",
  lg: "h-14 w-14 text-sm rounded-2xl",
};

type Props = {
  name: string;
  avatarUrl?: string | null;
  size?: Size;
  className?: string;
  /** Point présence (typing / en ligne) */
  online?: boolean;
  /** Anneau confiance (streak / niveau) */
  trustRing?: boolean;
};

export function MemberAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
  online,
  trustRing,
}: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = resolveMediaUrl(avatarUrl);
  const showImg = src && !imgFailed;

  return (
    <span
      className={cx(
        "relative inline-flex shrink-0",
        sizeClass[size],
        className,
      )}
      aria-hidden
    >
      <span
        className={cx(
          "absolute inset-0 inline-flex items-center justify-center overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-mint-600 font-bold text-white shadow-soft",
          size === "xs" && "rounded-lg text-[9px]",
          size === "sm" && "rounded-xl text-[10px]",
          size === "md" && "rounded-xl text-xs",
          size === "lg" && "rounded-2xl text-sm",
          trustRing && "ring-2 ring-mint-400 ring-offset-1 ring-offset-surface",
        )}
      >
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
          />
        ) : (
          memberInitials(name)
        )}
      </span>
      {online ? (
        <span className="online-dot absolute -bottom-0.5 -right-0.5 z-[1] h-2.5 w-2.5 rounded-full border-2 border-surface bg-mint-500" />
      ) : null}
    </span>
  );
}

/** Empilement de visages (liste salles / header). */
export function MemberAvatarStack({
  members,
  max = 3,
}: {
  members: Array<{ name: string; avatarUrl?: string | null }>;
  max?: number;
}) {
  const shown = members.slice(0, max);
  if (!shown.length) return null;
  const extra = members.length - shown.length;
  return (
    <span className="inline-flex items-center">
      {shown.map((m, i) => (
        <MemberAvatar
          key={`${m.name}-${i}`}
          name={m.name}
          avatarUrl={m.avatarUrl}
          size="xs"
          className={cx("border-2 border-surface", i > 0 && "-ml-2")}
        />
      ))}
      {extra > 0 ? (
        <span className="-ml-2 inline-flex h-7 w-7 items-center justify-center rounded-lg border-2 border-surface bg-ink/80 text-[9px] font-bold text-white">
          +{extra}
        </span>
      ) : null}
    </span>
  );
}
