import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const STRIPE_API = "https://api.stripe.com/v1";

type CheckoutInput = {
  orderId: string;
  providerPriceId: string;
  connectedAccountId: string;
  applicationFeeCents: number;
  successUrl: string;
  cancelUrl: string;
  customerEmail: string;
  acquisitionChannel: string;
};

export type StripeConnectedAccount = {
  id: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  requirements?: {
    currently_due?: string[];
    eventually_due?: string[];
    disabled_reason?: string | null;
  } | null;
};

function stripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return key;
}

async function stripeRequest<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${STRIPE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${stripeSecretKey()}`,
      ...(init.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });
  const payload = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? `Stripe request failed: ${path}`);
  return payload;
}

export async function createStripeExpressAccount(input: { email: string; instructorId: string }) {
  const body = new URLSearchParams();
  body.set("type", "express");
  body.set("country", process.env.STRIPE_CONNECT_COUNTRY ?? "US");
  body.set("email", input.email);
  body.set("capabilities[card_payments][requested]", "true");
  body.set("capabilities[transfers][requested]", "true");
  body.set("metadata[courseforgeInstructorId]", input.instructorId);
  return stripeRequest<StripeConnectedAccount>("/accounts", { method: "POST", body });
}

export async function retrieveStripeConnectedAccount(accountId: string) {
  return stripeRequest<StripeConnectedAccount>(`/accounts/${encodeURIComponent(accountId)}`);
}

export async function createStripeAccountLink(input: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}) {
  const body = new URLSearchParams();
  body.set("account", input.accountId);
  body.set("refresh_url", input.refreshUrl);
  body.set("return_url", input.returnUrl);
  body.set("type", "account_onboarding");
  body.set("collection_options[fields]", "eventually_due");
  return stripeRequest<{ url: string; expires_at?: number }>("/account_links", { method: "POST", body });
}

export async function createStripeExpressLoginLink(accountId: string) {
  return stripeRequest<{ url: string }>(
    `/accounts/${encodeURIComponent(accountId)}/login_links`,
    { method: "POST", body: new URLSearchParams() }
  );
}

export async function createStripeCataloguePrice(input: {
  courseId: string;
  priceId: string;
  productName: string;
  amountCents: number;
  currency: string;
}) {
  const productBody = new URLSearchParams();
  productBody.set("name", input.productName);
  productBody.set("metadata[courseforgeCourseId]", input.courseId);
  const product = await stripeRequest<{ id: string }>("/products", {
    method: "POST",
    body: productBody,
    headers: { "Idempotency-Key": `courseforge-product-${input.courseId}` }
  });

  const priceBody = new URLSearchParams();
  priceBody.set("product", product.id);
  priceBody.set("unit_amount", String(input.amountCents));
  priceBody.set("currency", input.currency.toLowerCase());
  priceBody.set("metadata[courseforgePriceId]", input.priceId);
  const price = await stripeRequest<{ id: string }>("/prices", {
    method: "POST",
    body: priceBody,
    headers: { "Idempotency-Key": `courseforge-price-${input.priceId}` }
  });
  return { productId: product.id, priceId: price.id };
}

export async function createStripeCheckoutSession(input: CheckoutInput) {
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("client_reference_id", input.orderId);
  body.set("customer_email", input.customerEmail);
  body.set("success_url", input.successUrl);
  body.set("cancel_url", input.cancelUrl);
  body.set("line_items[0][price]", input.providerPriceId);
  body.set("line_items[0][quantity]", "1");
  body.set("metadata[orderId]", input.orderId);
  body.set("metadata[acquisitionChannel]", input.acquisitionChannel);
  body.set("payment_intent_data[application_fee_amount]", String(input.applicationFeeCents));
  body.set("payment_intent_data[transfer_data][destination]", input.connectedAccountId);
  body.set("payment_intent_data[metadata][orderId]", input.orderId);

  const payload = await stripeRequest<{ id: string; url: string }>("/checkout/sessions", {
    method: "POST",
    body
  });
  if (!payload.id || !payload.url) throw new Error("Stripe Checkout session creation failed");
  return { id: payload.id, url: payload.url };
}

export function verifyStripeWebhookSignature(rawBody: string, signatureHeader: string | null, toleranceSeconds = 300) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  const fields = signatureHeader.split(",").map((part) => part.trim().split("="));
  const timestamp = fields.find(([key]) => key === "t")?.[1];
  const signatures = fields.flatMap(([key, value]) => key === "v1" && value ? [value] : []);
  if (!timestamp || signatures.length === 0) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Math.floor(Date.now() / 1000) - ts) > toleranceSeconds) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  return signatures.some((candidate) => {
    const candidateBuffer = Buffer.from(candidate);
    return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
  });
}
