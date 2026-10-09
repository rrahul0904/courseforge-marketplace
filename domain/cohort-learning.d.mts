export type Decision = { allowed: boolean; reason: string };

export function cohortReservationDecision(input: {
  cohort: {
    status: string;
    capacity?: number | null;
    enrollmentOpensAt?: string | Date | null;
    enrollmentClosesAt?: string | Date | null;
  } | null;
  activeSeats?: number;
  now?: number;
}): Decision;

export function cohortLearningSpaceDecision(input: {
  entitlement: {
    status: string;
    revokedAt?: string | Date | null;
    expiresAt?: string | Date | null;
  } | null;
  seatStatus: string;
  now?: number;
}): Decision;

export function eventRecordingState(input: {
  event: { endsAt: string | Date; recordingUrl?: string | null } | null;
  now?: number;
}): "EVENT_MISSING" | "NOT_YET_AVAILABLE" | "AVAILABLE" | "NOT_POSTED";

export function capstoneReviewDecision(input: {
  reviewerKind: string;
  decision: string;
  submissionRevision: number;
  currentRevision: number;
}): Decision;

export function cohortCertificateDecision(input: {
  entitlement: {
    status: string;
    revokedAt?: string | Date | null;
    expiresAt?: string | Date | null;
  } | null;
  totalLessons: number;
  completedLessons: number;
  requiresCapstone?: boolean;
  latestSubmission?: {
    status: string;
    revision: number;
    review?: {
      decision: string;
      reviewerKind: string;
      submissionRevision: number;
    } | null;
  } | null;
  now?: number;
}): Decision;

export function retakeDecision(input: {
  membership: {
    status: string;
    includesRetakes: boolean;
    endsAt?: string | Date | null;
  } | null;
  targetCohort: {
    status: string;
    capacity?: number | null;
    enrollmentOpensAt?: string | Date | null;
    enrollmentClosesAt?: string | Date | null;
  } | null;
  activeSeats?: number;
  now?: number;
}): Decision;
