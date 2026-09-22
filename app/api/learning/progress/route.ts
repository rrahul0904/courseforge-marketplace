import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

const schema = z.object({
  enrollmentId: z.string().min(1),
  lessonId: z.string().min(1),
  playbackSeconds: z.number().int().min(0).max(60 * 60 * 24).default(0),
  completed: z.boolean().default(false)
});

export async function POST(request: Request) {
  const actor = await requireRole("STUDENT", "/library");
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const db = getDb();
  const enrollment = await db.enrollment.findUnique({
    where: { id: parsed.data.enrollmentId },
    include: { entitlement: true }
  });
  const entitlement = enrollment?.entitlement;
  const expired = entitlement?.expiresAt ? entitlement.expiresAt.getTime() <= Date.now() : false;
  if (
    !enrollment ||
    enrollment.userId !== actor.sub ||
    !entitlement ||
    entitlement.status !== "ACTIVE" ||
    entitlement.revokedAt ||
    expired
  ) {
    return Response.json({ error: "Active enrollment required" }, { status: 403 });
  }

  const lesson = await db.lesson.findFirst({
    where: { id: parsed.data.lessonId, section: { courseId: enrollment.courseId } }
  });
  if (!lesson) return Response.json({ error: "Lesson is not part of this enrollment" }, { status: 403 });

  const progress = await db.lessonProgress.upsert({
    where: {
      enrollmentId_lessonId: {
        enrollmentId: enrollment.id,
        lessonId: lesson.id
      }
    },
    update: {
      playbackSeconds: parsed.data.playbackSeconds,
      completedAt: parsed.data.completed ? new Date() : null
    },
    create: {
      enrollmentId: enrollment.id,
      lessonId: lesson.id,
      playbackSeconds: parsed.data.playbackSeconds,
      completedAt: parsed.data.completed ? new Date() : null
    }
  });
  return Response.json({ progress });
}
