import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { canSubmitVerifiedReview } from "@/domain/learning.mjs";

const schema = z.object({
  courseId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(4000).optional()
});

export async function POST(request: Request) {
  const actor = await requireRole("STUDENT", "/library");
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const db = getDb();
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: actor.sub, courseId: parsed.data.courseId } },
    include: {
      entitlement: true,
      progress: true,
      course: { include: { sections: { include: { lessons: { select: { id: true } } } } } }
    }
  });
  if (!enrollment?.entitlement) return Response.json({ error: "Verified enrollment required" }, { status: 403 });

  const lessonIds = new Set(enrollment.course.sections.flatMap((section) => section.lessons.map((lesson) => lesson.id)));
  const completedLessons = enrollment.progress.filter((item) => item.completedAt && lessonIds.has(item.lessonId)).length;
  const totalLessons = lessonIds.size;
  if (!canSubmitVerifiedReview({ entitlement: enrollment.entitlement, totalLessons, completedLessons })) {
    return Response.json({ error: "Active enrollment with at least 10% course progress required" }, { status: 403 });
  }

  const review = await db.review.upsert({
    where: { userId_courseId: { userId: actor.sub, courseId: parsed.data.courseId } },
    update: { rating: parsed.data.rating, body: parsed.data.body, verifiedEnrollment: true },
    create: {
      userId: actor.sub,
      courseId: parsed.data.courseId,
      rating: parsed.data.rating,
      body: parsed.data.body,
      verifiedEnrollment: true
    }
  });
  return Response.json({ review }, { status: 201 });
}
