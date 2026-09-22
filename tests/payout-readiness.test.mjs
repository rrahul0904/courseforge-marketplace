import test from "node:test";
import assert from "node:assert/strict";
import { persistedPayoutReadiness, stripeAccountReadiness } from "../domain/payout-readiness.mjs";

test("Stripe account is ready only when details, charges, payouts and requirements are clear", () => {
  const result = stripeAccountReadiness({
    details_submitted: true,
    charges_enabled: true,
    payouts_enabled: true,
    requirements: { currently_due: [] }
  });
  assert.equal(result.ready, true);
  assert.deepEqual(result.blockers, []);
});

test("outstanding Stripe requirements block marketplace checkout readiness", () => {
  const result = stripeAccountReadiness({
    details_submitted: true,
    charges_enabled: true,
    payouts_enabled: true,
    requirements: { currently_due: ["external_account"] }
  });
  assert.equal(result.ready, false);
  assert.deepEqual(result.blockers, ["requirements_due"]);
});

test("a connected account id or partial booleans are not sufficient payout readiness", () => {
  assert.equal(persistedPayoutReadiness({ payoutAccountId: "acct_123" }), false);
  assert.equal(persistedPayoutReadiness({ payoutAccountId: "acct_123", payoutReady: false }), false);
  assert.equal(persistedPayoutReadiness({ payoutAccountId: "acct_123", payoutReady: true }), true);
});
