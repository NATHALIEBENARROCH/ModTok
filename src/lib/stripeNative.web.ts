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
