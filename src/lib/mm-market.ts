import { COUNTRIES, COUNTRY_META, normalizeCountry, type CountryCode } from "@/lib/i18n/config";

export type MmNetwork = {
  provider: string;
  displayName: string;
  logoUrl?: string;
  currencies?: string[];
};

export type MmProvider = {
  slug?: string;
  id?: string;
  name?: string;
  label?: string;
  network?: string | null;
  logoUrl?: string | null;
  currencies?: string[];
  networks?: MmNetwork[];
};

export function providerSlug(provider: MmProvider): string {
  return provider.slug ?? provider.id ?? "";
}

export function providerLabel(provider: MmProvider): string {
  return provider.label ?? provider.name ?? providerSlug(provider);
}

/** Clé unique d’un opérateur (réseau PawaPay ou slug direct). */
export function providerOptionKey(provider: MmProvider): string {
  const slug = providerSlug(provider);
  const network = provider.network?.trim();
  return network ? `${slug}::${network}` : slug;
}

/** Slug envoyé à l’API (`pawapay`, `lumicash`…). */
export function railSlug(value: string): string {
  const cut = value.indexOf("::");
  return cut === -1 ? value : value.slice(0, cut);
}

export function marketCurrencies(
  country?: string | null,
  provider?: MmProvider | null,
): string[] {
  const fromProvider = (provider?.currencies ?? [])
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
  if (fromProvider.length) return [...new Set(fromProvider)];
  const code = normalizeCountry(country);
  if (code === "CD") return ["CDF", "USD"];
  return [COUNTRY_META[code].currency];
}

export function marketCurrency(country?: string | null, provider?: MmProvider | null): string {
  return marketCurrencies(country, provider)[0] ?? "BIF";
}

export function displayCurrency(currency?: string | null, country?: string | null): string {
  const cur = currency?.trim().toUpperCase();
  if (cur) return cur;
  return marketCurrency(country);
}

export function marketDial(country?: string | null): string {
  return COUNTRY_META[normalizeCountry(country)].dial;
}

/** Remplace l’indicatif si le numéro porte encore celui d’un autre pays. */
export function retargetPhone(phone: string, dial: string): string {
  const compact = phone.replace(/\s/g, "");
  if (compact.startsWith(dial)) return compact;
  for (const code of COUNTRIES) {
    const other = COUNTRY_META[code].dial;
    if (other === dial) continue;
    if (compact === other || compact.startsWith(other)) {
      return dial + compact.slice(other.length);
    }
  }
  if (!compact) return dial;
  if (compact.startsWith("+")) return compact;
  return dial + compact.replace(/^0+/, "");
}

export function providersPath(
  country: string,
  capability: "collection" | "disbursement",
): string {
  const code: CountryCode = normalizeCountry(country);
  return `/mobile-money/providers?capability=${capability}&country=${code}`;
}
