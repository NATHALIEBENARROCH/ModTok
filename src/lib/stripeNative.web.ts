type StripeError = { code: string; message: string };

export async function initStripe(): Promise<void> {
  return;
}

export async function initPaymentSheet(): Promise<{ error?: StripeError }> {
  return { error: { code: 'UnsupportedPlatform', message: 'Secure checkout is available in the ModTok iOS and Android app.' } };
}

export async function presentPaymentSheet(): Promise<{ error?: StripeError }> {
  return { error: { code: 'UnsupportedPlatform', message: 'Secure checkout is available in the ModTok iOS and Android app.' } };
}

// Apple Pay is iOS only; on web the button is never shown.
export async function isPlatformPaySupported(): Promise<boolean> {
  return false;
}

export async function confirmPlatformPayPayment(): Promise<{ error?: StripeError }> {
  return { error: { code: 'UnsupportedPlatform', message: 'Apple Pay is available in the ModTok iOS app.' } };
}

export async function openPlatformPaySetup(): Promise<void> {
  return;
}

export function PlatformPayButton(): null {
  return null;
}

export const PlatformPay = {
  ButtonType: { Buy: 1, SetUp: 2 },
  ButtonStyle: { Black: 2 },
  PaymentType: { Immediate: 'Immediate' },
} as const;
