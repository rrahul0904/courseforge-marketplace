import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

const schema = z.object({
  sectionId: z.string().min(1),
  title: z.string().min(2).max(180),
  type: z.enum(["VIDEO", "TEXT", "PDF", "QUIZ", "ASSIGNMENT", "LIVE"]),
  isPreview: z.boolean().default(false),
  durationSeconds: z.number().int().min(0).max(60 * 60 * 12).optional(),
  contentText: z.string().max(50000).optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("INSTRUCTOR", "/instructor/studio");
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const db = getDb();
  const profile = await db.instructorProfile.findUnique({ where: { userId: actor.sub } });
  const course = profile ? await db.course.findFirst({ where: { id, instructorId: profile.id } }) : null;
  if (!course) return Response.json({ error: "Course not found" }, { status: 404 });
  if (course.status !== "DRAFT") {
    return Response.json({ error: "Only draft courses can be authored" }, { status: 409 });
  }

  const section = await db.section.findFirst({
    where: { id: parsed.data.sectionId, courseId: course.id },
    include: { lessons: { orderBy: { position: "desc" }, take: 1 } }
  });
  if (!section) return Response.json({ error: "Section not found" }, { status: 404 });

  const position = (section.lessons[0]?.position ?? 0) + 1;
  const lesson = await db.lesson.create({
    data: {
      sectionId: section.id,
      title: parsed.data.title,
      type: parsed.data.type,
      position,
      isPreview: parsed.data.isPreview,
      durationSeconds: parsed.data.durationSeconds,
      contentJson: parsed.data.contentText ? { text: parsed.data.contentText } : undefined
    }
  });
  return Response.json({ lesson }, { status: 201 });
}
