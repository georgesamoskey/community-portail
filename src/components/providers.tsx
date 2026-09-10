"use client";

import { SessionProvider } from "next-auth/react";
import { I18nProvider } from "@/lib/i18n/context";
import type { CountryCode, Locale } from "@/lib/i18n/config";

export function Providers({
  children,
  locale,
  country,
}: {
  children: React.ReactNode;
  locale?: Locale;
  country?: CountryCode;
}) {
  return (
    <SessionProvider>
      <I18nProvider initialLocale={locale} initialCountry={country}>
        {children}
      </I18nProvider>
    </SessionProvider>
  );
}
