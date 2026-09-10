"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SignInButton } from "@/components/sign-in-button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useI18n } from "@/lib/i18n/context";
import { COUNTRY_META, type CountryCode } from "@/lib/i18n/config";

function cmsRegisterUrl(): string {
  return (
    (process.env.NEXT_PUBLIC_CMS_URL?.replace(/\/$/, "") ||
      "http://localhost:3004") + "/register"
  );
}

function cmsForgotUrl(): string {
  return (
    (process.env.NEXT_PUBLIC_CMS_URL?.replace(/\/$/, "") ||
      "http://localhost:3004") + "/forgot-password"
  );
}

export function LoginForm({
  configured,
}: {
  configured: boolean;
}) {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/app/chat";
  const { t, messages, country, setCountry } = useI18n();
  const [phone, setPhone] = useState(params.get("phone") ?? "");
  const [password, setPassword] = useState("");
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
    <div className="social-rise w-full max-w-md rounded-2.5xl border border-ink/[0.06] bg-surface/95 p-8 shadow-chat backdrop-blur">
      <div className="mb-4 flex justify-end">
        <LocaleSwitcher compact />
      </div>
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lift">
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M7 18.5 4 21V7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v8a2.5 2.5 0 0 1-2.5 2.5H7Z"
            stroke="currentColor"
            strokeWidth="1.75"
          />
        </svg>
      </div>
      <p className="font-display text-center text-3xl font-bold tracking-tight text-ink">
        {messages.brand}
      </p>
      <h1 className="mt-2 text-center text-lg font-medium text-ink-soft">
        {t("auth.loginTitle")}
      </h1>
      <p className="mt-1 text-center text-sm text-ink-mute">
        {t("auth.loginSubtitle")}
      </p>

      {params.get("registered") === "1" ? (
        <p className="mt-4 rounded-xl bg-mint-50 px-3 py-2 text-sm text-mint-900">
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
        <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {t("auth.keycloakMissing")}
        </p>
      )}

      {params.get("error") && (
        <p className="mt-4 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-900">
          {t("common.error")} ({params.get("error")}).
        </p>
      )}
      {error ? (
        <p className="mt-4 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-900">
          {error}
        </p>
      ) : null}

      <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-3">
        <label className="block text-sm font-medium text-ink">
          {t("common.country")}
          <select
            className="mt-1 w-full rounded-xl border border-ink/[0.1] px-3 py-2 text-sm"
            value={country}
            onChange={(e) => setCountry(e.target.value as CountryCode)}
          >
            {(Object.keys(COUNTRY_META) as CountryCode[]).map((c) => (
              <option key={c} value={c}>
                {c} · {COUNTRY_META[c].name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-ink">
          {t("auth.phone")}
          <input
            className="mt-1 w-full rounded-xl border border-ink/[0.1] px-3 py-2 text-sm"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={`${COUNTRY_META[country].dial}…`}
            required
          />
        </label>
        <label className="block text-sm font-medium text-ink">
          {t("auth.password")}
          <input
            className="mt-1 w-full rounded-xl border border-ink/[0.1] px-3 py-2 text-sm"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-lift hover:bg-brand-600 disabled:opacity-60"
        >
          {busy ? t("common.loading") : t("auth.signIn")}
        </button>
      </form>

      <div className="mt-4 flex flex-col items-center gap-2">
        {configured ? (
          <SignInButton
            callbackUrl={callbackUrl}
            label={t("auth.signInKeycloak")}
            className="w-full"
          />
        ) : null}
        <a
          href={cmsRegisterUrl()}
          className="w-full rounded-xl border border-ink/[0.1] px-4 py-2.5 text-center text-sm font-semibold"
        >
          {t("auth.createAccount")}
        </a>
        <a
          href={cmsForgotUrl()}
          className="text-sm font-medium text-ink-mute hover:text-brand-600"
        >
          {t("auth.forgotPassword")}
        </a>
        <Link href="/" className="text-sm font-medium text-ink-mute hover:text-brand-600">
          {t("nav.home")}
        </Link>
      </div>
    </div>
  );
}
