const CLAIM_STATUSES = new Set([
  "INDEPENDENTLY_VERIFIED",
  "ATTRIBUTED_PUBLIC_CLAIM",
  "EDITORIAL_SYNTHESIS",
  "UNVERIFIED",
  "REJECTED"
]);

function asFiniteInteger(value, name, min, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

export function isQuestionClaimStatus(value) {
  return typeof value === "string" && CLAIM_STATUSES.has(value);
}

export function assertQuestionClaimStatus(value) {
  if (!isQuestionClaimStatus(value)) throw new Error("Unsupported question evidence claimStatus");
  return value;
}

export function toPreviewQuestion(question) {
  if (!question || question.previewable !== true || !question.previewPrompt) return null;
  return {
    id: question.id,
    slug: question.slug,
    title: question.title,
    previewPrompt: question.previewPrompt,
    difficulty: question.difficulty,
    expectedMinutes: question.expectedMinutes ?? null,
    tags: Array.isArray(question.tags) ? [...question.tags] : [],
    roleTags: Array.isArray(question.roleTags) ? [...question.roleTags] : []
  };
}

export function scoreInterviewAttempt({ rubricItems, selectedRubricItemIds, selfScore }) {
  if (!Array.isArray(rubricItems)) throw new Error("rubricItems must be an array");
  if (!Array.isArray(selectedRubricItemIds)) throw new Error("selectedRubricItemIds must be an array");

  const seen = new Set();
  let totalPoints = 0;
  const pointsById = new Map();

  for (const item of rubricItems) {
    if (!item || typeof item.id !== "string" || item.id.length === 0) throw new Error("rubric item id is required");
    if (seen.has(item.id)) throw new Error("rubric item ids must be unique");
    seen.add(item.id);
    const points = asFiniteInteger(item.points, `rubric points for ${item.id}`, 0, 1000);
    pointsById.set(item.id, points);
    totalPoints += points;
  }

  const selected = new Set();
  let earnedPoints = 0;
  for (const id of selectedRubricItemIds) {
    if (typeof id !== "string" || !pointsById.has(id)) throw new Error("selected rubric item is not part of the question rubric");
    if (selected.has(id)) throw new Error("selected rubric item ids must be unique");
    selected.add(id);
    earnedPoints += pointsById.get(id);
  }

  const normalizedSelfScore = selfScore == null ? null : asFiniteInteger(selfScore, "selfScore", 0, 100);
  const deterministicScore = totalPoints === 0 ? 0 : Math.round((earnedPoints / totalPoints) * 100);

  return {
    selfScore: normalizedSelfScore,
    deterministicScore,
    earnedPoints,
    totalPoints
  };
}
