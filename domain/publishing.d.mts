export type Readiness = { ready: boolean; gaps: string[] };
export function assessCourseSubmission(input: {
  title?: string | null;
  description?: string | null;
  sectionCount?: number;
  lessonCount?: number;
  activePriceCount?: number;
}): Readiness;
export function assessPublishDecision(input: {
  status?: string | null;
  instructorApproved?: boolean;
  payoutReady?: boolean;
  checkoutPriceCount?: number;
}): Readiness;
