import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { canIssueCertificate } from "@/domain/learning.mjs";

const schema = z.object({ courseId: z.string().min(1) });

export async function POST(request: Request) {
  const actor = await requireRole("STUDENT", "/library");
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const db = getDb();
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: actor.sub, courseId: parsed.data.courseId } },
    include: {
      entitlement: true,
      certificate: true,
      progress: true,
      course: { include: { sections: { include: { lessons: { select: { id: true } } } } } }
    }
  });
  if (!enrollment?.entitlement) return Response.json({ error: "Active enrollment required" }, { status: 403 });
  if (enrollment.certificate && !enrollment.certificate.revokedAt) {
    return Response.json({ certificate: enrollment.certificate });
  }

  const lessonIds = new Set(enrollment.course.sections.flatMap((section) => section.lessons.map((lesson) => lesson.id)));
  const completedLessons = enrollment.progress.filter((item) => item.completedAt && lessonIds.has(item.lessonId)).length;
  const totalLessons = lessonIds.size;
  if (!canIssueCertificate({ entitlement: enrollment.entitlement, totalLessons, completedLessons })) {
    return Response.json({ error: "Certificate requires active entitlement and 100% course completion" }, { status: 403 });
  }

  const verificationCode = randomBytes(16).toString("hex");
  const certificate = await db.$transaction(async (tx) => {
    await tx.enrollment.update({ where: { id: enrollment.id }, data: { completedAt: enrollment.completedAt ?? new Date() } });
    return tx.certificate.upsert({
      where: { enrollmentId: enrollment.id },
      update: { revokedAt: null, verificationCode },
      create: {
        enrollmentId: enrollment.id,
        userId: actor.sub,
        courseId: parsed.data.courseId,
        verificationCode
      }
    });
  });
  return Response.json({ certificate }, { status: 201 });
}
