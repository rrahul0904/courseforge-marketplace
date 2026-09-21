import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

const schema = z.object({
  slug: z.string().min(3).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  headline: z.string().min(10).max(160),
  bio: z.string().min(50).max(4000),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  expertise: z.array(z.string().min(2).max(50)).min(1).max(12),
  applicationNote: z.string().max(2000).optional()
});

export async function POST(request: Request) {
  const actor = await requireRole("STUDENT", "/instructor/apply");
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const db = getDb();
  const profile = await db.$transaction(async (tx) => {
    await tx.user.upsert({
      where: { id: actor.sub },
      update: { email: actor.email, name: actor.name },
      create: { id: actor.sub, email: actor.email, name: actor.name, role: "STUDENT" }
    });
    return tx.instructorProfile.upsert({
      where: { userId: actor.sub },
      update: {
        ...parsed.data,
        websiteUrl: parsed.data.websiteUrl || null,
        status: "APPLIED"
      },
      create: {
        userId: actor.sub,
        ...parsed.data,
        websiteUrl: parsed.data.websiteUrl || null,
        status: "APPLIED"
      }
    });
  });
  return Response.json({ profile }, { status: 201 });
}
