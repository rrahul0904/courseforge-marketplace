import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { assessCourseSubmission } from "@/domain/publishing.mjs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("INSTRUCTOR", "/instructor/studio");
  const { id } = await params;
  const db = getDb();
  const profile = await db.instructorProfile.findUnique({ where: { userId: actor.sub } });
  const course = profile ? await db.course.findFirst({
    where: { id, instructorId: profile.id },
    include: {
      sections: { include: { lessons: true } },
      products: { include: { prices: true } }
    }
  }) : null;

  if (!course) return Response.json({ error: "Course not found" }, { status: 404 });
  if (course.status !== "DRAFT") {
    return Response.json({ error: "Only draft courses can enter review" }, { status: 409 });
  }

  const readiness = assessCourseSubmission({
    title: course.title,
    description: course.description,
    sectionCount: course.sections.length,
    lessonCount: course.sections.reduce((sum, section) => sum + section.lessons.length, 0),
    activePriceCount: course.products.reduce(
      (sum, product) => sum + product.prices.filter((price) => price.active).length,
      0
    )
  });
  if (!readiness.ready) {
    return Response.json({ error: "Course is not ready for review", gaps: readiness.gaps }, { status: 409 });
  }

  const updated = await db.course.update({ where: { id }, data: { status: "IN_REVIEW" } });
  return Response.json({ course: updated, readiness });
}
