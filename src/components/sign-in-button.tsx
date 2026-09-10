"use client";

import { signIn } from "next-auth/react";
import { cx } from "@/lib/cx";

type Props = {
  callbackUrl?: string;
  label?: string;
  className?: string;
};

export function SignInButton({
  callbackUrl = "/app/chat",
  label = "Se connecter",
  className,
}: Props) {
  return (
    <button
      type="button"
      onClick={() => signIn("keycloak", { callbackUrl })}
      className={cx(
        "inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-lift transition hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 active:scale-[0.98]",
        className,
      )}
    >
      {label}
    </button>
  );
}
