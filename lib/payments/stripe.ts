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

function stripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return key;
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

  const response = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body,
    cache: "no-store"
  });

  const payload = (await response.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok || !payload.id || !payload.url) {
    throw new Error(payload.error?.message ?? "Stripe Checkout session creation failed");
  }
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
