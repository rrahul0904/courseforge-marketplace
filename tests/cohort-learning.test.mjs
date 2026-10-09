import test from "node:test";
import assert from "node:assert/strict";
import {
  capstoneReviewDecision,
  cohortCertificateDecision,
  cohortLearningSpaceDecision,
  cohortReservationDecision,
  eventRecordingState,
  retakeDecision,
} from "../domain/cohort-learning.mjs";

const now = Date.parse("2026-10-09T20:00:00Z");
const activeEntitlement = { status: "ACTIVE", revokedAt: null, expiresAt: null };
const openCohort = {
  status: "OPEN",
  capacity: 25,
  enrollmentOpensAt: "2026-09-01T00:00:00Z",
  enrollmentClosesAt: "2026-10-20T00:00:00Z",
};

function approvedSubmission(revision = 2) {
  return {
    status: "APPROVED",
    revision,
    review: {
      decision: "APPROVED",
      reviewerKind: "FACULTY",
      submissionRevision: revision,
    },
  };
}

test("cohort reservation fails closed for closed and full cohorts", () => {
  assert.deepEqual(cohortReservationDecision({ cohort: { ...openCohort, status: "CLOSED" }, activeSeats: 0, now }), {
    allowed: false,
    reason: "COHORT_NOT_OPEN",
  });
  assert.deepEqual(cohortReservationDecision({ cohort: openCohort, activeSeats: 25, now }), {
    allowed: false,
    reason: "COHORT_FULL",
  });
  assert.deepEqual(cohortReservationDecision({ cohort: openCohort, activeSeats: 24, now }), {
    allowed: true,
    reason: "AVAILABLE",
  });
});

test("learning space requires both active entitlement and a live cohort seat", () => {
  assert.equal(cohortLearningSpaceDecision({ entitlement: activeEntitlement, seatStatus: "ACTIVE", now }).allowed, true);
  assert.deepEqual(cohortLearningSpaceDecision({ entitlement: { ...activeEntitlement, status: "REVOKED" }, seatStatus: "ACTIVE", now }), {
    allowed: false,
    reason: "ENTITLEMENT_INACTIVE",
  });
  assert.deepEqual(cohortLearningSpaceDecision({ entitlement: activeEntitlement, seatStatus: "CANCELLED", now }), {
    allowed: false,
    reason: "COHORT_SEAT_INACTIVE",
  });
});

test("ended event never invents a recording link", () => {
  const ended = { endsAt: "2026-10-09T19:00:00Z", recordingUrl: null };
  assert.equal(eventRecordingState({ event: ended, now }), "NOT_POSTED");
  assert.equal(eventRecordingState({ event: { ...ended, recordingUrl: "https://media.example.test/r/1" }, now }), "AVAILABLE");
  assert.equal(eventRecordingState({ event: { endsAt: "2026-10-10T19:00:00Z", recordingUrl: "https://media.example.test/r/2" }, now }), "NOT_YET_AVAILABLE");
});

test("AI cannot approve a capstone and review approval binds the exact revision", () => {
  assert.deepEqual(capstoneReviewDecision({ reviewerKind: "AI", decision: "APPROVED", submissionRevision: 2, currentRevision: 2 }), {
    allowed: false,
    reason: "HUMAN_FACULTY_REQUIRED",
  });
  assert.deepEqual(capstoneReviewDecision({ reviewerKind: "FACULTY", decision: "APPROVED", submissionRevision: 1, currentRevision: 2 }), {
    allowed: false,
    reason: "SUBMISSION_REVISION_STALE",
  });
  assert.equal(capstoneReviewDecision({ reviewerKind: "FACULTY", decision: "APPROVED", submissionRevision: 2, currentRevision: 2 }).allowed, true);
});

test("capstone course certificate remains blocked until faculty approves the latest revision", () => {
  const base = {
    entitlement: activeEntitlement,
    totalLessons: 6,
    completedLessons: 6,
    requiresCapstone: true,
    now,
  };

  assert.deepEqual(cohortCertificateDecision(base), { allowed: false, reason: "CAPSTONE_MISSING" });
  assert.deepEqual(cohortCertificateDecision({ ...base, latestSubmission: { status: "CHANGES_REQUESTED", revision: 1 } }), {
    allowed: false,
    reason: "CAPSTONE_NOT_APPROVED",
  });
  assert.deepEqual(cohortCertificateDecision({
    ...base,
    latestSubmission: {
      ...approvedSubmission(2),
      review: { ...approvedSubmission(1).review, submissionRevision: 1 },
    },
  }), { allowed: false, reason: "CAPSTONE_APPROVAL_STALE" });
  assert.deepEqual(cohortCertificateDecision({ ...base, latestSubmission: approvedSubmission(2) }), {
    allowed: true,
    reason: "CAPSTONE_APPROVED",
  });
});

test("non-capstone course preserves the existing lesson-completion certificate path", () => {
  assert.deepEqual(cohortCertificateDecision({
    entitlement: activeEntitlement,
    totalLessons: 3,
    completedLessons: 3,
    requiresCapstone: false,
    now,
  }), { allowed: true, reason: "COURSE_COMPLETE" });
});

test("retake requires an active membership benefit and an available target cohort", () => {
  const membership = { status: "ACTIVE", includesRetakes: true, endsAt: "2027-10-09T00:00:00Z" };
  assert.deepEqual(retakeDecision({ membership, targetCohort: openCohort, activeSeats: 5, now }), {
    allowed: true,
    reason: "RETAKE_AVAILABLE",
  });
  assert.deepEqual(retakeDecision({ membership: { ...membership, status: "CANCELLED" }, targetCohort: openCohort, activeSeats: 5, now }), {
    allowed: false,
    reason: "MEMBERSHIP_INACTIVE",
  });
  assert.deepEqual(retakeDecision({ membership, targetCohort: openCohort, activeSeats: 25, now }), {
    allowed: false,
    reason: "COHORT_FULL",
  });
});
