"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useI18n } from "@/lib/i18n/context";
import { useBff } from "@/lib/use-bff";
import { bffFetch, BffError } from "@/lib/bff-fetch";
import { MemberAvatar } from "@/components/member-avatar";
import { MobileHero, SettingsRow } from "@/components/mobile-iso";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { countryLabel } from "@/lib/country-flag";
import { normalizeCountry } from "@/lib/i18n/config";

type Profile = Record<string, unknown>;

export default function ProfileHubPage() {
  const { t } = useI18n();
  const { data: session } = useSession();
  const engagement = useBff<{
    currentStreak?: number;
    level?: number;
    totalPoints?: number;
    streakAtRisk?: boolean;
  }>("/engagement/me");
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    void (async () => {
      for (const path of ["/users/me", "/users/profile", "/auth/me"]) {
        try {
          const data = await bffFetch<Profile>(path);
          setProfile(data);
          return;
        } catch (e) {
          if (e instanceof BffError && (e.status === 404 || e.status === 403)) {
            continue;
          }
          return;
        }
      }
    })();
  }, []);

  const nested =
    profile && typeof profile.profile === "object" && profile.profile
      ? (profile.profile as Record<string, unknown>)
      : {};
  const first = String(
    profile?.firstName ?? nested.firstName ?? session?.user?.name ?? "",
  );
  const last = String(profile?.lastName ?? nested.lastName ?? "");
  const fullName =
    `${first} ${last}`.trim() ||
    session?.user?.name ||
    session?.user?.preferred_username ||
    t("common.member");
  const phone = String(profile?.phone ?? profile?.phoneNumber ?? "");
  const email = String(profile?.email ?? session?.user?.email ?? "");
  const avatarPath = String(profile?.avatar ?? nested.avatar ?? "");
  const countryRaw = String(
    profile?.country ?? nested.country ?? nested.countryCode ?? "",
  );
  const countryCode = countryRaw ? normalizeCountry(countryRaw) : null;

  return (
    <div className="space-y-4 pb-10">
      <MobileHero className="!rounded-b-[1.75rem] text-center">
        <div className="mx-auto ring-4 ring-white/30 rounded-full">
          <MemberAvatar
            name={fullName}
            avatarUrl={avatarPath || null}
            size="lg"
            className="!h-24 !w-24 !text-2xl !rounded-full ring-0"
          />
        </div>
        <h1 className="mt-3 font-display text-xl font-bold">{fullName}</h1>
        {countryCode ? (
          <p className="mt-1 text-sm text-white/85">
            {countryLabel(countryCode, { withDial: true })}
          </p>
        ) : null}
        {phone ? <p className="mt-1 text-sm text-white/80">{phone}</p> : null}
        {email ? <p className="text-xs text-white/70">{email}</p> : null}
      </MobileHero>

      {(engagement.data?.currentStreak != null ||
        engagement.data?.level != null) && (
        <div className="rounded-2xl border border-ink/[0.06] bg-surface p-4 shadow-soft">
          <p className="text-sm font-bold text-ink">
            {t("home.streakDays", {
              n: engagement.data?.currentStreak ?? 0,
            })}
          </p>
          {engagement.data?.level != null ? (
            <p className="mt-1 text-xs text-ink-mute">
              {t("home.levelPts", {
                level: engagement.data.level,
                pts: engagement.data.totalPoints ?? 0,
              })}
            </p>
          ) : null}
          {engagement.data?.streakAtRisk ? (
            <Link
              href="/app/engagement"
              className="mt-2 inline-block text-xs font-bold text-brand-600"
            >
              {t("home.protectStreak")}
            </Link>
          ) : null}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-ink/[0.06] bg-surface shadow-soft">
        <SettingsRow
          href="/app/profile/edit"
          title={t("profile.menuEdit")}
          subtitle={t("profile.menuEditHint")}
        />
        <div className="h-px bg-ink/[0.06]" />
        <SettingsRow
          href="/app/profile/edit#kyc"
          title={t("profile.kycTitle")}
          subtitle={String(profile?.kycStatus ?? "—")}
        />
        <div className="h-px bg-ink/[0.06]" />
        <SettingsRow href="/app/tontines" title={t("nav.tontines")} />
        <div className="h-px bg-ink/[0.06]" />
        <SettingsRow href="/app/engagement" title={t("nav.engagement")} />
        <div className="h-px bg-ink/[0.06]" />
        <SettingsRow href="/app/referral" title={t("nav.referral")} />
        <div className="h-px bg-ink/[0.06]" />
        <SettingsRow href="/app/support" title={t("nav.support")} />
        <div className="h-px bg-ink/[0.06]" />
        <SettingsRow href="/app/reports" title={t("nav.reports")} />
        <div className="h-px bg-ink/[0.06]" />
        <SettingsRow href="/app/notifications" title={t("nav.notifications")} />
        <div className="h-px bg-ink/[0.06]" />
        <SettingsRow
          href="/app/profile/native"
          title={t("native.labTitle")}
          subtitle={t("native.labHint")}
        />
        <div className="h-px bg-ink/[0.06]" />
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-ink">{t("common.language")}</p>
            <p className="text-xs text-ink-mute">{t("profile.menuLangHint")}</p>
          </div>
          <LocaleSwitcher compact showCountry={false} />
        </div>
        <div className="h-px bg-ink/[0.06]" />
        <SettingsRow
          title={t("nav.logout")}
          danger
          onClick={() => void signOut({ callbackUrl: "/login" })}
        />
      </div>
    </div>
  );
}
