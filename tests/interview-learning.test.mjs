import test from "node:test";
import assert from "node:assert/strict";
import {
  assertQuestionClaimStatus,
  isQuestionClaimStatus,
  scoreInterviewAttempt,
  toPreviewQuestion
} from "../domain/interview-learning.mjs";
import { isEntitlementActive } from "../domain/learning.mjs";

test("guest preview exposes only preview-safe fields", () => {
  const preview = toPreviewQuestion({
    id: "q1",
    slug: "reliable-retrieval",
    title: "Reliable retrieval",
    previewable: true,
    previewPrompt: "What reliability concerns would you check?",
    difficulty: "INTERMEDIATE",
    expectedMinutes: 8,
    tags: ["retrieval"],
    roleTags: ["ai-engineer"],
    prompt: "paid prompt",
    answerFramework: "paid answer",
    explanation: "paid explanation",
    followUpPrompts: ["paid follow-up"],
    rubricJson: [{ id: "freshness", points: 25 }]
  });

  assert.deepEqual(Object.keys(preview).sort(), [
    "difficulty",
    "expectedMinutes",
    "id",
    "previewPrompt",
    "roleTags",
    "slug",
    "tags",
    "title"
  ]);
  assert.equal("prompt" in preview, false);
  assert.equal("answerFramework" in preview, false);
  assert.equal("explanation" in preview, false);
});

test("non-previewable or empty preview prompts fail closed", () => {
  assert.equal(toPreviewQuestion({
    id: "q1",
    slug: "private",
    title: "Private",
    previewable: false,
    previewPrompt: "should not leak",
    difficulty: "ADVANCED"
  }), null);
  assert.equal(toPreviewQuestion({
    id: "q2",
    slug: "missing-preview",
    title: "Missing",
    previewable: true,
    previewPrompt: null,
    difficulty: "ADVANCED"
  }), null);
});

test("question provenance statuses are explicit and fail closed", () => {
  assert.equal(isQuestionClaimStatus("EDITORIAL_SYNTHESIS"), true);
  assert.equal(isQuestionClaimStatus("ATTRIBUTED_PUBLIC_CLAIM"), true);
  assert.equal(isQuestionClaimStatus("VERIFIED_BY_MARKETING"), false);
  assert.equal(assertQuestionClaimStatus("INDEPENDENTLY_VERIFIED"), "INDEPENDENTLY_VERIFIED");
  assert.throws(() => assertQuestionClaimStatus("VERIFIED_BY_MARKETING"), /Unsupported/);
});

test("deterministic drill scoring is order independent and keeps self score separate", () => {
  const rubricItems = [
    { id: "freshness", points: 25 },
    { id: "quality", points: 25 },
    { id: "observability", points: 25 },
    { id: "rollback", points: 25 }
  ];
  const a = scoreInterviewAttempt({
    rubricItems,
    selectedRubricItemIds: ["freshness", "rollback"],
    selfScore: 80
  });
  const b = scoreInterviewAttempt({
    rubricItems,
    selectedRubricItemIds: ["rollback", "freshness"],
    selfScore: 80
  });

  assert.equal(a.deterministicScore, 50);
  assert.equal(a.selfScore, 80);
  assert.deepEqual(a, b);
});

test("deterministic scoring rejects unknown or duplicate rubric selections", () => {
  const rubricItems = [{ id: "quality", points: 100 }];
  assert.throws(() => scoreInterviewAttempt({
    rubricItems,
    selectedRubricItemIds: ["unknown"],
    selfScore: 50
  }), /not part/);
  assert.throws(() => scoreInterviewAttempt({
    rubricItems,
    selectedRubricItemIds: ["quality", "quality"],
    selfScore: 50
  }), /must be unique/);
});

test("interview entitlement gate treats revoked and expired access as inactive", () => {
  assert.equal(isEntitlementActive({ status: "ACTIVE", revokedAt: null, expiresAt: null }), true);
  assert.equal(isEntitlementActive({ status: "REVOKED", revokedAt: new Date().toISOString(), expiresAt: null }), false);
  assert.equal(isEntitlementActive({
    status: "ACTIVE",
    revokedAt: null,
    expiresAt: new Date(Date.now() - 1000).toISOString()
  }), false);
});
