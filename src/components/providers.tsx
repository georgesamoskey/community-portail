"use client";

import { SessionProvider } from "next-auth/react";
import { I18nProvider } from "@/lib/i18n/context";
import { OfflineProvider } from "@/lib/offline/context";
import { PwaRegister } from "@/components/pwa-register";
import { OnboardingGate } from "@/components/onboarding-gate";
import { SessionLockGate } from "@/components/security-gates";
import { NativePlusBundle } from "@/components/native-plus";
import {
  EdgeSwipeBack,
  SwUpdateToast,
  PinLockGate,
} from "@/components/native-pro";
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
        <OfflineProvider>
          <PwaRegister />
          <NativePlusBundle />
          <EdgeSwipeBack />
          <SwUpdateToast />
          <SessionLockGate>
            <PinLockGate>
              <OnboardingGate>{children}</OnboardingGate>
            </PinLockGate>
          </SessionLockGate>
        </OfflineProvider>
      </I18nProvider>
    </SessionProvider>
  );
}
