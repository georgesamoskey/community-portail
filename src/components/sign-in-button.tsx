"use client";

import Link from "next/link";
import { cx } from "@/lib/cx";

type Props = {
  callbackUrl?: string;
  label?: string;
  className?: string;
};

/** CTA vers l’écran login téléphone (mot de passe ou OTP) — plus d’OIDC Keycloak. */
export function SignInButton({
  callbackUrl = "/app",
  label = "Se connecter",
  className,
}: Props) {
  const href =
    callbackUrl && callbackUrl !== "/login"
      ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/login";
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex items-center justify-center rounded-xl border border-ink/[0.1] bg-surface px-5 py-3 text-sm font-semibold text-ink transition hover:bg-ink/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 active:scale-[0.98]",
        className,
      )}
    >
      {label}
    </Link>
  );
}
