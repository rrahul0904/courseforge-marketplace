export function completionPercent({ totalLessons, completedLessons }) {
  if (!Number.isInteger(totalLessons) || totalLessons < 0) throw new Error("totalLessons must be a non-negative integer");
  if (!Number.isInteger(completedLessons) || completedLessons < 0) throw new Error("completedLessons must be a non-negative integer");
  if (totalLessons === 0) return 0;
  return Math.min(100, Math.round((Math.min(completedLessons, totalLessons) / totalLessons) * 100));
}

export function isEntitlementActive(entitlement, now = Date.now()) {
  if (!entitlement || entitlement.status !== "ACTIVE" || entitlement.revokedAt) return false;
  if (entitlement.expiresAt && new Date(entitlement.expiresAt).getTime() <= now) return false;
  return true;
}

export function canIssueCertificate({ entitlement, totalLessons, completedLessons }) {
  return isEntitlementActive(entitlement) && totalLessons > 0 && completedLessons >= totalLessons;
}

export function canSubmitVerifiedReview({ entitlement, totalLessons, completedLessons }) {
  return isEntitlementActive(entitlement) && completionPercent({ totalLessons, completedLessons }) >= 10;
}
