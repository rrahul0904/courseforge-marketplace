export const AcquisitionChannel = Object.freeze({
  MARKETPLACE: "marketplace",
  INSTRUCTOR_REFERRAL: "instructor_referral",
  PLATFORM_SUBSCRIPTION: "platform_subscription"
});

export const DEFAULT_REVENUE_POLICY = Object.freeze({
  marketplacePlatformBps: 1500,
  instructorReferralPlatformBps: 500
});

export function splitTransactionalRevenue({ netCents, channel, policy = DEFAULT_REVENUE_POLICY }) {
  if (!Number.isInteger(netCents) || netCents < 0) {
    throw new Error("netCents must be a non-negative integer");
  }

  let platformBps;
  if (channel === AcquisitionChannel.MARKETPLACE) {
    platformBps = policy.marketplacePlatformBps;
  } else if (channel === AcquisitionChannel.INSTRUCTOR_REFERRAL) {
    platformBps = policy.instructorReferralPlatformBps;
  } else {
    throw new Error(`Unsupported transactional acquisition channel: ${channel}`);
  }

  const platformCents = Math.round((netCents * platformBps) / 10_000);
  return {
    platformCents,
    instructorCents: netCents - platformCents,
    platformBps
  };
}

export function assertEntitlementIssuable(order) {
  if (!order || order.status !== "PAID") {
    throw new Error("Entitlements may only be issued from a verified PAID order");
  }
  if (!order.providerPaymentId) {
    throw new Error("Paid order must have a verified provider payment id");
  }
  return true;
}

export function buildCourseEntitlement({ order, orderItem, userId }) {
  assertEntitlementIssuable(order);
  if (!orderItem?.productId) throw new Error("Order item must reference a product");
  return {
    userId,
    orderId: order.id,
    productId: orderItem.productId,
    status: "ACTIVE",
    startsAt: order.paidAt ?? new Date().toISOString()
  };
}

export function canLeaveVerifiedReview({ enrollment, progressPercent = 0 }) {
  if (!enrollment) return false;
  if (enrollment.revokedAt) return false;
  return progressPercent >= 10;
}
