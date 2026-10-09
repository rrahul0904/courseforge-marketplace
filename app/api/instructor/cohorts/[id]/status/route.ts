import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

const schema = z.object({ status: z.enum(["OPEN", "CLOSED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]) });
const transitions: Record<string, Set<string>> = {
  DRAFT: new Set(["OPEN", "CANCELLED"]),
  OPEN: new Set(["CLOSED", "IN_PROGRESS", "CANCELLED"]),
  CLOSED: new Set(["OPEN", "IN_PROGRESS", "CANCELLED"]),
  IN_PROGRESS: new Set(["COMPLETED", "CANCELLED"]),
  COMPLETED: new Set(),
  CANCELLED: new Set()
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("INSTRUCTOR", "/instructor/studio");
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const db = getDb();
  const profile = await db.instructorProfile.findUnique({ where: { userId: actor.sub } });
  const cohort = profile ? await db.cohort.findFirst({
    where: { id, course: { instructorId: profile.id } },
    include: { events: { select: { id: true } } }
  }) : null;
  if (!cohort) return Response.json({ error: "Cohort not found" }, { status: 404 });
  if (!transitions[cohort.status]?.has(parsed.data.status)) {
    return Response.json({ error: `Invalid cohort transition ${cohort.status} -> ${parsed.data.status}` }, { status: 409 });
  }
  if (parsed.data.status === "OPEN" && cohort.events.length === 0) {
    return Response.json({ error: "Add at least one cohort event before opening enrollment" }, { status: 409 });
  }

  const updated = await db.cohort.update({ where: { id: cohort.id }, data: { status: parsed.data.status } });
  return Response.json({ cohort: updated });
}
