"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
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
import { CountrySelect } from "@/components/country-select";
import { PublicAuthError, requestOtp, resendOtp } from "@/lib/public-auth";
import { useOtpResendCooldown } from "@/lib/use-otp-resend-cooldown";

function mapSignInError(
  code: string | undefined,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  if (!code) return t("auth.invalidCredentials");
  const c = code.toLowerCase();
  if (c.includes("credentialssignin") || c === "credentials") {
    return t("auth.invalidCredentials");
  }
  if (c.includes("session") || c.includes("expired")) {
    return t("auth.sessionExpired");
  }
  return t("auth.invalidCredentials");
}

export function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/app";
  const { t, country, setCountry } = useI18n();
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [phone, setPhone] = useState(params.get("phone") ?? "");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpRequestId, setOtpRequestId] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devHint, setDevHint] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [busySend, setBusySend] = useState(false);
  const [busySignIn, setBusySignIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { secondsLeft, canResend, arm } = useOtpResendCooldown();

  useEffect(() => {
    const fromQuery = params.get("country");
    if (fromQuery) setCountry(fromQuery as CountryCode);
  }, [params, setCountry]);

  const switchMode = (next: "password" | "otp") => {
    if (next === mode) return;
    setMode(next);
    setError(null);
    setDevHint(null);
    setOtpCode("");
    setOtpRequestId("");
    setOtpSent(false);
    setPassword("");
  };

  const onPhoneChange = (value: string) => {
    setPhone(value);
    if (mode === "otp" && otpSent) {
      setOtpSent(false);
      setOtpRequestId("");
      setOtpCode("");
      setDevHint(null);
    }
  };

  const sendOtp = async () => {
    if (!phone.trim()) {
      setError(t("auth.phoneRequired"));
      return;
    }
    if (!canResend && otpRequestId) return;
    setBusySend(true);
    setError(null);
    setDevHint(null);
    try {
      const res = otpRequestId
        ? await resendOtp(phone.trim(), otpRequestId, country)
        : await requestOtp(phone.trim(), country);
      setOtpRequestId(res.requestId);
      setOtpSent(true);
      arm(res.resendAfter);
      if (res.devCode) setDevHint(`${t("register.devCode")}: ${res.devCode}`);
    } catch (e) {
      setError(e instanceof PublicAuthError ? e.message : t("common.error"));
    } finally {
      setBusySend(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "otp") {
      if (!otpRequestId || otpCode.length < 6) {
        setError(t("auth.needCode"));
        return;
      }
    } else if (password.length < 6) {
      setError(t("auth.passwordTooShort"));
      return;
    }

    setBusySignIn(true);
    setError(null);
    try {
      const res =
        mode === "otp"
          ? await signIn("otp", {
              phone: phone.trim(),
              code: otpCode,
              requestId: otpRequestId,
              country,
              redirect: false,
              callbackUrl,
            })
          : await signIn("password", {
              phone: phone.trim(),
              password,
              country,
              redirect: false,
              callbackUrl,
            });
      if (res?.error) {
        setError(mapSignInError(res.error, t));
        return;
      }
      window.location.href = callbackUrl;
    } catch {
      setError(t("common.error"));
    } finally {
      setBusySignIn(false);
    }
  };

  const busy = busySend || busySignIn;
  const otpSendLabel = !canResend && otpRequestId
    ? t("auth.resendWait", { seconds: secondsLeft })
    : otpRequestId
      ? t("auth.resendOtp")
      : t("auth.sendOtp");

  const canSubmitPassword =
    phone.trim().length > 0 && password.length >= 6 && !busy;
  const canSubmitOtp =
    phone.trim().length > 0 &&
    !!otpRequestId &&
    otpCode.length === 6 &&
    !busy;

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
        onChange={switchMode}
        passwordLabel={t("auth.modePassword")}
        otpLabel={t("auth.modeOtp")}
      />

      {params.get("registered") === "1" ? (
        <p
          role="status"
          className="mb-4 rounded-xl bg-mint-50 px-3 py-2.5 text-sm text-mint-900"
        >
          {t("auth.registeredOk")}
        </p>
      ) : null}

      {(params.get("error") || error) && (
        <p
          role="alert"
          className="mb-4 rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-900"
        >
          {error ?? mapSignInError(params.get("error") ?? undefined, t)}
        </p>
      )}

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        <AuthField label={t("common.country")}>
          <CountrySelect
            value={country}
            onChange={setCountry}
            disabled={busy}
            className={`${authInputClass} !pl-10`}
          />
        </AuthField>

        <AuthField label={t("auth.phone")}>
          <input
            className={authInputClass}
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder={`${COUNTRY_META[country].dial}…`}
            inputMode="tel"
            autoComplete="tel"
            required
            disabled={busy}
          />
        </AuthField>

        {mode === "password" ? (
          <AuthField label={t("auth.password")}>
            <div className="relative">
              <input
                className={`${authInputClass} pr-14`}
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                minLength={6}
                required
                disabled={busy}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-mute"
                onClick={() => setShowPwd((v) => !v)}
                tabIndex={-1}
              >
                {showPwd ? t("auth.hidePwd") : t("auth.showPwd")}
              </button>
            </div>
          </AuthField>
        ) : (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-ink-mute">
              {t("auth.otpHint")}
            </p>
            <button
              type="button"
              disabled={
                busy || !phone.trim() || (!canResend && !!otpRequestId)
              }
              onClick={() => void sendOtp()}
              className={authBtnSecondaryClass}
            >
              {busySend ? t("common.loading") : otpSendLabel}
            </button>
            {otpSent ? (
              <p role="status" className="text-sm text-ink-mute">
                {t("auth.otpSentTo", { phone: phone.trim() })}
              </p>
            ) : null}
            {devHint ? (
              <p
                role="status"
                className="rounded-xl bg-mint-50 px-3 py-2 text-xs font-semibold text-mint-800"
              >
                {devHint}
              </p>
            ) : null}
            <AuthField label={t("auth.otp")}>
              <input
                className={`${authInputClass} tracking-[0.35em]`}
                value={otpCode}
                onChange={(e) =>
                  setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="••••••"
                maxLength={6}
                required={otpSent}
                disabled={busy || !otpSent}
                aria-describedby="otp-help"
              />
            </AuthField>
            <p id="otp-help" className="text-[11px] text-ink-mute">
              {t("auth.otpDigits")}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={mode === "password" ? !canSubmitPassword : !canSubmitOtp}
          className={authBtnClass}
        >
          {busySignIn ? t("common.loading") : t("auth.signIn")}
        </button>
      </form>

      <div className="mt-5 flex flex-col gap-3">
        <Link href="/register" className={authBtnSecondaryClass}>
          {t("auth.createAccount")}
        </Link>
        <div className="flex items-center justify-between gap-3 text-sm">
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
