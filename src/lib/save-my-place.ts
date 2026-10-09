import { bffFetch } from "@/lib/bff-fetch";
import { getGeoOnce } from "@/lib/native";
import { placeFromCoords, type PlaceHint } from "@/lib/place-from-coords";

/** Demande une position approximative et enregistre ville + pays. */
export async function captureMyPlace(): Promise<PlaceHint | null> {
  const coords = await getGeoOnce();
  if (!coords) return null;
  const place = await placeFromCoords(coords.lat, coords.lng);
  if (!place?.city) return null;
  await bffFetch("/users/profile", {
    method: "PUT",
    body: JSON.stringify({
      profile: {
        location: place.city,
        country: place.country || undefined,
      },
    }),
  });
  return place;
}
