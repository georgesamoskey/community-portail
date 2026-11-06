/** URL du portail — pour résoudre {{portal}} dans les hrefs CMS. */
export function portalUrl(): string {
  return (
    process.env.NEXT_PUBLIC_PORTAL_URL?.replace(/\/$/, "") ||
    "http://localhost:3003"
  );
}

/** URL du backoffice — pour résoudre {{backoffice}} dans les hrefs CMS. */
export function backofficeUrl(): string | null {
  const u = process.env.NEXT_PUBLIC_BACKOFFICE_URL?.replace(/\/$/, "");
  return u || null;
}
