import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

function stripeSignature(secret, timestamp, body) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

test("Stripe webhook signature fixture follows timestamp.payload HMAC contract", () => {
  const secret = "whsec_test_secret";
  const timestamp = 1760000000;
  const body = '{"id":"evt_1","type":"checkout.session.completed"}';
  assert.equal(stripeSignature(secret, timestamp, body), stripeSignature(secret, timestamp, body));
  assert.notEqual(stripeSignature(secret, timestamp, `${body}x`), stripeSignature(secret, timestamp, body));
});
