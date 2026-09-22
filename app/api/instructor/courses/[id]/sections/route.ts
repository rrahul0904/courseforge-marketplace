import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

const schema = z.object({ title: z.string().min(2).max(160) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("INSTRUCTOR", "/instructor/studio");
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const db = getDb();
  const profile = await db.instructorProfile.findUnique({ where: { userId: actor.sub } });
  const course = profile ? await db.course.findFirst({
    where: { id, instructorId: profile.id },
    include: { sections: { orderBy: { position: "desc" }, take: 1 } }
  }) : null;
  if (!course) return Response.json({ error: "Course not found" }, { status: 404 });
  if (course.status !== "DRAFT") return Response.json({ error: "Only draft courses can be authored" }, { status: 409 });
  const position = (course.sections[0]?.position ?? 0) + 1;
  const section = await db.section.create({ data: { courseId: course.id, title: parsed.data.title, position } });
  return Response.json({ section }, { status: 201 });
}
