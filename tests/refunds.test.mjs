import test from "node:test";
import assert from "node:assert/strict";
import { refundOutcome } from "../domain/refunds.mjs";

test("partial refund preserves access", () => {
  assert.deepEqual(refundOutcome({ netCents: 10000, amountRefundedCents: 2500 }), {
    refundedCents: 2500,
    status: "PARTIALLY_REFUNDED",
    revokeEntitlements: false
  });
});

test("full refund revokes access", () => {
  assert.deepEqual(refundOutcome({ netCents: 10000, amountRefundedCents: 10000 }), {
    refundedCents: 10000,
    status: "REFUNDED",
    revokeEntitlements: true
  });
});

test("refund amount is capped to order net", () => {
  assert.equal(refundOutcome({ netCents: 10000, amountRefundedCents: 12000 }).refundedCents, 10000);
});
