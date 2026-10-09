import { isEntitlementActive } from "./learning.mjs";

function asTime(value, field) {
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(time)) throw new Error(`${field} must be a valid date`);
  return time;
}

function membershipActive(membership, now = Date.now()) {
  if (!membership || membership.status !== "ACTIVE") return false;
  if (membership.endsAt && asTime(membership.endsAt, "membership.endsAt") <= now) return false;
  return true;
}

export function cohortReservationDecision({ cohort, activeSeats = 0, now = Date.now() }) {
  if (!cohort) return { allowed: false, reason: "COHORT_MISSING" };
  if (!Number.isInteger(activeSeats) || activeSeats < 0) throw new Error("activeSeats must be a non-negative integer");

  const opensAt = cohort.enrollmentOpensAt ? asTime(cohort.enrollmentOpensAt, "cohort.enrollmentOpensAt") : null;
  const closesAt = cohort.enrollmentClosesAt ? asTime(cohort.enrollmentClosesAt, "cohort.enrollmentClosesAt") : null;

  if (cohort.status !== "OPEN") return { allowed: false, reason: "COHORT_NOT_OPEN" };
  if (opensAt !== null && now < opensAt) return { allowed: false, reason: "ENROLLMENT_NOT_STARTED" };
  if (closesAt !== null && now >= closesAt) return { allowed: false, reason: "ENROLLMENT_CLOSED" };
  if (cohort.capacity != null) {
    if (!Number.isInteger(cohort.capacity) || cohort.capacity < 0) throw new Error("cohort.capacity must be a non-negative integer");
    if (activeSeats >= cohort.capacity) return { allowed: false, reason: "COHORT_FULL" };
  }

  return { allowed: true, reason: "AVAILABLE" };
}

export function cohortLearningSpaceDecision({ entitlement, seatStatus, now = Date.now() }) {
  if (!isEntitlementActive(entitlement, now)) return { allowed: false, reason: "ENTITLEMENT_INACTIVE" };
  if (!new Set(["RESERVED", "ACTIVE", "COMPLETED"]).has(seatStatus)) {
    return { allowed: false, reason: "COHORT_SEAT_INACTIVE" };
  }
  return { allowed: true, reason: "AUTHORIZED" };
}

export function eventRecordingState({ event, now = Date.now() }) {
  if (!event) return "EVENT_MISSING";
  const endsAt = asTime(event.endsAt, "event.endsAt");
  if (now < endsAt) return "NOT_YET_AVAILABLE";
  if (typeof event.recordingUrl === "string" && event.recordingUrl.trim().length > 0) return "AVAILABLE";
  return "NOT_POSTED";
}

export function capstoneReviewDecision({ reviewerKind, decision, submissionRevision, currentRevision }) {
  if (!Number.isInteger(submissionRevision) || submissionRevision <= 0) throw new Error("submissionRevision must be a positive integer");
  if (!Number.isInteger(currentRevision) || currentRevision <= 0) throw new Error("currentRevision must be a positive integer");
  if (reviewerKind !== "FACULTY") return { allowed: false, reason: "HUMAN_FACULTY_REQUIRED" };
  if (!new Set(["APPROVED", "CHANGES_REQUESTED"]).has(decision)) return { allowed: false, reason: "INVALID_REVIEW_DECISION" };
  if (submissionRevision !== currentRevision) return { allowed: false, reason: "SUBMISSION_REVISION_STALE" };
  return { allowed: true, reason: "REVIEW_ACCEPTED" };
}

export function cohortCertificateDecision({
  entitlement,
  totalLessons,
  completedLessons,
  requiresCapstone = false,
  latestSubmission = null,
  now = Date.now(),
}) {
  if (!isEntitlementActive(entitlement, now)) return { allowed: false, reason: "ENTITLEMENT_INACTIVE" };
  if (!Number.isInteger(totalLessons) || totalLessons <= 0) return { allowed: false, reason: "COURSE_HAS_NO_REQUIRED_LESSONS" };
  if (!Number.isInteger(completedLessons) || completedLessons < totalLessons) return { allowed: false, reason: "LESSONS_INCOMPLETE" };
  if (!requiresCapstone) return { allowed: true, reason: "COURSE_COMPLETE" };
  if (!latestSubmission) return { allowed: false, reason: "CAPSTONE_MISSING" };
  if (latestSubmission.status !== "APPROVED") return { allowed: false, reason: "CAPSTONE_NOT_APPROVED" };
  if (!Number.isInteger(latestSubmission.revision) || latestSubmission.revision <= 0) {
    return { allowed: false, reason: "CAPSTONE_REVISION_INVALID" };
  }
  if (!latestSubmission.review || latestSubmission.review.decision !== "APPROVED") {
    return { allowed: false, reason: "CAPSTONE_APPROVAL_MISSING" };
  }
  if (latestSubmission.review.reviewerKind !== "FACULTY") {
    return { allowed: false, reason: "HUMAN_FACULTY_REQUIRED" };
  }
  if (latestSubmission.review.submissionRevision !== latestSubmission.revision) {
    return { allowed: false, reason: "CAPSTONE_APPROVAL_STALE" };
  }
  return { allowed: true, reason: "CAPSTONE_APPROVED" };
}

export function retakeDecision({ membership, targetCohort, activeSeats = 0, now = Date.now() }) {
  if (!membershipActive(membership, now)) return { allowed: false, reason: "MEMBERSHIP_INACTIVE" };
  if (membership.includesRetakes !== true) return { allowed: false, reason: "RETAKE_NOT_INCLUDED" };

  const cohortDecision = cohortReservationDecision({ cohort: targetCohort, activeSeats, now });
  if (!cohortDecision.allowed) return cohortDecision;

  return { allowed: true, reason: "RETAKE_AVAILABLE" };
}
