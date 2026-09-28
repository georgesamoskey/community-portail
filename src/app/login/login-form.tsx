"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SignInButton } from "@/components/sign-in-button";
import {
  AuthField,
  AuthModeChips,
  AuthShell,
  authBtnClass,
  authBtnSecondaryClass,
  authInputClass,
} from "@/components/auth-shell";
import { useI18n } from "@/lib/i18n/context";
import { COUNTRY_META, type CountryCode } from "@/lib/i18n/config";
import { PublicAuthError, requestOtp } from "@/lib/public-auth";

export function LoginForm({ configured }: { configured: boolean }) {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/app";
  const { t, country, setCountry } = useI18n();
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [phone, setPhone] = useState(params.get("phone") ?? "");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpRequestId, setOtpRequestId] = useState("");
  const [devHint, setDevHint] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fromQuery = params.get("country");
    if (fromQuery) setCountry(fromQuery as CountryCode);
  }, [params, setCountry]);

  const sendOtp = async () => {
    setBusy(true);
    setError(null);
    setDevHint(null);
    try {
      const res = await requestOtp(phone.trim(), country);
      setOtpRequestId(res.requestId);
      if (res.devCode) setDevHint(`${t("register.devCode")}: ${res.devCode}`);
    } catch (e) {
      setError(e instanceof PublicAuthError ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res =
      mode === "otp"
        ? await signIn("otp", {
            phone,
            code: otpCode,
            requestId: otpRequestId,
            country,
            redirect: false,
            callbackUrl,
          })
        : await signIn("password", {
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
      <div className="mb-5 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
          {t("auth.loginTitle")}
        </h1>
        <p className="mt-1.5 text-sm text-ink-mute">{t("auth.loginSubtitle")}</p>
        <p className="mt-1 text-xs font-medium text-mint-700">
          {t("auth.sameAccount")}
        </p>
      </div>

      <AuthModeChips
        mode={mode}
        onChange={setMode}
        passwordLabel={t("auth.modePassword")}
        otpLabel={t("auth.modeOtp")}
      />

      {params.get("registered") === "1" ? (
        <p className="mb-4 rounded-xl bg-mint-50 px-3 py-2.5 text-sm text-mint-900">
          {t("auth.registeredOk")}
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
      {devHint ? (
        <p className="mb-3 rounded-xl bg-mint-50 px-3 py-2 text-xs text-mint-900">
          {devHint}
        </p>
      ) : null}

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
        {mode === "password" ? (
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
        ) : (
          <>
            <button
              type="button"
              disabled={busy || !phone.trim()}
              onClick={() => void sendOtp()}
              className={authBtnSecondaryClass}
            >
              {t("auth.sendOtp")}
            </button>
            <AuthField label={t("auth.otp")}>
              <input
                className={authInputClass}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
            </AuthField>
          </>
        )}
        <button
          type="submit"
          disabled={busy || (mode === "otp" && !otpRequestId)}
          className={authBtnClass}
        >
          {busy ? t("common.loading") : t("auth.signIn")}
        </button>
      </form>

      <div className="mt-5 flex flex-col gap-2.5">
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
          {configured ? (
            <SignInButton
              callbackUrl={callbackUrl}
              label={t("auth.signInKeycloak")}
              className="!h-auto !border-0 !bg-transparent !px-0 !py-0 !text-sm !font-medium !text-ink-mute !shadow-none hover:!bg-transparent"
            />
          ) : (
            <Link href="/" className="font-medium text-ink-mute">
              {t("nav.home")}
            </Link>
          )}
        </div>
      </div>
    </AuthShell>
  );
}
