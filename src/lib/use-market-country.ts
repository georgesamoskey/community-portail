"use client";

import { useBff } from "@/lib/use-bff";
import { useI18n } from "@/lib/i18n/context";
import { isCountry, normalizeCountry } from "@/lib/i18n/config";

type Me = {
  phone?: string;
  phoneNumber?: string;
};

/** Pays du cercle s’il est fixé, sinon celui choisi à la connexion. */
export function useMarketCountry(locked?: string | null) {
  const { country: loginCountry } = useI18n();
  const me = useBff<Me>("/users/me");
  const lockedCode =
    locked && isCountry(normalizeCountry(locked)) ? normalizeCountry(locked) : "";
  const country = lockedCode || loginCountry;

  return {
    country,
    locked: Boolean(lockedCode),
    phone: me.data?.phone ?? me.data?.phoneNumber ?? "",
  };
}
