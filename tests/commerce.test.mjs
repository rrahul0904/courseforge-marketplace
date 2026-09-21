import test from "node:test";
import assert from "node:assert/strict";
import {
  AcquisitionChannel,
  splitTransactionalRevenue,
  assertEntitlementIssuable,
  buildCourseEntitlement,
  canLeaveVerifiedReview
} from "../domain/commerce.mjs";

test("marketplace sale uses configurable 15% platform share", () => {
  const result = splitTransactionalRevenue({netCents: 10_000, channel: AcquisitionChannel.MARKETPLACE});
  assert.deepEqual(result, {platformCents: 1500, instructorCents: 8500, platformBps: 1500});
});

test("instructor referral sale uses configurable 5% platform share", () => {
  const result = splitTransactionalRevenue({netCents: 10_000, channel: AcquisitionChannel.INSTRUCTOR_REFERRAL});
  assert.deepEqual(result, {platformCents: 500, instructorCents: 9500, platformBps: 500});
});

test("pending orders cannot mint entitlements", () => {
  assert.throws(() => assertEntitlementIssuable({status:"PENDING"}), /verified PAID order/);
});

test("paid order without verified provider payment id cannot mint entitlements", () => {
  assert.throws(() => assertEntitlementIssuable({status:"PAID"}), /provider payment id/);
});

test("verified paid order can mint an active entitlement", () => {
  const entitlement = buildCourseEntitlement({
    order:{id:"ord_1",status:"PAID",providerPaymentId:"pi_1",paidAt:"2026-09-21T16:00:00Z"},
    orderItem:{productId:"prod_1"},
    userId:"usr_1"
  });
  assert.equal(entitlement.status, "ACTIVE");
  assert.equal(entitlement.orderId, "ord_1");
  assert.equal(entitlement.productId, "prod_1");
});

test("verified reviews require a live enrollment and minimum engagement", () => {
  assert.equal(canLeaveVerifiedReview({enrollment:{id:"enr_1"},progressPercent:9}), false);
  assert.equal(canLeaveVerifiedReview({enrollment:{id:"enr_1"},progressPercent:10}), true);
  assert.equal(canLeaveVerifiedReview({enrollment:{id:"enr_1",revokedAt:"2026-09-21"},progressPercent:100}), false);
});
