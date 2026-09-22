export function assessCourseSubmission(input) {
  const gaps = [];
  if (!input?.title || input.title.trim().length < 5) gaps.push("title");
  if (!input?.description || input.description.trim().length < 80) gaps.push("description");
  if (!Number.isInteger(input?.sectionCount) || input.sectionCount < 1) gaps.push("section");
  if (!Number.isInteger(input?.lessonCount) || input.lessonCount < 1) gaps.push("lesson");
  if (!Number.isInteger(input?.activePriceCount) || input.activePriceCount < 1) gaps.push("active_price");
  return { ready: gaps.length === 0, gaps };
}

export function assessPublishDecision(input) {
  const gaps = [];
  if (input?.status !== "IN_REVIEW") gaps.push("not_in_review");
  if (!input?.instructorApproved) gaps.push("instructor_not_approved");
  if (!input?.payoutReady) gaps.push("payout_not_ready");
  if (!Number.isInteger(input?.checkoutPriceCount) || input.checkoutPriceCount < 1) gaps.push("checkout_price_missing");
  return { ready: gaps.length === 0, gaps };
}
