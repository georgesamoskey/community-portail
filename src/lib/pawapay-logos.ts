/** Logos CDN PawaPay — alignés `eagaseke/.../pawapay-markets.ts`. */

const LOGO = {
  mtn: "https://static-content.pawapay.io/company_logos/mtn.png",
  airtel: "https://static-content.pawapay.io/company_logos/airtel.png",
  orange: "https://static-content.pawapay.io/company_logos/orange.png",
  moov: "https://static-content.pawapay.io/company_logos/moov.png",
  wave: "https://static-content.pawapay.io/company_logos/wave.png",
  mpesa: "https://static-content.pawapay.io/company_logos/mpesa.png",
  vodacom: "https://static-content.pawapay.io/company_logos/vodacom.png",
  free: "https://static-content.pawapay.io/company_logos/free.png",
  tigo: "https://static-content.pawapay.io/company_logos/tigo.png",
  halotel: "https://static-content.pawapay.io/company_logos/halotel.png",
  zamtel: "https://static-content.pawapay.io/company_logos/zamtel.png",
  tnm: "https://static-content.pawapay.io/company_logos/tnm.png",
  movitel: "https://static-content.pawapay.io/company_logos/movitel.png",
  vodafone: "https://static-content.pawapay.io/company_logos/vodafone.png",
  pawapay: "https://static-content.pawapay.io/company_logos/pawapay.png",
} as const;

export const PAWAPAY_LOGO = LOGO.pawapay;

/** Slugs catalogue plateforme → logo. */
const SLUG_LOGOS: Record<string, string> = {
  pawapay: LOGO.pawapay,
  mtn_momo: LOGO.mtn,
  airtel_money: LOGO.airtel,
  orange_money_cd: LOGO.orange,
  m_pesa_ke: LOGO.mpesa,
  lumicash: LOGO.mtn,
  ecocash_bi: LOGO.airtel,
};

/** Code MMO PawaPay (`MTN_MOMO_COD`, `AIRTEL_OUG`…) → logo. */
export function logoForPawaPayProviderCode(provider: string): string {
  const p = provider.toUpperCase();
  if (p.includes("MTN")) return LOGO.mtn;
  if (p.includes("AIRTEL") || p.includes("AIRTELTIGO")) return LOGO.airtel;
  if (p.includes("ORANGE")) return LOGO.orange;
  if (p.includes("MOOV")) return LOGO.moov;
  if (p.includes("WAVE")) return LOGO.wave;
  if (p.includes("MPESA") || p.includes("M_PESA")) return LOGO.mpesa;
  if (p.includes("VODACOM")) return LOGO.vodacom;
  if (p.includes("FREE")) return LOGO.free;
  if (p.includes("TIGO")) return LOGO.tigo;
  if (p.includes("HALOTEL")) return LOGO.halotel;
  if (p.includes("ZAMTEL")) return LOGO.zamtel;
  if (p.includes("TNM")) return LOGO.tnm;
  if (p.includes("MOVITEL")) return LOGO.movitel;
  if (p.includes("VODAFONE")) return LOGO.vodafone;
  return LOGO.pawapay;
}

/**
 * Résout un logo opérateur pour l’UI.
 * Priorité : URL API → réseau MMO → slug catalogue → PawaPay.
 */
export function resolveOperatorLogo(opts: {
  slug?: string | null;
  network?: string | null;
  apiLogoUrl?: string | null;
  providerHint?: string | null;
}): string {
  const api = opts.apiLogoUrl?.trim();
  if (api) return api;
  const network = opts.network?.trim();
  if (network) return logoForPawaPayProviderCode(network);
  const hint = opts.providerHint?.trim();
  if (hint && hint.includes("_") && /[A-Z]/.test(hint)) {
    return logoForPawaPayProviderCode(hint);
  }
  const slug = (opts.slug ?? opts.providerHint ?? "").trim().toLowerCase();
  if (slug && SLUG_LOGOS[slug]) return SLUG_LOGOS[slug];
  if (hint) return logoForPawaPayProviderCode(hint);
  return LOGO.pawapay;
}
