import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

const createSchema = z.object({
  title: z.string().min(5).max(140),
  slug: z.string().min(3).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  subtitle: z.string().max(220).optional(),
  description: z.string().min(20).max(12000),
  category: z.string().min(2).max(80),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]),
  amountCents: z.number().int().min(100).max(500000),
  currency: z.string().length(3).default("USD")
});

export async function GET() {
  const actor = await requireRole("INSTRUCTOR", "/instructor/studio");
  const profile = await getDb().instructorProfile.findUnique({ where: { userId: actor.sub } });
  if (!profile) return Response.json({ error: "Instructor profile required" }, { status: 404 });
  const courses = await getDb().course.findMany({
    where: { instructorId: profile.id },
    include: {
      sections: { include: { lessons: true } },
      products: { include: { prices: true } }
    },
    orderBy: { updatedAt: "desc" }
  });
  return Response.json({ courses });
}

export async function POST(request: Request) {
  const actor = await requireRole("INSTRUCTOR", "/instructor/studio");
  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const db = getDb();
  const profile = await db.instructorProfile.findUnique({ where: { userId: actor.sub } });
  if (!profile || profile.status !== "APPROVED") {
    return Response.json({ error: "Approved instructor profile required" }, { status: 403 });
  }

  const course = await db.course.create({
    data: {
      instructorId: profile.id,
      slug: parsed.data.slug,
      title: parsed.data.title,
      subtitle: parsed.data.subtitle,
      description: parsed.data.description,
      category: parsed.data.category,
      level: parsed.data.level,
      status: "DRAFT",
      products: {
        create: {
          name: parsed.data.title,
          active: true,
          prices: {
            create: {
              amountCents: parsed.data.amountCents,
              currency: parsed.data.currency.toUpperCase(),
              active: true
            }
          }
        }
      }
    },
    include: { products: { include: { prices: true } } }
  });
  return Response.json({ course }, { status: 201 });
}
