import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

const patchSchema = z.object({
  title: z.string().min(5).max(140).optional(),
  subtitle: z.string().max(220).nullable().optional(),
  description: z.string().min(20).max(12000).optional(),
  category: z.string().min(2).max(80).optional(),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]).optional()
}).refine((value) => Object.keys(value).length > 0, "At least one field is required");

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("INSTRUCTOR", "/instructor/studio");
  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const db = getDb();
  const profile = await db.instructorProfile.findUnique({ where: { userId: actor.sub } });
  const course = profile ? await db.course.findFirst({ where: { id, instructorId: profile.id } }) : null;
  if (!course) return Response.json({ error: "Course not found" }, { status: 404 });
  if (!["DRAFT", "SUSPENDED"].includes(course.status)) {
    return Response.json({ error: "Course metadata is locked while under review or published" }, { status: 409 });
  }
  const updated = await db.course.update({ where: { id }, data: parsed.data });
  return Response.json({ course: updated });
}
