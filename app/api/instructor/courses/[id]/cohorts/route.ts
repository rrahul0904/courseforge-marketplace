import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().min(3).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  enrollmentOpensAt: z.string().datetime().optional(),
  enrollmentClosesAt: z.string().datetime().optional(),
  capacity: z.number().int().min(1).max(10000).optional()
}).superRefine((value, ctx) => {
  const startsAt = Date.parse(value.startsAt);
  const endsAt = Date.parse(value.endsAt);
  if (endsAt <= startsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Cohort end must be after start" });
  if (value.enrollmentOpensAt && value.enrollmentClosesAt && Date.parse(value.enrollmentClosesAt) <= Date.parse(value.enrollmentOpensAt)) {
    ctx.addIssue({ code: "custom", path: ["enrollmentClosesAt"], message: "Enrollment close must be after open" });
  }
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

  try {
    const cohort = await db.cohort.create({
      data: {
        courseId: course.id,
        name: parsed.data.name,
        slug: parsed.data.slug,
        status: "DRAFT",
        startsAt: new Date(parsed.data.startsAt),
        endsAt: new Date(parsed.data.endsAt),
        enrollmentOpensAt: parsed.data.enrollmentOpensAt ? new Date(parsed.data.enrollmentOpensAt) : null,
        enrollmentClosesAt: parsed.data.enrollmentClosesAt ? new Date(parsed.data.enrollmentClosesAt) : null,
        capacity: parsed.data.capacity ?? null
      }
    });
    return Response.json({ cohort }, { status: 201 });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "P2002") return Response.json({ error: "Cohort slug already exists" }, { status: 409 });
    throw error;
  }
}
