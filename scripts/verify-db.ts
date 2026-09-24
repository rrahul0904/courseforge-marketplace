import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { isEntitlementActive } from "../domain/learning.mjs";
import {
  assertQuestionClaimStatus,
  scoreInterviewAttempt,
  toPreviewQuestion
} from "../domain/interview-learning.mjs";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not configured");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const course = await db.course.findUnique({
  where: { slug: "database-certification-course" },
  include: {
    instructor: true,
    track: true,
    products: { include: { prices: true } },
    modules: {
      include: {
        questions: {
          include: { evidence: true }
        }
      }
    }
  }
});

if (!course || course.status !== "PUBLISHED") throw new Error("seeded published course missing");
if (course.instructor.status !== "APPROVED") throw new Error("seeded instructor not approved");
if (course.track?.slug !== "ai-engineering-interview-foundations") throw new Error("seeded interview track missing");

const price = course.products[0]?.prices[0];
if (!price || price.amountCents !== 9900) throw new Error("seeded price missing");
if (price.providerPriceId !== null || course.instructor.payoutAccountId !== null) {
  throw new Error("seed must not fake Stripe readiness");
}

const question = course.modules[0]?.questions[0];
if (!question || question.slug !== "reliable-retrieval-pipeline") throw new Error("seeded interview question missing");
if (question.contentVersionId !== "seed_question_v1") throw new Error("seeded question content version missing");

const preview = toPreviewQuestion(question);
if (!preview || preview.previewPrompt.length === 0) throw new Error("preview-safe question projection missing");
if ("prompt" in preview || "answerFramework" in preview || "explanation" in preview) {
  throw new Error("preview projection leaked paid content");
}

const evidence = question.evidence[0];
if (!evidence || assertQuestionClaimStatus(evidence.claimStatus) !== "EDITORIAL_SYNTHESIS") {
  throw new Error("clean-room provenance evidence missing");
}
if (question.companyClaimTags.length !== 0) throw new Error("seed question must not invent company attribution");

const enrollment = await db.enrollment.findUnique({
  where: {
    userId_courseId: {
      userId: "seed_student",
      courseId: course.id
    }
  },
  include: { entitlement: true }
});
if (!enrollment?.entitlement || !isEntitlementActive(enrollment.entitlement)) {
  throw new Error("seeded active entitlement missing");
}
if (enrollment.entitlement.orderId !== "seed_order") throw new Error("seeded entitlement is not tied to deterministic order fixture");

const rubricItems = Array.isArray(question.rubricJson)
  ? question.rubricJson.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const value = item as Record<string, unknown>;
      return typeof value.id === "string" && typeof value.points === "number"
        ? [{ id: value.id, points: value.points }]
        : [];
    })
  : [];

const score = scoreInterviewAttempt({
  rubricItems,
  selectedRubricItemIds: ["freshness", "rollback"],
  selfScore: 80
});
if (score.deterministicScore !== 50 || score.selfScore !== 80) {
  throw new Error("deterministic interview scoring invariant failed");
}

const attempt = await db.questionAttempt.upsert({
  where: { id: "verify_interview_attempt" },
  update: {
    contentVersionId: question.contentVersionId,
    responseText: "Repository certification response.",
    selectedRubricIds: ["freshness", "rollback"],
    selfScore: score.selfScore,
    deterministicScore: score.deterministicScore,
    durationMs: 60000,
    revealedAnswerAt: new Date("2026-09-24T00:05:00Z"),
    completedAt: new Date("2026-09-24T00:05:00Z")
  },
  create: {
    id: "verify_interview_attempt",
    learnerId: "seed_student",
    questionId: question.id,
    contentVersionId: question.contentVersionId,
    mode: "TOPIC_DRILL",
    responseText: "Repository certification response.",
    selectedRubricIds: ["freshness", "rollback"],
    selfScore: score.selfScore,
    deterministicScore: score.deterministicScore,
    durationMs: 60000,
    revealedAnswerAt: new Date("2026-09-24T00:05:00Z"),
    completedAt: new Date("2026-09-24T00:05:00Z")
  }
});
if (attempt.contentVersionId !== question.contentVersionId) throw new Error("attempt did not retain contentVersionId");

await db.bookmark.upsert({
  where: {
    userId_questionId: {
      userId: "seed_student",
      questionId: question.id
    }
  },
  update: {},
  create: {
    id: "verify_interview_bookmark",
    userId: "seed_student",
    questionId: question.id
  }
});

await db.learnerNote.upsert({
  where: {
    userId_questionId: {
      userId: "seed_student",
      questionId: question.id
    }
  },
  update: { body: "Repository certification note." },
  create: {
    id: "verify_interview_note",
    userId: "seed_student",
    questionId: question.id,
    body: "Repository certification note."
  }
});

const [studentBookmarks, instructorBookmarks, studentNotes, instructorNotes] = await Promise.all([
  db.bookmark.count({ where: { userId: "seed_student", questionId: question.id } }),
  db.bookmark.count({ where: { userId: "seed_instructor", questionId: question.id } }),
  db.learnerNote.count({ where: { userId: "seed_student", questionId: question.id } }),
  db.learnerNote.count({ where: { userId: "seed_instructor", questionId: question.id } })
]);
if (studentBookmarks !== 1 || studentNotes !== 1 || instructorBookmarks !== 0 || instructorNotes !== 0) {
  throw new Error("bookmark/note user scoping invariant failed");
}

console.log("DB certification verified: marketplace migration graph + clean-room interview Phase A + fail-closed provider state.");
await db.$disconnect();
