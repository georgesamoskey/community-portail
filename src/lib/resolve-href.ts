import { portalUrl, backofficeUrl } from "@/lib/cms-site-urls";

/** Résout {{portal}} et {{backoffice}} dans les hrefs CMS. */
export function resolveHref(href: string): string {
  const portal = portalUrl();
  const bo = backofficeUrl() ?? "";
  return href
    .replaceAll("{{portal}}", portal)
    .replaceAll("{{backoffice}}", bo);
}

export function isExternalHref(href: string): boolean {
  const r = resolveHref(href);
  return /^https?:\/\//i.test(r) || r.startsWith("mailto:");
}
