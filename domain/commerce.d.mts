export const AcquisitionChannel: Readonly<{
  MARKETPLACE: "marketplace";
  INSTRUCTOR_REFERRAL: "instructor_referral";
  PLATFORM_SUBSCRIPTION: "platform_subscription";
}>;

export const DEFAULT_REVENUE_POLICY: Readonly<{
  marketplacePlatformBps: number;
  instructorReferralPlatformBps: number;
}>;

export function splitTransactionalRevenue(input: {
  netCents: number;
  channel: "marketplace" | "instructor_referral";
  policy?: {
    marketplacePlatformBps: number;
    instructorReferralPlatformBps: number;
  };
}): {
  platformCents: number;
  instructorCents: number;
  platformBps: number;
};

export function assertEntitlementIssuable(order: {
  status?: string;
  providerPaymentId?: string | null;
}): true;

export function buildCourseEntitlement(input: {
  order: {
    id: string;
    status?: string;
    providerPaymentId?: string | null;
    paidAt?: string | null;
  };
  orderItem: { productId?: string | null };
  userId: string;
}): {
  userId: string;
  orderId: string;
  productId: string;
  status: "ACTIVE";
  startsAt: string;
};

export function canLeaveVerifiedReview(input: {
  enrollment: { revokedAt?: string | null } | null | undefined;
  progressPercent?: number;
}): boolean;
