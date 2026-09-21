import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

const schema = z.object({ decision: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN", "/admin");
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const db = getDb();
  const profile = await db.$transaction(async (tx) => {
    const updated = await tx.instructorProfile.update({
      where: { id },
      data: {
        status: parsed.data.decision,
        verifiedAt: parsed.data.decision === "APPROVED" ? new Date() : null
      }
    });
    if (parsed.data.decision === "APPROVED") {
      await tx.user.update({ where: { id: updated.userId }, data: { role: "INSTRUCTOR" } });
    }
    return updated;
  });
  return Response.json({ profile });
}
