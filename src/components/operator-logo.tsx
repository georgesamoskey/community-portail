"use client";

import { resolveOperatorLogo } from "@/lib/pawapay-logos";
import { cx } from "@/lib/cx";

type Props = {
  slug?: string | null;
  network?: string | null;
  apiLogoUrl?: string | null;
  providerHint?: string | null;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
};

const SIZE = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-10 w-10",
} as const;

/** Logo opérateur Mobile Money (CDN PawaPay / API). */
export function OperatorLogo({
  slug,
  network,
  apiLogoUrl,
  providerHint,
  label,
  size = "md",
  className,
  showLabel = false,
}: Props) {
  const src = resolveOperatorLogo({ slug, network, apiLogoUrl, providerHint });
  const alt = label || network || slug || "Mobile Money";
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={cx(SIZE[size], "shrink-0 rounded object-contain bg-white")}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      {showLabel && label ? (
        <span className="text-sm font-semibold text-ink">{label}</span>
      ) : null}
    </span>
  );
}
