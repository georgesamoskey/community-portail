"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { cx } from "@/lib/cx";
import { hasPermission, Permission, type PermissionId } from "@/lib/portal-permissions";
import { SignOutButton } from "@/components/sign-out-button";
import { useBff } from "@/lib/use-bff";
import { initialsFrom } from "@/lib/portal-api";
import { useI18n } from "@/lib/i18n/context";
import {
  OfflineBanner,
  PwaInstallPrompt,
  SyncStatusChip,
} from "@/components/offline-ui";
import { ContextualPushPrompt } from "@/components/push-prompt";
import { OfflineQueuePanel } from "@/components/native-pro";
import { NativeRuntime } from "@/components/native-runtime";
import {
  BottomSheet,
  PullToRefresh,
  SheetLink,
} from "@/components/native-ux";
import { NetworkQualityChip, ThemeSwitcher } from "@/components/native-plus";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { haptic } from "@/lib/native";
import {
  IconChat,
  IconGroups,
  IconHistory,
  IconHome,
  IconPerson,
  type DockIcon,
} from "@/components/portal-dock-icons";

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
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
  const refreshNotif = unreadNotif.refresh;
  const refreshChat = unreadChat.refresh;
  const badgeTotal = unreadCount + chatUnread;
  const isChat = pathname.startsWith("/app/chat");
  const seenPath = useRef(pathname);

  useEffect(() => {
    if (seenPath.current === pathname) return;
    seenPath.current = pathname;
    void refreshNotif();
    void refreshChat();
  }, [pathname, refreshNotif, refreshChat]);

  const PRIMARY_NAV = [
    { href: "/app", label: t("nav.home") },
    { href: "/app/chat", label: t("nav.messages") },
    { href: "/app/history", label: t("nav.history") },
    { href: "/app/tontines", label: t("nav.tontines") },
    { href: "/app/contributions", label: t("nav.contributions") },
  ];

  const MORE_NAV: Array<{
    href: string;
    label: string;
    require?: PermissionId;
  }> = [
    { href: "/app/discover", label: t("nav.discover") },
    { href: "/app/invitations", label: t("nav.invitations") },
    { href: "/app/notifications", label: t("nav.notifications") },
    { href: "/app/engagement", label: t("nav.engagement") },
    { href: "/app/referral", label: t("nav.referral") },
    {
      href: "/app/payments",
      label: t("nav.payments"),
      require: Permission.PORTAL_PAYMENTS,
    },
    { href: "/app/reports", label: t("nav.reports") },
    { href: "/app/support", label: t("nav.support") },
  ];

  const visibleMore = MORE_NAV.filter(
    (item) => !item.require || hasPermission(roles, item.require),
  );

  const MOBILE_DOCK: Array<{
    href: string;
    label: string;
    Icon: DockIcon;
  }> = [
    { href: "/app", label: t("nav.home"), Icon: IconHome },
    { href: "/app/chat", label: t("nav.messages"), Icon: IconChat },
    { href: "/app/history", label: t("nav.history"), Icon: IconHistory },
    { href: "/app/tontines", label: t("nav.tontines"), Icon: IconGroups },
    { href: "/app/profile", label: t("nav.profile"), Icon: IconPerson },
  ];

  const [moreOpen, setMoreOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMoreOpen(false);
    setSheetOpen(false);
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

  const moreActive = visibleMore.some((item) => isActive(item.href));
  const moreInviteBadge = unreadCount > 0;

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void refreshNotif();
        void refreshChat();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    const id = window.setInterval(() => {
      void refreshNotif();
      void refreshChat();
    }, 45_000);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(id);
    };
  }, [refreshNotif, refreshChat]);

  const onPullRefresh = useCallback(async () => {
    router.refresh();
    await Promise.all([refreshNotif(), refreshChat()]);
    await new Promise((r) => setTimeout(r, 350));
  }, [router, refreshNotif, refreshChat]);

  return (
    <div className="min-h-dvh text-ink akiba-app-shell pt-[env(safe-area-inset-top)]">
      <NativeRuntime badgeCount={badgeTotal} />

      <header className="sticky top-0 z-40 hidden border-b border-ink/[0.06] bg-surface/90 backdrop-blur-xl md:block">
        <div
          className={cx(
            "mx-auto flex items-center justify-between gap-4 px-4 py-3 sm:px-6",
            isChat ? "max-w-7xl" : "max-w-6xl",
          )}
        >
          <Link href="/app" className="group flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon-192.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-xl shadow-lift transition group-hover:scale-105"
            />
            <span className="font-display text-lg font-bold tracking-tight text-ink">
              {messages.brand}
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <LocaleSwitcher compact showCountry={false} className="hidden lg:flex" />
            <NetworkQualityChip />
            <SyncStatusChip />
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
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-[11px] font-bold text-white">
                {initials || "M"}
              </span>
              <span className="max-w-[10rem] truncate text-sm font-medium text-ink">
                {name}
              </span>
            </Link>
            <SignOutButton label={t("nav.logout")} />
          </div>
        </div>
        <nav
          className={cx(
            "mx-auto flex items-center gap-1 overflow-visible px-4 pb-3 sm:px-6",
            isChat ? "max-w-7xl" : "max-w-6xl",
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition",
                  active
                    ? "bg-brand-500 text-white shadow-lift"
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
          </div>

          <div className="relative shrink-0" ref={moreRef}>
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
              <div className="absolute right-0 top-full z-[80] mt-1.5 min-w-[14rem] overflow-hidden rounded-2xl border border-ink/[0.08] bg-surface py-1 shadow-lift">
                {visibleMore.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cx(
                        "flex items-center justify-between px-3.5 py-2.5 text-sm font-semibold transition",
                        active
                          ? "bg-brand-50 text-brand-700"
                          : "text-ink-soft hover:bg-ink/[0.04] hover:text-ink",
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

      <OfflineBanner />

      <PullToRefresh onRefresh={onPullRefresh} disabled={isChat}>
        <main
          className={cx(
            "portal-page mx-auto",
            isChat
              ? "max-w-7xl px-0 pb-24 pt-0 md:px-4 md:pb-6 md:pt-4"
              : "max-w-6xl px-4 py-6 pb-28 sm:px-6 md:pb-10",
          )}
        >
          {!isChat ? <OfflineQueuePanel /> : null}
          {children}
        </main>
      </PullToRefresh>

      <PwaInstallPrompt />
      <ContextualPushPrompt />

      {/* Handle « Plus » — swipe-up native au-dessus du dock */}
      <button
        type="button"
        className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-[51] mx-auto flex h-5 w-full max-w-lg items-center justify-center md:hidden"
        aria-label={t("nav.more")}
        onClick={() => {
          haptic("light");
          setSheetOpen(true);
        }}
      >
        <span className="h-1 w-9 rounded-full bg-ink/20" />
      </button>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-ink/[0.06] bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
        aria-label={t("nav.mainNav")}
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1 pt-1">
          {MOBILE_DOCK.map((item) => {
            const active = isActive(item.href);
            const { Icon } = item;
            const isProfile = item.href === "/app/profile";
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  onClick={(e) => {
                    if (isProfile && (active || moreActive)) {
                      e.preventDefault();
                      haptic("medium");
                      setSheetOpen(true);
                      return;
                    }
                    haptic(active ? "light" : "selection");
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    haptic("medium");
                    setSheetOpen(true);
                  }}
                  className={cx(
                    "native-pressable relative flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-semibold tracking-wide transition",
                    active || (isProfile && sheetOpen)
                      ? "text-brand-600"
                      : "text-ink-mute",
                  )}
                >
                  <span
                    className={cx(
                      "inline-flex h-8 w-8 items-center justify-center rounded-xl transition",
                      (active || (isProfile && sheetOpen)) &&
                        "bg-brand-50 shadow-soft",
                    )}
                  >
                    {isProfile && moreInviteBadge && !active ? (
                      <span className="relative">
                        <Icon className="h-5 w-5" />
                        <span className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-brand-500" />
                      </span>
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </span>
                  <span className="truncate">{item.label}</span>
                  {item.href === "/app/chat" && chatUnread > 0 ? (
                    <span className="absolute right-[18%] top-1 inline-flex min-w-[1rem] items-center justify-center rounded-md bg-brand-500 px-1 text-[9px] font-bold leading-3 text-white">
                      {chatUnread > 9 ? "9+" : chatUnread}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t("native.moreTitle")}
      >
        <div className="mb-2 flex items-center gap-3 rounded-2xl bg-surface-sunken/60 px-3 py-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-lift">
            {initials || "M"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">{name}</p>
            <p className="text-xs text-ink-mute">{t("native.quickAccess")}</p>
          </div>
          <LocaleSwitcher compact showCountry={false} />
        </div>
        <div className="mb-3 flex items-center justify-between rounded-2xl border border-ink/[0.06] bg-surface px-3 py-2.5">
          <p className="text-xs font-semibold text-ink-mute">{t("native.theme")}</p>
          <ThemeSwitcher compact />
        </div>
        <div className="divide-y divide-ink/[0.05] overflow-hidden rounded-2xl border border-ink/[0.06] bg-surface">
          <SheetLink
            href="/app/contributions"
            label={t("nav.contributions")}
            onNavigate={() => setSheetOpen(false)}
          />
          {visibleMore.map((item) => (
            <SheetLink
              key={item.href}
              href={item.href}
              label={item.label}
              badge={
                item.href === "/app/notifications" ? unreadCount : undefined
              }
              onNavigate={() => setSheetOpen(false)}
            />
          ))}
          <SheetLink
            href="/app/profile/native"
            label={t("native.labTitle")}
            onNavigate={() => setSheetOpen(false)}
          />
        </div>
        <div className="mt-3 px-1 pb-2">
          <SignOutButton label={t("nav.logout")} />
        </div>
      </BottomSheet>
    </div>
  );
}
