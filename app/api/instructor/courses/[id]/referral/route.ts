import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { issueReferralToken } from "@/domain/referral.mjs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("INSTRUCTOR", "/instructor/studio");
  const { id } = await params;
  const secret = process.env.COURSEFORGE_REFERRAL_SECRET;
  if (!secret || secret.length < 32) {
    return Response.json({ error: "Referral signing is not configured" }, { status: 503 });
  }

  const db = getDb();
  const profile = await db.instructorProfile.findUnique({ where: { userId: actor.sub } });
  const course = profile ? await db.course.findFirst({
    where: { id, instructorId: profile.id, status: "PUBLISHED" }
  }) : null;
  if (!course || !profile) return Response.json({ error: "Published course not found" }, { status: 404 });

  const token = issueReferralToken(
    { instructorId: profile.id, courseId: course.id },
    secret
  );
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  return Response.json({
    referralToken: token,
    referralUrl: `${appUrl}/courses/${course.slug}?ref=${encodeURIComponent(token)}`
  });
}
