export function completionPercent(input: { totalLessons: number; completedLessons: number }): number;
export function isEntitlementActive(entitlement: { status?: string; revokedAt?: Date | string | null; expiresAt?: Date | string | null } | null | undefined, now?: number): boolean;
export function canIssueCertificate(input: { entitlement: any; totalLessons: number; completedLessons: number }): boolean;
export function canSubmitVerifiedReview(input: { entitlement: any; totalLessons: number; completedLessons: number }): boolean;
