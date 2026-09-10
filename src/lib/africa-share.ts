/** Partage adapté Afrique — WhatsApp d’abord, SMS ensuite. */

export function africaShareLinks(text: string, url: string) {
  const full = `${text}\n${url}`.trim();
  const encoded = encodeURIComponent(full);
  return {
    full,
    url,
    whatsapp: `https://wa.me/?text=${encoded}`,
    sms: `sms:?&body=${encoded}`,
  };
}

export async function copyShareText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
