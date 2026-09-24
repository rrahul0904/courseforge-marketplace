ALTER TABLE "Course" ADD COLUMN "trackId" TEXT;

CREATE TABLE "Track" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Module" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InterviewQuestion" (
  "id" TEXT NOT NULL,
  "moduleId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "previewPrompt" TEXT,
  "questionType" TEXT NOT NULL DEFAULT 'interview',
  "difficulty" TEXT NOT NULL,
  "expectedMinutes" INTEGER,
  "answerFramework" TEXT NOT NULL,
  "explanation" TEXT,
  "rubricJson" JSONB NOT NULL,
  "followUpPrompts" TEXT[],
  "tags" TEXT[],
  "roleTags" TEXT[],
  "companyClaimTags" TEXT[],
  "contentVersionId" TEXT NOT NULL,
  "previewable" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3),
  "retiredAt" TIMESTAMP(3),
  CONSTRAINT "InterviewQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionEvidence" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "evidenceType" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "sourceLabel" TEXT,
  "observedAt" TIMESTAMP(3),
  "claimText" TEXT,
  "claimStatus" TEXT NOT NULL DEFAULT 'EDITORIAL_SYNTHESIS',
  "confidence" INTEGER,
  "reviewerId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionAttempt" (
  "id" TEXT NOT NULL,
  "learnerId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "contentVersionId" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'TOPIC_DRILL',
  "responseText" TEXT,
  "selectedRubricIds" TEXT[],
  "selfScore" INTEGER,
  "deterministicScore" INTEGER NOT NULL,
  "durationMs" INTEGER,
  "revealedAnswerAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Bookmark" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearnerNote" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearnerNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Track_slug_key" ON "Track"("slug");
CREATE INDEX "Course_trackId_idx" ON "Course"("trackId");
CREATE UNIQUE INDEX "Module_courseId_position_key" ON "Module"("courseId", "position");
CREATE UNIQUE INDEX "InterviewQuestion_moduleId_slug_key" ON "InterviewQuestion"("moduleId", "slug");
CREATE INDEX "InterviewQuestion_previewable_publishedAt_idx" ON "InterviewQuestion"("previewable", "publishedAt");
CREATE INDEX "QuestionEvidence_questionId_claimStatus_idx" ON "QuestionEvidence"("questionId", "claimStatus");
CREATE INDEX "QuestionAttempt_learnerId_questionId_createdAt_idx" ON "QuestionAttempt"("learnerId", "questionId", "createdAt");
CREATE UNIQUE INDEX "Bookmark_userId_questionId_key" ON "Bookmark"("userId", "questionId");
CREATE UNIQUE INDEX "LearnerNote_userId_questionId_key" ON "LearnerNote"("userId", "questionId");

ALTER TABLE "Course" ADD CONSTRAINT "Course_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Module" ADD CONSTRAINT "Module_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionEvidence" ADD CONSTRAINT "QuestionEvidence_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "InterviewQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "InterviewQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "InterviewQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearnerNote" ADD CONSTRAINT "LearnerNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearnerNote" ADD CONSTRAINT "LearnerNote_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "InterviewQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
