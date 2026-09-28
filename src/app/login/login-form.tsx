"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SignInButton } from "@/components/sign-in-button";
import {
  AuthField,
  AuthShell,
  authBtnClass,
  authBtnSecondaryClass,
  authInputClass,
} from "@/components/auth-shell";
import { useI18n } from "@/lib/i18n/context";
import { COUNTRY_META, type CountryCode } from "@/lib/i18n/config";

export function LoginForm({ configured }: { configured: boolean }) {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/app";
  const { t, country, setCountry } = useI18n();
  const [phone, setPhone] = useState(params.get("phone") ?? "");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fromQuery = params.get("country");
    if (fromQuery) setCountry(fromQuery as CountryCode);
  }, [params, setCountry]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("password", {
      phone,
      password,
      country,
      redirect: false,
      callbackUrl,
    });
    setBusy(false);
    if (res?.error) {
      setError(t("auth.invalidCredentials"));
      return;
    }
    window.location.href = callbackUrl;
  };

  return (
    <AuthShell>
      <div className="mb-8 text-center sm:text-left">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          {t("auth.loginTitle")}
        </h1>
        <p className="mt-2 text-sm text-ink-mute">{t("auth.loginSubtitle")}</p>
        <p className="mt-1 text-xs font-medium text-mint-700">
          {t("auth.sameAccount")}
        </p>
      </div>

      {params.get("registered") === "1" ? (
        <p className="mb-4 rounded-xl bg-mint-50 px-3 py-2.5 text-sm text-mint-900">
          {t("auth.registeredOk")}
          {params.get("phone") ? (
            <>
              {" "}
              (<strong>{params.get("phone")}</strong>)
            </>
          ) : null}
        </p>
      ) : null}

      {!configured && (
        <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
          {t("auth.keycloakMissing")}
        </p>
      )}

      {(params.get("error") || error) && (
        <p className="mb-4 rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-900">
          {error ?? `${t("common.error")} (${params.get("error")})`}
        </p>
      )}

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        <AuthField label={t("common.country")}>
          <select
            className={authInputClass}
            value={country}
            onChange={(e) => setCountry(e.target.value as CountryCode)}
          >
            {(Object.keys(COUNTRY_META) as CountryCode[]).map((c) => (
              <option key={c} value={c}>
                {COUNTRY_META[c].dial} · {COUNTRY_META[c].name}
              </option>
            ))}
          </select>
        </AuthField>
        <AuthField label={t("auth.phone")}>
          <input
            className={authInputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={`${COUNTRY_META[country].dial}…`}
            inputMode="tel"
            autoComplete="tel"
            required
          />
        </AuthField>
        <AuthField label={t("auth.password")}>
          <div className="relative">
            <input
              className={`${authInputClass} pr-12`}
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-mute"
              onClick={() => setShowPwd((v) => !v)}
            >
              {showPwd ? t("auth.hidePwd") : t("auth.showPwd")}
            </button>
          </div>
        </AuthField>
        <button type="submit" disabled={busy} className={authBtnClass}>
          {busy ? t("common.loading") : t("auth.signIn")}
        </button>
      </form>

      <div className="mt-5 flex flex-col gap-2.5">
        {configured ? (
          <SignInButton
            callbackUrl={callbackUrl}
            label={t("auth.signInKeycloak")}
            className="w-full"
          />
        ) : null}
        <Link href="/register" className={authBtnSecondaryClass}>
          {t("auth.createAccount")}
        </Link>
        <div className="flex items-center justify-between pt-1 text-sm">
          <Link
            href="/forgot-password"
            className="font-semibold text-brand-600"
          >
            {t("auth.forgotPassword")}
          </Link>
          <Link href="/" className="font-medium text-ink-mute">
            {t("nav.home")}
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
