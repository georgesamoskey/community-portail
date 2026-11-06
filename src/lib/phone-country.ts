import { COUNTRIES, COUNTRY_META, type CountryCode } from "@/lib/i18n/config";

/** Pays déduit d’un indicatif tapé (+243, 00243, 243…). */
export function countryFromPhoneInput(raw: string): CountryCode | null {
  const compact = raw.replace(/[^\d+]/g, "");
  let digits = "";
  if (compact.startsWith("+")) digits = compact.slice(1);
  else if (compact.startsWith("00")) digits = compact.slice(2);
  else digits = compact;
  if (digits.length < 10) return null;

  const codes = [...COUNTRIES].sort(
    (a, b) =>
      COUNTRY_META[b].dial.length - COUNTRY_META[a].dial.length,
  );
  for (const code of codes) {
    const dial = COUNTRY_META[code].dial.replace("+", "");
    if (!digits.startsWith(dial)) continue;
    if (digits.length <= dial.length + 5) continue;
    return code;
  }
  return null;
}
