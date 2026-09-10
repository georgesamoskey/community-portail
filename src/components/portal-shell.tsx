"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { cx } from "@/lib/cx";
import { hasPermission, Permission } from "@/lib/portal-permissions";
import { SignOutButton } from "@/components/sign-out-button";
import { useBff } from "@/lib/use-bff";
import { initialsFrom } from "@/lib/portal-api";
import { useI18n } from "@/lib/i18n/context";
import { LocaleSwitcher } from "@/components/locale-switcher";

function IconChat({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 18.5 4 21V7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v8a2.5 2.5 0 0 1-2.5 2.5H7Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 10h7M8.5 13.5h4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t, messages } = useI18n();
  const roles = session?.user?.roles;
  const name =
    session?.user?.name ??
    session?.user?.preferred_username ??
    session?.user?.email ??
    t("common.member");
  const initials = initialsFrom(name);

  const unreadNotif = useBff<{ count?: number }>("/notifications/unread/count");
  const unreadChat = useBff<{ count?: number }>("/chat/unread");
  const unreadCount = unreadNotif.data?.count ?? 0;
  const chatUnread = unreadChat.data?.count ?? 0;
  const isChat = pathname.startsWith("/app/chat");

  const PRIMARY_NAV = [
    { href: "/app/chat", label: t("nav.chat"), primary: true as const },
    { href: "/app", label: t("nav.home") },
    { href: "/app/discover", label: t("nav.discover") },
    { href: "/app/tontines", label: t("nav.tontines") },
    { href: "/app/contributions", label: t("nav.contributions") },
  ];

  const MORE_NAV = [
    { href: "/app/invitations", label: t("nav.invitations") },
    { href: "/app/engagement", label: t("nav.engagement") },
    { href: "/app/support", label: t("nav.support") },
    { href: "/app/reports", label: t("nav.reports") },
    { href: "/app/notifications", label: t("nav.notifications") },
    {
      href: "/app/payments",
      label: t("nav.payments"),
      require: Permission.PORTAL_PAYMENTS,
    },
    { href: "/app/profile", label: t("nav.profile") },
  ];

  const MOBILE_DOCK = [
    { href: "/app", label: t("nav.home") },
    { href: "/app/tontines", label: t("nav.tontines") },
    { href: "/app/chat", label: t("nav.chat"), hub: true as const },
    { href: "/app/contributions", label: t("nav.contributions") },
    { href: "/app/profile", label: t("nav.profile") },
  ];


  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [moreOpen]);

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);

  const moreActive = MORE_NAV.some((item) => isActive(item.href));
  const moreInviteBadge = unreadCount > 0;

  return (
    <div className="min-h-screen text-ink">
      <header className="sticky top-0 z-40 border-b border-ink/[0.06] bg-surface/80 backdrop-blur-xl">
        <div
          className={cx(
            "mx-auto flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6",
            isChat ? "max-w-7xl" : "max-w-6xl",
          )}
        >
          <div className="flex items-center gap-3">
            <Link href="/app/chat" className="group flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lift transition group-hover:scale-105">
                <IconChat className="h-4.5 w-4.5 h-[18px] w-[18px]" />
              </span>
              <span className="font-display text-lg font-bold tracking-tight text-ink">
                {messages.brand}
              </span>
            </Link>
            <Link
              href="/app/chat"
              className="relative hidden items-center gap-2 rounded-xl bg-brand-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-lift transition hover:bg-brand-600 sm:inline-flex"
            >
              {t("nav.chat")}
              {chatUnread > 0 ? (
                <span className="inline-flex min-w-[1.15rem] items-center justify-center rounded-md bg-ink/20 px-1 text-[10px] leading-4">
                  {chatUnread > 99 ? "99+" : chatUnread}
                </span>
              ) : null}
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/app/notifications"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-ink/[0.08] bg-surface text-ink-soft transition hover:border-brand-300 hover:text-brand-600"
              title={t("notifications.title")}
              aria-label={t("notifications.title")}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 9.5a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13.5 6 9.5Z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 18.5a2 2 0 0 0 4 0"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-w-[1.1rem] items-center justify-center rounded-md bg-brand-500 px-1 text-[10px] font-bold leading-4 text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </Link>
            <Link
              href="/app/profile"
              className="hidden items-center gap-2.5 rounded-xl border border-ink/[0.08] bg-surface py-1 pl-1 pr-3 transition hover:border-brand-200 sm:flex"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-mint-500 to-mint-700 text-[11px] font-bold text-white">
                {initials || "M"}
              </span>
              <span className="max-w-[10rem] truncate text-sm font-medium text-ink">
                {name}
              </span>
            </Link>
            <LocaleSwitcher compact />
            <SignOutButton label={t("nav.logout")} />
          </div>
        </div>
        <nav
          className={cx(
            "mx-auto hidden items-center gap-1 overflow-x-auto px-4 pb-3 md:flex sm:px-6",
            isChat ? "max-w-7xl" : "max-w-6xl",
          )}
        >
          {PRIMARY_NAV.map((item) => {
            const active = isActive(item.href);
            const isPrimary = "primary" in item && item.primary;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition",
                  active
                    ? isPrimary
                      ? "bg-brand-500 text-white shadow-lift"
                      : "bg-ink text-white"
                    : isPrimary
                      ? "bg-brand-50 text-brand-700 hover:bg-brand-100"
                      : "text-ink-soft hover:bg-ink/[0.04] hover:text-ink",
                )}
              >
                {item.label}
                {item.href === "/app/chat" && chatUnread > 0 && !active ? (
                  <span className="online-dot absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand-500" />
                ) : null}
              </Link>
            );
          })}

          <div className="relative" ref={moreRef}>
            <button
              type="button"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((v) => !v)}
              className={cx(
                "relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition",
                moreActive || moreOpen
                  ? "bg-ink/[0.06] text-ink"
                  : "text-ink-soft hover:bg-ink/[0.04] hover:text-ink",
              )}
            >
              {t("nav.more")}
              <svg className="h-3.5 w-3.5 opacity-60" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M5.25 7.5 10 12.25 14.75 7.5" />
              </svg>
              {moreInviteBadge && !moreActive ? (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand-500" />
              ) : null}
            </button>
            {moreOpen ? (
              <div className="absolute left-0 top-full z-50 mt-1.5 min-w-[12rem] overflow-hidden rounded-2xl border border-ink/[0.08] bg-surface py-1 shadow-lift">
                {MORE_NAV.map((item) => {
                  const active = isActive(item.href);
                  const locked =
                    "require" in item &&
                    item.require &&
                    !hasPermission(roles, item.require);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cx(
                        "flex items-center justify-between px-3.5 py-2.5 text-sm font-semibold transition",
                        active
                          ? "bg-brand-50 text-brand-700"
                          : "text-ink-soft hover:bg-ink/[0.04] hover:text-ink",
                        locked && !active && "opacity-50",
                      )}
                    >
                      {item.label}
                      {item.href === "/app/notifications" && unreadCount > 0 ? (
                        <span className="rounded-md bg-brand-500 px-1.5 text-[10px] font-bold text-white">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        </nav>
      </header>

      <main
        className={cx(
          "portal-page mx-auto",
          isChat
            ? "max-w-7xl px-0 pb-24 pt-0 md:px-4 md:pb-6 md:pt-4"
            : "max-w-6xl px-4 py-8 pb-28 sm:px-6 md:pb-10",
        )}
      >
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-ink/[0.06] bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
        aria-label={t("nav.mainNav")}
      >
        <ul className="mx-auto flex max-w-lg items-end justify-between px-1 pt-1">
          {MOBILE_DOCK.map((item) => {
            const active = isActive(item.href);
            const hub = "hub" in item && item.hub;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={cx(
                    "relative flex flex-col items-center gap-0.5 px-1 py-1.5 text-[10px] font-semibold tracking-wide transition",
                    active ? "text-brand-600" : "text-ink-mute",
                  )}
                >
                  <span
                    className={cx(
                      "inline-flex items-center justify-center transition",
                      hub
                        ? cx(
                            "-mt-6 h-14 w-14 rounded-2xl shadow-lift",
                            active
                              ? "bg-brand-500 text-white ring-4 ring-brand-100"
                              : "bg-gradient-to-br from-brand-500 to-brand-700 text-white",
                          )
                        : "h-8 w-8 rounded-xl",
                      !hub && active && "bg-brand-50",
                    )}
                  >
                    {hub ? (
                      <IconChat className="h-6 w-6" />
                    ) : (
                      <span className="text-[11px] font-bold uppercase tracking-wider">
                        {item.label.slice(0, 1)}
                      </span>
                    )}
                  </span>
                  <span>{item.label}</span>
                  {item.href === "/app/chat" && chatUnread > 0 ? (
                    <span className="absolute right-[22%] top-0 inline-flex min-w-[1rem] items-center justify-center rounded-md bg-brand-500 px-1 text-[9px] font-bold leading-3 text-white">
                      {chatUnread > 9 ? "9+" : chatUnread}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
