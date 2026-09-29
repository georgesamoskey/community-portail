"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { cx } from "@/lib/cx";
import { haptic } from "@/lib/native";

/** Zone tactile avec scale + haptique. */
export function Pressable({
  children,
  className,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cx("native-pressable", className)}
      onClick={() => {
        if (disabled) return;
        haptic("selection");
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}

type ToastItem = { id: string; message: string; tone: "info" | "ok" | "warn" };

let toastPush: ((t: Omit<ToastItem, "id">) => void) | null = null;

export function pushToast(
  message: string,
  tone: ToastItem["tone"] = "info",
): void {
  toastPush?.({ message, tone });
}

export function NativeToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    toastPush = (t) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setItems((prev) => [...prev.slice(-2), { ...t, id }]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== id));
      }, 3200);
    };
    return () => {
      toastPush = null;
    };
  }, []);

  if (!items.length) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[80] flex flex-col items-center gap-2 px-4"
      aria-live="polite"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className={cx(
            "native-toast pointer-events-auto max-w-sm rounded-2xl px-4 py-2.5 text-center text-sm font-semibold shadow-lift backdrop-blur-xl",
            t.tone === "ok" && "bg-mint-600/95 text-white",
            t.tone === "warn" && "bg-amber-500/95 text-white",
            t.tone === "info" && "bg-ink/90 text-white",
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

/** Bottom sheet type Material / iOS. */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  detent = "auto",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  detent?: "auto" | "full";
}) {
  const titleId = useId();
  const startY = useRef(0);
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    haptic("light");
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined" || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] md:hidden" role="presentation">
      <button
        type="button"
        className="absolute inset-0 animate-[native-fade_0.2s_ease] bg-ink/45 backdrop-blur-[2px]"
        aria-label="Fermer"
        onClick={() => {
          haptic("light");
          onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cx(
          "absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-[1.75rem] border border-ink/[0.08] bg-surface shadow-lift animate-[native-sheet-up_0.32s_cubic-bezier(0.22,1,0.36,1)]",
          detent === "full" && "h-[92dvh]",
        )}
        style={{ transform: dragY ? `translateY(${dragY}px)` : undefined }}
        onTouchStart={(e) => {
          startY.current = e.touches[0]?.clientY ?? 0;
        }}
        onTouchMove={(e) => {
          const y = e.touches[0]?.clientY ?? 0;
          setDragY(Math.max(0, y - startY.current));
        }}
        onTouchEnd={() => {
          if (dragY > 110) {
            haptic("medium");
            onClose();
          }
          setDragY(0);
        }}
      >
        <div className="flex flex-col items-center pb-1 pt-2.5">
          <span className="h-1 w-10 rounded-full bg-ink/15" />
        </div>
        {title ? (
          <h2
            id={titleId}
            className="px-5 pb-2 text-center font-display text-base font-bold text-ink"
          >
            {title}
          </h2>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Pull-to-refresh — mobile / PWA. */
export function PullToRefresh({
  onRefresh,
  children,
  disabled,
}: {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  disabled?: boolean;
}) {
  const startY = useRef(0);
  const pulling = useRef(false);
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const MAX = 88;

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || busy) return;
      if (window.scrollY > 2) return;
      startY.current = e.touches[0]?.clientY ?? 0;
      pulling.current = true;
    },
    [disabled, busy],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || disabled || busy) return;
      const y = e.touches[0]?.clientY ?? 0;
      const dy = y - startY.current;
      if (dy <= 0) {
        setOffset(0);
        return;
      }
      setOffset(Math.min(MAX, dy * 0.45));
    },
    [disabled, busy],
  );

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (offset > 58 && !busy) {
      setBusy(true);
      setOffset(52);
      haptic("medium");
      try {
        await onRefresh();
        haptic("success");
      } finally {
        setBusy(false);
        setOffset(0);
      }
    } else {
      setOffset(0);
    }
  }, [offset, busy, onRefresh]);

  return (
    <div
      className="relative"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={() => void onTouchEnd()}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center"
        style={{ height: offset || (busy ? 52 : 0) }}
        aria-hidden
      >
        <div
          className={cx(
            "mt-2 flex h-9 w-9 items-center justify-center rounded-full border border-ink/[0.08] bg-surface text-ink-mute shadow-soft transition",
            (offset > 58 || busy) && "border-brand-200 text-brand-600",
          )}
          style={{
            opacity: Math.min(1, offset / 40),
            transform: `rotate(${offset * 3}deg) scale(${0.7 + Math.min(offset, MAX) / 220})`,
          }}
        >
          <svg
            className={cx("h-4 w-4", busy && "animate-spin")}
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M12 4v3M12 17v3M4 12h3M17 12h3M6.2 6.2l2.1 2.1M15.7 15.7l2.1 2.1M6.2 17.8l2.1-2.1M15.7 8.3l2.1-2.1"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
      <div
        style={{
          transform: offset ? `translateY(${offset}px)` : undefined,
          transition: pulling.current ? undefined : "transform 0.22s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function SheetLink({
  href,
  label,
  badge,
  onNavigate,
}: {
  href: string;
  label: string;
  badge?: number;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={() => {
        haptic("selection");
        onNavigate?.();
      }}
      className="native-pressable flex items-center justify-between rounded-2xl px-4 py-3.5 text-sm font-semibold text-ink transition hover:bg-ink/[0.04]"
    >
      <span>{label}</span>
      {badge && badge > 0 ? (
        <span className="rounded-md bg-brand-500 px-1.5 text-[10px] font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : (
        <span className="text-ink-faint" aria-hidden>
          ›
        </span>
      )}
    </Link>
  );
}
