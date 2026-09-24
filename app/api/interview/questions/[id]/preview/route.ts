import { getDb } from "@/lib/db";
import { toPreviewQuestion } from "@/domain/interview-learning.mjs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const question = await getDb().interviewQuestion.findFirst({
    where: {
      id,
      previewable: true,
      publishedAt: { not: null },
      retiredAt: null
    },
    select: {
      id: true,
      slug: true,
      title: true,
      previewPrompt: true,
      previewable: true,
      difficulty: true,
      expectedMinutes: true,
      tags: true,
      roleTags: true
    }
  });

  const preview = toPreviewQuestion(question);
  if (!preview) return Response.json({ error: "Preview not found" }, { status: 404 });

  return Response.json({ question: preview });
}
