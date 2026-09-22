export type ReferralPayload = { instructorId: string; courseId: string; exp: number };
export function issueReferralToken(
  input: { instructorId: string; courseId: string; ttlSeconds?: number },
  secret: string,
  nowSeconds?: number
): string;
export function verifyReferralToken(token: string | null | undefined, secret: string | null | undefined, nowSeconds?: number): ReferralPayload | null;
