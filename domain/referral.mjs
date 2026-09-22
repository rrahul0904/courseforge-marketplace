import { createHmac, timingSafeEqual } from "node:crypto";

function sign(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function issueReferralToken({ instructorId, courseId, ttlSeconds = 60 * 60 * 24 * 30 }, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!secret || secret.length < 32) throw new Error("Referral signing secret must be at least 32 characters");
  const payload = Buffer.from(JSON.stringify({
    instructorId,
    courseId,
    exp: nowSeconds + ttlSeconds
  })).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyReferralToken(token, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!token || !secret || secret.length < 32) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!decoded.instructorId || !decoded.courseId || !decoded.exp || decoded.exp <= nowSeconds) return null;
    return decoded;
  } catch {
    return null;
  }
}
