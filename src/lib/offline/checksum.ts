/** MD5 hex du JSON sérialisé du tableau `data` (contrat Nest offline-sync). */

import SparkMD5 from "spark-md5";

export function md5Hex(input: string): string {
  return SparkMD5.hash(input);
}

export function checksumForData(data: unknown[]): string {
  return md5Hex(JSON.stringify(data));
}
