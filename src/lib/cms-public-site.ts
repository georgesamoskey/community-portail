import { apiOrigin } from "@/lib/portal-api";
import type { SiteDocument, SitePage } from "@/builder/types";

/**
 * Contenu marketing/blog publié depuis le studio CMS (community-backoffice
 * → `/api/cms/ingest`), lu ici via le snapshot public d'eagaseke
 * (`/api/cms/published`, `@Public()`, pas d'auth requise).
 *
 * Contrairement à community-cms (qui lisait des fichiers locaux et
 * pouvait afficher le brouillon en prévisualisation), le portail
 * n'affiche QUE la version publiée — l'aperçu du brouillon reste dans
 * le backoffice (`/admin/cms-preview`).
 */
export async function getPublishedSiteDocument(): Promise<SiteDocument | null> {
  try {
    const res = await fetch(`${apiOrigin()}/api/cms/published`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { doc?: SiteDocument };
    return json?.doc ?? null;
  } catch {
    return null;
  }
}

export function findPageBySlug(
  doc: SiteDocument,
  slugParts: string[],
): SitePage | undefined {
  const slug = slugParts.filter(Boolean).join("/");
  return doc.pages.find((p) => p.slug === slug);
}
