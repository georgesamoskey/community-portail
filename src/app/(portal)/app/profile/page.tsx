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

type Profile = Record<string, unknown>;

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
  const [prefsJson, setPrefsJson] = useState("");
  const [notifJson, setNotifJson] = useState("");

  useEffect(() => {
    if (prefs.data) setPrefsJson(JSON.stringify(prefs.data, null, 2));
  }, [prefs.data]);

  useEffect(() => {
    if (notifSettings.data)
      setNotifJson(JSON.stringify(notifSettings.data, null, 2));
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
    try {
      const body = JSON.parse(prefsJson) as Record<string, unknown>;
      void action.mutate(
        "/users/preferences",
        { method: "PUT", body: JSON.stringify(body) },
        {
          success: t("profile.prefsSaved"),
          onDone: () => void prefs.refresh(),
        },
      );
    } catch {
      void action.run(async () => {
        throw new Error(t("profile.badPrefsJson"));
      });
    }
  };

  const saveNotif = () => {
    try {
      const body = JSON.parse(notifJson) as Record<string, unknown>;
      void action.mutate(
        "/notifications/settings",
        { method: "PUT", body: JSON.stringify(body) },
        {
          success: t("profile.notifSaved"),
          onDone: () => void notifSettings.refresh(),
        },
      );
    } catch {
      void action.run(async () => {
        throw new Error(t("profile.badNotifJson"));
      });
    }
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
        title={t("profile.title")}
        description={t("profile.desc")}
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

      <Panel title={t("profile.prefs")}>
        {prefs.loading && (
          <p className="text-sm text-brand-600">{t("common.loading")}</p>
        )}
        {prefs.error && <Alert>{prefs.error}</Alert>}
        {prefsJson && (
          <>
            <textarea
              className={`${inputClass} font-mono text-xs`}
              rows={8}
              value={prefsJson}
              onChange={(e) => setPrefsJson(e.target.value)}
            />
            <Btn className="mt-3" onClick={savePrefs}>
              {t("profile.savePrefs")}
            </Btn>
          </>
        )}
      </Panel>

      <Panel title={t("profile.notifSettings")}>
        {notifSettings.loading && (
          <p className="text-sm text-brand-600">{t("common.loading")}</p>
        )}
        {notifSettings.error && <Alert>{notifSettings.error}</Alert>}
        {notifJson && (
          <>
            <textarea
              className={`${inputClass} font-mono text-xs`}
              rows={8}
              value={notifJson}
              onChange={(e) => setNotifJson(e.target.value)}
            />
            <Btn className="mt-3" onClick={saveNotif}>
              {t("profile.saveNotif")}
            </Btn>
          </>
        )}
      </Panel>

      <Panel title="KYC (identité)">
        <p className="mb-2 text-sm text-ink-mute">
          Requis pour les gros décaissements. Statut :{" "}
          <strong>{String(profile?.kycStatus ?? "none")}</strong>
        </p>
        {String(profile?.kycStatus ?? "none") !== "verified" &&
          String(profile?.kycStatus ?? "none") !== "pending" && (
          <div className="space-y-2">
            <Field label="Nom complet (pièce)">
              <input
                className={inputClass}
                id="kyc-full-name"
                defaultValue={`${firstName} ${lastName}`.trim()}
              />
            </Field>
            <Field label="N° pièce d’identité">
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
              Soumettre KYC
            </Btn>
          </div>
        )}
        {String(profile?.kycStatus) === "pending" ? (
          <Alert tone="amber">Dossier en revue par l’équipe.</Alert>
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
          <pre className="max-h-56 overflow-auto rounded-xl bg-brand-50 p-3 text-xs">
            {JSON.stringify(engagement.data, null, 2)}
          </pre>
        )}
      </Panel>
    </div>
  );
}
