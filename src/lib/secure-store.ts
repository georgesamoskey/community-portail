/** Stockage chiffré léger (AES-GCM) pour secrets locaux PWA. */

function toB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const saltBuf = salt.buffer.slice(
    salt.byteOffset,
    salt.byteOffset + salt.byteLength,
  ) as ArrayBuffer;
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBuf, iterations: 100_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

const SALT_KEY = "akiba-secure-salt";

function getSalt(): Uint8Array {
  let raw = localStorage.getItem(SALT_KEY);
  if (!raw) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    raw = toB64(salt.buffer);
    localStorage.setItem(SALT_KEY, raw);
    return salt;
  }
  return new Uint8Array(fromB64(raw));
}

/** Phrase dérivée appareil (non parfait, mieux que plaintext). */
function devicePass(): string {
  const id = localStorage.getItem("akiba-device-id") || crypto.randomUUID();
  localStorage.setItem("akiba-device-id", id);
  return `akiba:${id}:${location.origin}`;
}

export async function secureSet(key: string, value: string): Promise<void> {
  const salt = getSalt();
  const cryptoKey = await deriveKey(devicePass(), salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    new TextEncoder().encode(value),
  );
  localStorage.setItem(
    `akiba-sec:${key}`,
    JSON.stringify({ iv: toB64(iv.buffer), data: toB64(enc) }),
  );
}

export async function secureGet(key: string): Promise<string | null> {
  const raw = localStorage.getItem(`akiba-sec:${key}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { iv: string; data: string };
    const salt = getSalt();
    const cryptoKey = await deriveKey(devicePass(), salt);
    const dec = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(fromB64(parsed.iv)) },
      cryptoKey,
      fromB64(parsed.data),
    );
    return new TextDecoder().decode(dec);
  } catch {
    return null;
  }
}

export function secureRemove(key: string): void {
  localStorage.removeItem(`akiba-sec:${key}`);
}

/** Compresse une image avant upload (qualité ~0.72). */
export async function compressImage(
  file: File,
  maxEdge = 1600,
  quality = 0.72,
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, "image/jpeg", quality),
  );
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
    type: "image/jpeg",
  });
}
