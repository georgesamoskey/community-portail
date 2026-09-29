"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import {
  AuthField,
  AuthShell,
  authBtnClass,
  authBtnSecondaryClass,
  authInputClass,
} from "@/components/auth-shell";
import { useI18n } from "@/lib/i18n/context";
import { COUNTRY_META, type CountryCode } from "@/lib/i18n/config";
import { CountrySelect } from "@/components/country-select";
import {
  PublicAuthError,
  registerAccount,
  requestOtp,
  resendOtp,
} from "@/lib/public-auth";
import { useOtpResendCooldown } from "@/lib/use-otp-resend-cooldown";

function RegisterInner() {
  const { t, country, setCountry } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<0 | 1>(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState(params.get("phone") ?? "");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [referral, setReferral] = useState(params.get("ref") ?? "");
  const [otpCode, setOtpCode] = useState("");
  const [otpRequestId, setOtpRequestId] = useState("");
  const [devHint, setDevHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { secondsLeft, canResend, arm } = useOtpResendCooldown();

  useEffect(() => {
    const c = params.get("country");
    if (c) setCountry(c as CountryCode);
  }, [params, setCountry]);

  const sendOtp = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await requestOtp(phone.trim(), country);
      setOtpRequestId(res.requestId);
      arm(res.resendAfter);
      if (res.devCode) setDevHint(`${t("register.devCode")}: ${res.devCode}`);
      setStep(1);
    } catch (e) {
      setError(
        e instanceof PublicAuthError ? e.message : t("common.error"),
      );
    } finally {
      setBusy(false);
    }
  };

  const onCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      await registerAccount({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        password,
        country,
        otpRequestId,
        otpCode: otpCode.trim(),
        referralCode: referral.trim() || undefined,
      });
      const login = await signIn("password", {
        phone: phone.trim(),
        password,
        country,
        redirect: false,
        callbackUrl: "/app",
      });
      if (login?.error) {
        router.replace(
          `/login?registered=1&phone=${encodeURIComponent(phone.trim())}`,
        );
        return;
      }
      window.location.href = "/app";
    } catch (e) {
      setError(
        e instanceof PublicAuthError ? e.message : t("common.error"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          {t("register.title")}
        </h1>
        <p className="mt-2 text-sm text-ink-mute">{t("register.subtitle")}</p>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-900">
          {error}
        </p>
      ) : null}

      {step === 0 ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <AuthField label={t("register.firstName")}>
              <input
                className={authInputClass}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                required
              />
            </AuthField>
            <AuthField label={t("register.lastName")}>
              <input
                className={authInputClass}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                required
              />
            </AuthField>
          </div>
          <AuthField label={t("common.country")}>
            <CountrySelect
              value={country}
              onChange={setCountry}
              className={`${authInputClass} !pl-10`}
            />
          </AuthField>
          <AuthField label={t("auth.phone")}>
            <input
              className={authInputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              placeholder={`${COUNTRY_META[country].dial}…`}
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
                autoComplete="new-password"
                minLength={6}
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
          <AuthField label={t("register.referralOptional")}>
            <input
              className={authInputClass}
              value={referral}
              onChange={(e) => setReferral(e.target.value.toUpperCase())}
              placeholder="AB12CD34"
            />
          </AuthField>
          <button
            type="button"
            className={authBtnClass}
            disabled={
              busy ||
              !firstName.trim() ||
              !lastName.trim() ||
              !phone.trim() ||
              password.length < 6
            }
            onClick={() => void sendOtp()}
          >
            {busy ? t("common.loading") : t("register.sendOtp")}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-ink-mute">
            {t("register.otpSentTo", { phone })}
          </p>
          {devHint ? (
            <p className="rounded-xl bg-mint-50 px-3 py-2 text-xs font-semibold text-mint-800">
              {devHint}
            </p>
          ) : null}
          <AuthField label={t("register.otpCode")}>
            <input
              className={authInputClass}
              value={otpCode}
              onChange={(e) =>
                setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
            />
          </AuthField>
          <button
            type="button"
            className={authBtnClass}
            disabled={busy || otpCode.length < 6}
            onClick={() => void onCreate()}
          >
            {busy ? t("common.loading") : t("register.create")}
          </button>
          <button
            type="button"
            className={authBtnSecondaryClass}
            disabled={busy || !canResend}
            onClick={() => {
              if (!canResend) return;
              setBusy(true);
              setError(null);
              void resendOtp(phone.trim(), otpRequestId, country)
                .then((r) => {
                  setOtpRequestId(r.requestId);
                  arm(r.resendAfter);
                  if (r.devCode)
                    setDevHint(`${t("register.devCode")}: ${r.devCode}`);
                })
                .catch((e) =>
                  setError(
                    e instanceof PublicAuthError ? e.message : t("common.error"),
                  ),
                )
                .finally(() => setBusy(false));
            }}
          >
            {canResend
              ? t("register.resendOtp")
              : t("auth.resendWait", { seconds: secondsLeft })}
          </button>
          <button
            type="button"
            className="w-full text-sm font-semibold text-ink-mute"
            onClick={() => setStep(0)}
          >
            {t("common.back")}
          </button>
        </div>
      )}

      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-brand-600">
          {t("auth.signIn")}
        </Link>
      </p>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm">…</p>}>
      <RegisterInner />
    </Suspense>
  );
}
