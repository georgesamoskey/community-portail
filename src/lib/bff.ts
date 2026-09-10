/** Appels BFF vers eagaseke (cookie de session uniquement). */
export function bffApi(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `/api/eagaseke${p}`;
}
