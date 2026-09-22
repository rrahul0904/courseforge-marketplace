import test from "node:test";
import assert from "node:assert/strict";
import { assessCourseSubmission, assessPublishDecision } from "../domain/publishing.mjs";

test("draft course requires substantive content and an active price before review", () => {
  const result = assessCourseSubmission({
    title: "AI",
    description: "too short",
    sectionCount: 0,
    lessonCount: 0,
    activePriceCount: 0
  });
  assert.equal(result.ready, false);
  assert.deepEqual(result.gaps, ["title", "description", "section", "lesson", "active_price"]);
});

test("complete draft can enter review", () => {
  const result = assessCourseSubmission({
    title: "Production AI Agents",
    description: "A production-focused course that teaches architecture, evaluation, operations, and resilient delivery patterns for agent systems.",
    sectionCount: 2,
    lessonCount: 8,
    activePriceCount: 1
  });
  assert.equal(result.ready, true);
});

test("admin publish fails closed until review, payout readiness and provider price exist", () => {
  const result = assessPublishDecision({
    status: "IN_REVIEW",
    instructorApproved: true,
    payoutReady: false,
    checkoutPriceCount: 0
  });
  assert.equal(result.ready, false);
  assert.deepEqual(result.gaps, ["payout_not_ready", "checkout_price_missing"]);
});

test("reviewed payout-ready course with provider price can publish", () => {
  const result = assessPublishDecision({
    status: "IN_REVIEW",
    instructorApproved: true,
    payoutReady: true,
    checkoutPriceCount: 1
  });
  assert.equal(result.ready, true);
});
