"use client";

import { signOut } from "next-auth/react";
import { cx } from "@/lib/cx";

/** Après déconnexion : retour sur le site marketing (pas le shell membre). */
function afterLogoutUrl(): string {
  return (
    process.env.NEXT_PUBLIC_CMS_URL?.replace(/\/$/, "") ||
    "http://localhost:3004"
  );
}

type Props = {
  className?: string;
  label?: string;
};

export function SignOutButton({
  className,
  label = "Sortir",
}: Props) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: afterLogoutUrl() })}
      className={cx(
        "inline-flex items-center justify-center rounded-xl border border-ink/[0.1] bg-surface px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-brand-300 hover:text-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        className,
      )}
    >
      {label}
    </button>
  );
}
