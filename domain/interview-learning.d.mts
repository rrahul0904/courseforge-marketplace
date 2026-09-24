export type PreviewQuestionInput = {
  id: string;
  slug: string;
  title: string;
  previewable: boolean;
  previewPrompt?: string | null;
  difficulty: string;
  expectedMinutes?: number | null;
  tags?: string[];
  roleTags?: string[];
};

export type PreviewQuestion = {
  id: string;
  slug: string;
  title: string;
  previewPrompt: string;
  difficulty: string;
  expectedMinutes: number | null;
  tags: string[];
  roleTags: string[];
};

export type RubricItem = { id: string; points: number; label?: string };

export function isQuestionClaimStatus(value: unknown): value is string;
export function assertQuestionClaimStatus(value: unknown): string;
export function toPreviewQuestion(question: PreviewQuestionInput | null | undefined): PreviewQuestion | null;
export function scoreInterviewAttempt(input: {
  rubricItems: RubricItem[];
  selectedRubricItemIds: string[];
  selfScore?: number | null;
}): {
  selfScore: number | null;
  deterministicScore: number;
  earnedPoints: number;
  totalPoints: number;
};
