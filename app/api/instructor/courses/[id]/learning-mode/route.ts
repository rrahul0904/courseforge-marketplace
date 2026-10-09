import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

const schema = z.object({ requiresCapstone: z.boolean() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("INSTRUCTOR", "/instructor/studio");
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const db = getDb();
  const profile = await db.instructorProfile.findUnique({ where: { userId: actor.sub } });
  const course = profile ? await db.course.findFirst({
    where: { id, instructorId: profile.id },
    include: { _count: { select: { enrollments: true } } }
  }) : null;
  if (!course) return Response.json({ error: "Course not found" }, { status: 404 });
  if (course.status !== "DRAFT" || course._count.enrollments > 0) {
    return Response.json({ error: "Capstone mode can only change on an unenrolled draft course" }, { status: 409 });
  }

  const updated = await db.course.update({
    where: { id: course.id },
    data: { requiresCapstone: parsed.data.requiresCapstone }
  });
  return Response.json({ course: updated });
}
