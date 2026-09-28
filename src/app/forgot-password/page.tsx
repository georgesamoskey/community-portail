"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import {
  AuthField,
  AuthShell,
  authBtnClass,
  authBtnSecondaryClass,
  authInputClass,
} from "@/components/auth-shell";
import { useI18n } from "@/lib/i18n/context";
import { COUNTRY_META, type CountryCode } from "@/lib/i18n/config";
import {
  forgotPassword,
  PublicAuthError,
  resetPassword,
} from "@/lib/public-auth";

function ForgotInner() {
  const { t, country, setCountry } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [phone, setPhone] = useState("");
  const [otpRequestId, setOtpRequestId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [devHint, setDevHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await forgotPassword(phone.trim(), country);
      const id = res.requestId ?? "";
      setOtpRequestId(id);
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

  const onReset = async () => {
    setBusy(true);
    setError(null);
    try {
      await resetPassword({
        phone: phone.trim(),
        otpRequestId,
        otpCode: otpCode.trim(),
        newPassword,
        country,
      });
      setStep(2);
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
          {t("forgot.title")}
        </h1>
        <p className="mt-2 text-sm text-ink-mute">{t("forgot.subtitle")}</p>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-900">
          {error}
        </p>
      ) : null}

      {step === 0 ? (
        <div className="space-y-4">
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
              inputMode="tel"
              placeholder={`${COUNTRY_META[country].dial}…`}
            />
          </AuthField>
          <button
            type="button"
            className={authBtnClass}
            disabled={busy || !phone.trim()}
            onClick={() => void sendCode()}
          >
            {busy ? t("common.loading") : t("forgot.sendCode")}
          </button>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
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
            />
          </AuthField>
          <AuthField label={t("forgot.newPassword")}>
            <div className="relative">
              <input
                className={`${authInputClass} pr-12`}
                type={showPwd ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
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
          <button
            type="button"
            className={authBtnClass}
            disabled={busy || otpCode.length < 6 || newPassword.length < 6}
            onClick={() => void onReset()}
          >
            {busy ? t("common.loading") : t("forgot.reset")}
          </button>
          <button
            type="button"
            className={authBtnSecondaryClass}
            onClick={() => setStep(0)}
          >
            {t("common.back")}
          </button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4 text-center">
          <p className="rounded-xl bg-mint-50 px-4 py-3 text-sm font-semibold text-mint-900">
            {t("forgot.done")}
          </p>
          <button
            type="button"
            className={authBtnClass}
            onClick={() =>
              router.replace(
                `/login?phone=${encodeURIComponent(phone.trim())}`,
              )
            }
          >
            {t("forgot.backToLogin")}
          </button>
        </div>
      ) : null}

      {step < 2 ? (
        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="font-semibold text-brand-600">
            {t("forgot.backToLogin")}
          </Link>
        </p>
      ) : null}
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm">…</p>}>
      <ForgotInner />
    </Suspense>
  );
}
