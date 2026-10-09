import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

const schema = z.object({
  type: z.enum(["LIVE_SESSION", "BUILD_LAB", "OFFICE_HOUR", "WORKSHOP", "CAPSTONE_REVIEW", "NETWORKING"]),
  title: z.string().trim().min(2).max(160),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  joinUrl: z.string().url().max(2048).optional(),
  recordingUrl: z.string().url().max(2048).optional()
}).superRefine((value, ctx) => {
  if (Date.parse(value.endsAt) <= Date.parse(value.startsAt)) {
    ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Event end must be after start" });
  }
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("INSTRUCTOR", "/instructor/studio");
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const db = getDb();
  const profile = await db.instructorProfile.findUnique({ where: { userId: actor.sub } });
  const cohort = profile ? await db.cohort.findFirst({
    where: { id, course: { instructorId: profile.id } }
  }) : null;
  if (!cohort) return Response.json({ error: "Cohort not found" }, { status: 404 });

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);
  if (startsAt < cohort.startsAt || endsAt > cohort.endsAt) {
    return Response.json({ error: "Cohort events must fall within the cohort date range" }, { status: 409 });
  }

  const event = await db.cohortEvent.create({
    data: {
      cohortId: cohort.id,
      type: parsed.data.type,
      title: parsed.data.title,
      startsAt,
      endsAt,
      joinUrl: parsed.data.joinUrl ?? null,
      recordingUrl: parsed.data.recordingUrl ?? null
    }
  });
  return Response.json({ event }, { status: 201 });
}
