import {
  COUNTRY_META,
  COUNTRIES,
  type CountryCode,
  isCountry,
  normalizeCountry,
} from "@/lib/i18n/config";

export function countryFlag(code?: string | null): string {
  if (!code) return "🌍";
  const c = code.trim().toUpperCase();
  if (isCountry(c)) return COUNTRY_META[c].flag;
  if (/^[A-Z]{2}$/.test(c)) {
    const A = 0x1f1e6;
    return String.fromCodePoint(
      A + (c.charCodeAt(0) - 65),
      A + (c.charCodeAt(1) - 65),
    );
  }
  return "🌍";
}

export function countryLabel(
  code?: string | null,
  opts?: { withDial?: boolean; withFlag?: boolean },
): string {
  const c = normalizeCountry(code);
  const meta = COUNTRY_META[c];
  const flag = opts?.withFlag === false ? "" : `${meta.flag} `;
  const dial = opts?.withDial ? ` · ${meta.dial}` : "";
  return `${flag}${meta.name}${dial}`.trim();
}

export function countryOptions(): Array<{
  code: CountryCode;
  flag: string;
  name: string;
  dial: string;
  label: string;
}> {
  return COUNTRIES.map((code) => {
    const meta = COUNTRY_META[code];
    return {
      code,
      flag: meta.flag,
      name: meta.name,
      dial: meta.dial,
      label: `${meta.flag} ${meta.dial} · ${meta.name}`,
    };
  });
}
