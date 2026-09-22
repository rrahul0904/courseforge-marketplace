import test from "node:test";
import assert from "node:assert/strict";
import { completionPercent, canIssueCertificate, canSubmitVerifiedReview, isEntitlementActive } from "../domain/learning.mjs";

const active = { status: "ACTIVE", revokedAt: null, expiresAt: null };

test("completion percent is bounded and deterministic", () => {
  assert.equal(completionPercent({ totalLessons: 10, completedLessons: 1 }), 10);
  assert.equal(completionPercent({ totalLessons: 10, completedLessons: 12 }), 100);
  assert.equal(completionPercent({ totalLessons: 0, completedLessons: 0 }), 0);
});

test("reviews require active entitlement and at least ten percent progress", () => {
  assert.equal(canSubmitVerifiedReview({ entitlement: active, totalLessons: 10, completedLessons: 0 }), false);
  assert.equal(canSubmitVerifiedReview({ entitlement: active, totalLessons: 10, completedLessons: 1 }), true);
  assert.equal(canSubmitVerifiedReview({ entitlement: { ...active, status: "REVOKED" }, totalLessons: 10, completedLessons: 10 }), false);
});

test("certificate requires active entitlement and complete course", () => {
  assert.equal(canIssueCertificate({ entitlement: active, totalLessons: 3, completedLessons: 2 }), false);
  assert.equal(canIssueCertificate({ entitlement: active, totalLessons: 3, completedLessons: 3 }), true);
  assert.equal(canIssueCertificate({ entitlement: { ...active, revokedAt: new Date().toISOString() }, totalLessons: 3, completedLessons: 3 }), false);
});

test("expired entitlement is inactive", () => {
  assert.equal(isEntitlementActive({ status: "ACTIVE", revokedAt: null, expiresAt: new Date(Date.now() - 1000).toISOString() }), false);
});
