import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { isEntitlementActive } from "@/domain/learning.mjs";
import { scoreInterviewAttempt } from "@/domain/interview-learning.mjs";

const attemptSchema = z.object({
  responseText: z.string().trim().min(1).max(12000).optional(),
  selectedRubricItemIds: z.array(z.string().min(1)).max(20).default([]),
  selfScore: z.number().int().min(0).max(100).nullable().optional(),
  durationMs: z.number().int().min(0).max(24 * 60 * 60 * 1000).optional(),
  revealAnswer: z.boolean().default(true),
  bookmark: z.boolean().default(false),
  note: z.string().trim().min(1).max(4000).optional()
});

type RubricItem = {
  id: string;
  label?: string;
  points: number;
};

function parseRubric(value: unknown): RubricItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const entry = item as Record<string, unknown>;
    if (typeof entry.id !== "string" || typeof entry.points !== "number") return [];
    return [{
      id: entry.id,
      label: typeof entry.label === "string" ? entry.label : undefined,
      points: entry.points
    }];
  });
}

async function loadEntitledQuestion(userId: string, questionId: string) {
  const db = getDb();
  const question = await db.interviewQuestion.findFirst({
    where: {
      id: questionId,
      publishedAt: { not: null },
      retiredAt: null
    },
    include: {
      module: {
        select: { courseId: true }
      }
    }
  });

  if (!question) return { db, question: null, enrollment: null };

  const enrollment = await db.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId: question.module.courseId
      }
    },
    include: { entitlement: true }
  });

  if (!enrollment?.entitlement || !isEntitlementActive(enrollment.entitlement)) {
    return { db, question, enrollment: null };
  }

  return { db, question, enrollment };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await requireRole("STUDENT", "/library");
  const { id } = await context.params;
  const { question, enrollment } = await loadEntitledQuestion(actor.sub, id);

  if (!question) return Response.json({ error: "Question not found" }, { status: 404 });
  if (!enrollment) return Response.json({ error: "Active entitlement required" }, { status: 403 });

  return Response.json({
    question: {
      id: question.id,
      slug: question.slug,
      title: question.title,
      prompt: question.prompt,
      questionType: question.questionType,
      difficulty: question.difficulty,
      expectedMinutes: question.expectedMinutes,
      tags: question.tags,
      roleTags: question.roleTags,
      contentVersionId: question.contentVersionId,
      rubric: parseRubric(question.rubricJson)
    }
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await requireRole("STUDENT", "/library");
  const parsed = attemptSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const { id } = await context.params;
  const { db, question, enrollment } = await loadEntitledQuestion(actor.sub, id);

  if (!question) return Response.json({ error: "Question not found" }, { status: 404 });
  if (!enrollment) return Response.json({ error: "Active entitlement required" }, { status: 403 });

  const rubricItems = parseRubric(question.rubricJson);
  let score;
  try {
    score = scoreInterviewAttempt({
      rubricItems,
      selectedRubricItemIds: parsed.data.selectedRubricItemIds,
      selfScore: parsed.data.selfScore
    });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Invalid scoring input"
    }, { status: 400 });
  }

  const now = new Date();
  const result = await db.$transaction(async (tx) => {
    const attempt = await tx.questionAttempt.create({
      data: {
        learnerId: actor.sub,
        questionId: question.id,
        contentVersionId: question.contentVersionId,
        mode: "TOPIC_DRILL",
        responseText: parsed.data.responseText,
        selectedRubricIds: parsed.data.selectedRubricItemIds,
        selfScore: score.selfScore,
        deterministicScore: score.deterministicScore,
        durationMs: parsed.data.durationMs,
        revealedAnswerAt: parsed.data.revealAnswer ? now : null,
        completedAt: now
      }
    });

    const bookmark = parsed.data.bookmark
      ? await tx.bookmark.upsert({
          where: {
            userId_questionId: {
              userId: actor.sub,
              questionId: question.id
            }
          },
          update: {},
          create: {
            userId: actor.sub,
            questionId: question.id
          }
        })
      : null;

    const note = parsed.data.note
      ? await tx.learnerNote.upsert({
          where: {
            userId_questionId: {
              userId: actor.sub,
              questionId: question.id
            }
          },
          update: { body: parsed.data.note },
          create: {
            userId: actor.sub,
            questionId: question.id,
            body: parsed.data.note
          }
        })
      : null;

    return { attempt, bookmark, note };
  });

  return Response.json({
    attempt: result.attempt,
    bookmark: result.bookmark,
    note: result.note,
    score,
    answer: parsed.data.revealAnswer
      ? {
          answerFramework: question.answerFramework,
          explanation: question.explanation,
          followUpPrompts: question.followUpPrompts
        }
      : null
  }, { status: 201 });
}
