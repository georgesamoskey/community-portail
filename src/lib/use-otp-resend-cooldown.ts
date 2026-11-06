"use client";

import { useCallback, useEffect, useState } from "react";

/** Aligné sur AUTH_OTP_RESEND_AFTER_SEC (Nest, défaut 45). */
export const OTP_RESEND_DEFAULT_SEC = 45;

/**
 * Compte à rebours avant de pouvoir renvoyer un OTP.
 * Appeler `arm(resendAfter?)` après un envoi / renvoi réussi.
 */
export function useOtpResendCooldown(defaultSec = OTP_RESEND_DEFAULT_SEC) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [secondsLeft]);

  const arm = useCallback(
    (resendAfter?: number) => {
      const n =
        typeof resendAfter === "number" && resendAfter > 0
          ? Math.ceil(resendAfter)
          : defaultSec;
      setSecondsLeft(n);
    },
    [defaultSec],
  );

  return {
    secondsLeft,
    canResend: secondsLeft <= 0,
    arm,
  };
}
