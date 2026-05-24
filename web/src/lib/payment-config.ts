export type PaymentProviderId = "demo" | "stripe";

export function getPaymentProvider(): PaymentProviderId {
  const flag = process.env.PAYMENT_PROVIDER?.toLowerCase();
  if (flag === "stripe" && process.env.STRIPE_SECRET_KEY) return "stripe";
  return "demo";
}

export function getStripeSecretKey(): string | undefined {
  return process.env.STRIPE_SECRET_KEY;
}

export function getStripeWebhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET;
}

export function getAppBaseUrl(): string {
  const fromEnv =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const base = fromEnv || "http://localhost:3000";
  return base.replace(/\/$/, "");
}
