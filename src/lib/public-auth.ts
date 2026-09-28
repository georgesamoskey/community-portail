/** Appels auth publics (sans session) — miroir AuthService iOS/Android. */

export class PublicAuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "PublicAuthError";
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/public/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    const msg =
      (typeof data.message === "string" && data.message) ||
      (Array.isArray(data.message) && String(data.message[0])) ||
      (typeof data.error === "string" && data.error) ||
      `Erreur ${res.status}`;
    throw new PublicAuthError(msg, res.status);
  }
  return data as T;
}

export type OtpResponse = {
  requestId: string;
  expiresIn?: number;
  resendAfter?: number;
  /** DEV only */
  devCode?: string;
};

export function requestOtp(phone: string, country: string) {
  return post<OtpResponse>("otp/request", { phone, country });
}

export function resendOtp(phone: string, requestId: string, country: string) {
  return post<OtpResponse>("otp/resend", { phone, requestId, country });
}

export function registerAccount(body: {
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  country: string;
  otpRequestId: string;
  otpCode: string;
  email?: string;
  referralCode?: string;
}) {
  return post<{ accessToken?: string; user?: { id?: string } }>("register", body);
}

export function forgotPassword(phone: string, country: string) {
  return post<OtpResponse & { requestId?: string }>("password/forgot", {
    phone,
    country,
  });
}

export function resetPassword(body: {
  phone: string;
  otpRequestId: string;
  otpCode: string;
  newPassword: string;
  country: string;
}) {
  return post<{ success?: boolean }>("password/reset", body);
}
