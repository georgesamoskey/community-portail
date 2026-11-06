import { isCountry } from "@/lib/i18n/config";

export type PlaceHint = {
  city: string;
  country: string | null;
};

/** Ville et pays seulement. Les coordonnées ne sont pas conservées. */
export async function placeFromCoords(
  lat: number,
  lng: number,
): Promise<PlaceHint | null> {
  const url = new URL(
    "https://api.bigdatacloud.net/data/reverse-geocode-client",
  );
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("localityLanguage", "fr");
  const response = await fetch(url.toString());
  if (!response.ok) return null;
  const data = (await response.json()) as {
    city?: string;
    locality?: string;
    principalSubdivision?: string;
    countryCode?: string;
  };
  const city = (data.city || data.locality || data.principalSubdivision || "").trim();
  const code = (data.countryCode || "").toUpperCase();
  const country = isCountry(code) ? code : null;
  if (!city && !country) return null;
  return { city, country };
}
