import type { CSSProperties } from "react";

/** Styles & mise en page communs à tous les blocs. */

export type BlockPadding = "none" | "sm" | "md" | "lg" | "xl";
export type BlockWidth = "narrow" | "default" | "wide" | "full";
export type BlockAlign = "left" | "center" | "right";
export type BlockRadius = "none" | "md" | "xl" | "full";
export type BlockShadow = "none" | "sm" | "md" | "lg";

export type BlockStyle = {
  /** Padding vertical interne */
  paddingY?: BlockPadding;
  paddingX?: BlockPadding;
  /** Largeur du contenu */
  width?: BlockWidth;
  /** Alignement du contenu */
  align?: BlockAlign;
  /** Fond section */
  background?: string;
  backgroundImage?: string;
  textColor?: string;
  /** Overlay sombre sur image de fond (0–1) */
  overlay?: number;
  radius?: BlockRadius;
  shadow?: BlockShadow;
  /** Bordure */
  border?: boolean;
  borderColor?: string;
  /** Classes utilitaires libres (Tailwind) */
  className?: string;
  /** CSS inline custom (avancé) */
  customCss?: string;
  /** Masquer sur viewport */
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
  /** Animation d’apparition */
  animate?: "none" | "rise" | "fade";
};

export const DEFAULT_BLOCK_STYLE: BlockStyle = {
  paddingY: "md",
  paddingX: "md",
  width: "default",
  align: "left",
  radius: "none",
  shadow: "none",
  animate: "none",
};

export function mergeStyle(style?: BlockStyle): BlockStyle {
  return { ...DEFAULT_BLOCK_STYLE, ...style };
}

const PAD_Y: Record<BlockPadding, string> = {
  none: "py-0",
  sm: "py-6",
  md: "py-14",
  lg: "py-20",
  xl: "py-28",
};

const PAD_X: Record<BlockPadding, string> = {
  none: "px-0",
  sm: "px-3",
  md: "px-4 sm:px-6",
  lg: "px-6 sm:px-10",
  xl: "px-8 sm:px-16",
};

const WIDTH: Record<BlockWidth, string> = {
  narrow: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
  full: "max-w-none",
};

const ALIGN: Record<BlockAlign, string> = {
  left: "text-left mr-auto",
  center: "text-center mx-auto",
  right: "text-right ml-auto",
};

const RADIUS: Record<BlockRadius, string> = {
  none: "rounded-none",
  md: "rounded-2xl",
  xl: "rounded-3xl",
  full: "rounded-[2rem]",
};

const SHADOW: Record<BlockShadow, string> = {
  none: "shadow-none",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-xl",
};

const ANIM: Record<NonNullable<BlockStyle["animate"]>, string> = {
  none: "",
  rise: "cms-rise",
  fade: "cms-fade",
};

export function styleToClassName(style?: BlockStyle, opts?: { bare?: boolean }): string {
  const s = mergeStyle(style);
  const parts = [
    !opts?.bare && PAD_Y[s.paddingY ?? "md"],
    !opts?.bare && PAD_X[s.paddingX ?? "md"],
    s.radius && s.radius !== "none" ? RADIUS[s.radius] : "",
    s.shadow && s.shadow !== "none" ? SHADOW[s.shadow] : "",
    s.border ? "border" : "",
    s.hideOnMobile ? "hidden md:block" : "",
    s.hideOnDesktop ? "md:hidden" : "",
    s.animate ? ANIM[s.animate] : "",
    s.className ?? "",
  ];
  return parts.filter(Boolean).join(" ");
}

export function contentWidthClass(style?: BlockStyle): string {
  const s = mergeStyle(style);
  return [
    WIDTH[s.width ?? "default"],
    ALIGN[s.align ?? "left"],
    "w-full",
  ].join(" ");
}

export function styleToInline(style?: BlockStyle): CSSProperties {
  const s = mergeStyle(style);
  const css: CSSProperties = {};
  if (s.background) css.background = s.background;
  if (s.backgroundImage) {
    css.backgroundImage = `url(${s.backgroundImage})`;
    css.backgroundSize = "cover";
    css.backgroundPosition = "center";
  }
  if (s.textColor) css.color = s.textColor;
  if (s.borderColor) css.borderColor = s.borderColor;
  return css;
}
