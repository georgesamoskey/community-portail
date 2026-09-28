"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useI18n } from "@/lib/i18n/context";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { bffFetch, BffError } from "@/lib/bff-fetch";
import { useAction } from "@/lib/use-action";
import { useBff } from "@/lib/use-bff";
import {
  Alert,
  Btn,
  Field,
  inputClass,
  PageHeader,
  Panel,
} from "@/lib/ui";
import {
  SessionLockSettings,
  WebPushSettings,
} from "@/components/security-gates";
import Link from "next/link";

type Profile = Record<string, unknown>;

type NotifChannels = {
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  inApp?: boolean;
};

const PROFILE_PATHS = ["/users/me", "/users/profile", "/auth/me"];

export default function ProfilePage() {
  const { t } = useI18n();
  const { data: session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const action = useAction();

  const prefs = useBff<Record<string, unknown>>("/users/preferences");
  const notifSettings = useBff<Record<string, unknown>>(
    "/notifications/settings",
  );
  const engagement = useBff<Record<string, unknown>>("/engagement/me");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [channels, setChannels] = useState<NotifChannels>({
    email: true,
    push: true,
    inApp: true,
    sms: false,
  });
  const [dnd, setDnd] = useState(false);
  const [digestDaily, setDigestDaily] = useState(false);
  const [digestWeekly, setDigestWeekly] = useState(false);

  useEffect(() => {
    const data = notifSettings.data;
    if (!data) return;
    const ch = (data.channelPreferences ?? {}) as NotifChannels;
    setChannels({
      email: ch.email !== false,
      sms: Boolean(ch.sms),
      push: ch.push !== false,
      inApp: ch.inApp !== false,
    });
    setDnd(Boolean(data.doNotDisturb));
    const dig = (data.digestPreferences ?? {}) as {
      daily?: boolean;
      weekly?: boolean;
    };
    setDigestDaily(Boolean(dig.daily));
    setDigestWeekly(Boolean(dig.weekly));
  }, [notifSettings.data]);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    for (const path of PROFILE_PATHS) {
      try {
        const data = await bffFetch<Profile>(path);
        setProfile(data);
        setSource(path);
        const nested =
          typeof data.profile === "object" && data.profile
            ? (data.profile as Record<string, unknown>)
            : {};
        setFirstName(String(data.firstName ?? nested.firstName ?? ""));
        setLastName(String(data.lastName ?? nested.lastName ?? ""));
        setEmail(String(data.email ?? ""));
        setBio(String(nested.bio ?? data.bio ?? ""));
        setLocation(String(nested.location ?? data.location ?? ""));
        setLoading(false);
        return;
      } catch (e) {
        if (e instanceof BffError && (e.status === 404 || e.status === 403)) {
          continue;
        }
        if (e instanceof BffError && e.status === 401) {
          setError(e.message);
          setLoading(false);
          return;
        }
      }
    }
    setProfile(null);
    setSource(null);
    setLoading(false);
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const saveProfile = () =>
    void action.mutate(
      "/users/profile",
      {
        method: "PUT",
        body: JSON.stringify({
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          email: email || undefined,
          profile: {
            bio: bio || undefined,
            location: location || undefined,
          },
        }),
      },
      {
        success: t("profile.updated"),
        onDone: () => void loadProfile(),
      },
    );

  const savePrefs = () => {
    void action.mutate(
      "/users/preferences",
      {
        method: "PUT",
        body: JSON.stringify(prefs.data ?? {}),
      },
      {
        success: t("profile.prefsSaved"),
        onDone: () => void prefs.refresh(),
      },
    );
  };

  const saveNotif = () => {
    void action.mutate(
      "/notifications/settings",
      {
        method: "PUT",
        body: JSON.stringify({
          channelPreferences: channels,
          doNotDisturb: dnd,
          digestPreferences: {
            daily: digestDaily,
            weekly: digestWeekly,
          },
        }),
      },
      {
        success: t("profile.notifSaved"),
        onDone: () => void notifSettings.refresh(),
      },
    );
  };

  const sendPhoneOtp = () =>
    void action.mutate(
      "/users/profile/phone/send-verification",
      { method: "POST" },
      { success: t("profile.otpSent") },
    );

  const verifyPhone = () =>
    void action.mutate(
      "/users/profile/phone/verify",
      { method: "POST", body: JSON.stringify({ code: phoneCode }) },
      { success: t("profile.phoneVerified"), onDone: () => void loadProfile() },
    );

  const uploadAvatar = (file: File) => {
    const fd = new FormData();
    fd.append("avatar", file);
    void action.run(
      async () => {
        const { bffApi } = await import("@/lib/bff");
        const res = await fetch(bffApi("/users/profile/avatar"), {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(body || `HTTP ${res.status}`);
        }
        return res.json();
      },
      { success: t("profile.avatarOk"), onDone: () => void loadProfile() },
    );
  };

  const roles = session?.user?.roles ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("profile.menuEdit")}
        description={t("profile.menuEditHint")}
        actions={
          <>
            <LocaleSwitcher compact />
            <Btn variant="secondary" onClick={() => void loadProfile()}>
              {t("common.refresh")}
            </Btn>
          </>
        }
      />

      {(action.error || action.success) && (
        <Alert tone={action.error ? "rose" : "teal"}>
          {action.error ?? action.success}
        </Alert>
      )}
      {loading && (
        <p className="text-sm text-brand-700/60">{t("common.loading")}</p>
      )}
      {error && <Alert tone="rose">{error}</Alert>}

      {!loading && !error && !profile && (
        <Alert>{t("profile.noData")}</Alert>
      )}

      {profile && (
        <Panel title={t("profile.identity")}>
          {source && (
            <p className="mb-3 text-xs uppercase tracking-wide text-brand-500">
              {t("profile.source")} {source}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("profile.firstName")}>
              <input
                className={inputClass}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </Field>
            <Field label={t("profile.lastName")}>
              <input
                className={inputClass}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </Field>
            <Field label={t("common.email")}>
              <input
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label={t("profile.phoneReadonly")}>
              <input
                className={inputClass}
                readOnly
                value={String(profile.phone ?? profile.phoneNumber ?? "—")}
              />
            </Field>
            <Field label={t("profile.bio")}>
              <input
                className={inputClass}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </Field>
            <Field label={t("profile.location")}>
              <input
                className={inputClass}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn disabled={action.busy} onClick={saveProfile}>
              {t("common.save")}
            </Btn>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-ink/[0.1] bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:bg-brand-50">
              {t("profile.changeAvatar")}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <div className="mt-6 grid gap-3 border-t border-brand-100 pt-4 sm:grid-cols-[1fr_auto_auto]">
            <Field label={t("profile.otpCode")}>
              <input
                className={inputClass}
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value)}
                placeholder="123456"
              />
            </Field>
            <Btn
              variant="secondary"
              className="self-end"
              onClick={sendPhoneOtp}
            >
              {t("profile.sendOtp")}
            </Btn>
            <Btn className="self-end" onClick={verifyPhone}>
              {t("profile.verify")}
            </Btn>
          </div>
          <p className="mt-4 text-xs text-brand-600">
            {t("profile.roles")}{" "}
            {roles.length ? roles.join(", ") : "—"}
          </p>
        </Panel>
      )}

      <Panel title={t("profile.notifSettings")}>
        {notifSettings.loading && (
          <p className="text-sm text-brand-600">{t("common.loading")}</p>
        )}
        {notifSettings.error && <Alert>{notifSettings.error}</Alert>}
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["email", t("common.email")],
              ["push", "Push"],
              ["inApp", t("nav.notifications")],
              ["sms", "SMS"],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center justify-between rounded-xl border border-ink/[0.06] px-3 py-2.5 text-sm font-semibold"
            >
              {label}
              <input
                type="checkbox"
                checked={Boolean(channels[key])}
                onChange={(e) =>
                  setChannels((c) => ({ ...c, [key]: e.target.checked }))
                }
              />
            </label>
          ))}
          <label className="flex items-center justify-between rounded-xl border border-ink/[0.06] px-3 py-2.5 text-sm font-semibold sm:col-span-2">
            {t("profile.dnd")}
            <input
              type="checkbox"
              checked={dnd}
              onChange={(e) => setDnd(e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-ink/[0.06] px-3 py-2.5 text-sm font-semibold">
            {t("profile.digestDaily")}
            <input
              type="checkbox"
              checked={digestDaily}
              onChange={(e) => setDigestDaily(e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-ink/[0.06] px-3 py-2.5 text-sm font-semibold">
            {t("profile.digestWeekly")}
            <input
              type="checkbox"
              checked={digestWeekly}
              onChange={(e) => setDigestWeekly(e.target.checked)}
            />
          </label>
        </div>
        <Btn className="mt-4" onClick={saveNotif}>
          {t("profile.saveNotif")}
        </Btn>
      </Panel>

      <Panel title={t("security.pushTitle")}>
        <WebPushSettings />
      </Panel>

      <Panel title={t("security.lockTitle")}>
        <SessionLockSettings />
      </Panel>

      <Panel title={t("profile.prefs")}>
        {prefs.loading && (
          <p className="text-sm text-brand-600">{t("common.loading")}</p>
        )}
        {prefs.error && <Alert>{prefs.error}</Alert>}
        {prefs.data ? (
          <div className="space-y-2 text-sm text-ink-mute">
            <p>{t("profile.prefsHint")}</p>
            <Btn variant="secondary" onClick={savePrefs}>
              {t("profile.savePrefs")}
            </Btn>
          </div>
        ) : null}
      </Panel>

      <Panel title={t("profile.kycTitle")}>
        <p className="mb-2 text-sm text-ink-mute">
          {t("profile.kycHint")}{" "}
          <strong>{String(profile?.kycStatus ?? "none")}</strong>
        </p>
        {String(profile?.kycStatus ?? "none") !== "verified" &&
          String(profile?.kycStatus ?? "none") !== "pending" && (
          <div className="space-y-2">
            <Field label={t("profile.kycFullName")}>
              <input
                className={inputClass}
                id="kyc-full-name"
                defaultValue={`${firstName} ${lastName}`.trim()}
              />
            </Field>
            <Field label={t("profile.kycId")}>
              <input className={inputClass} id="kyc-id-number" />
            </Field>
            <Btn
              onClick={() =>
                void action.run(async () => {
                  const fullName = (
                    document.getElementById("kyc-full-name") as HTMLInputElement
                  )?.value;
                  const idNumber = (
                    document.getElementById("kyc-id-number") as HTMLInputElement
                  )?.value;
                  await bffFetch("/users/me/kyc", {
                    method: "POST",
                    body: JSON.stringify({ fullName, idNumber }),
                  });
                  const me = await bffFetch<Profile>("/users/me");
                  setProfile(me);
                })
              }
            >
              {t("profile.kycSubmit")}
            </Btn>
          </div>
        )}
        {String(profile?.kycStatus) === "pending" ? (
          <Alert tone="amber">{t("profile.kycPending")}</Alert>
        ) : null}
      </Panel>

      <Panel title={t("profile.engagement")}>
        {engagement.loading && (
          <p className="text-sm text-brand-600">{t("common.loading")}</p>
        )}
        {engagement.error && (
          <p className="text-sm text-brand-600">
            {t("profile.unavailable", { error: engagement.error })}
          </p>
        )}
        {engagement.data && (
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-xl bg-mint-50 px-3 py-1.5 font-semibold text-mint-800">
              {t("home.levelPts", {
                level: String(
                  (engagement.data as { level?: number }).level ?? "—",
                ),
                pts: String(
                  (engagement.data as { totalPoints?: number }).totalPoints ??
                    "—",
                ),
              })}
            </span>
            <span className="rounded-xl bg-brand-50 px-3 py-1.5 font-semibold text-brand-800">
              {t("home.streakDays", {
                n: String(
                  (engagement.data as { currentStreak?: number })
                    .currentStreak ?? 0,
                ),
              })}
            </span>
            <Link
              href="/app/referral"
              className="text-sm font-semibold text-brand-600"
            >
              {t("nav.referral")} →
            </Link>
          </div>
        )}
      </Panel>
    </div>
  );
}
