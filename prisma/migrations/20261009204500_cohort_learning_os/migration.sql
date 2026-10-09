-- RE-392 CourseForge cohort learning persistence.
-- Additive migration: existing Enrollment remains one per user/course; retakes attach through CohortSeat.
CREATE TYPE "CohortStatus" AS ENUM ('DRAFT','OPEN','CLOSED','IN_PROGRESS','COMPLETED','CANCELLED');
CREATE TYPE "CohortSeatStatus" AS ENUM ('RESERVED','ACTIVE','COMPLETED','CANCELLED');
CREATE TYPE "CohortEventType" AS ENUM ('LIVE_SESSION','BUILD_LAB','OFFICE_HOUR','WORKSHOP','CAPSTONE_REVIEW','NETWORKING');
CREATE TYPE "CapstoneStatus" AS ENUM ('DRAFT','SUBMITTED','IN_REVIEW','CHANGES_REQUESTED','APPROVED');
CREATE TYPE "CapstoneReviewDecision" AS ENUM ('CHANGES_REQUESTED','APPROVED');

ALTER TABLE "Course" ADD COLUMN "requiresCapstone" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "Cohort" (
  "id" TEXT PRIMARY KEY,
  "courseId" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "status" "CohortStatus" NOT NULL DEFAULT 'DRAFT',
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "enrollmentOpensAt" TIMESTAMP(3),
  "enrollmentClosesAt" TIMESTAMP(3),
  "capacity" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Cohort_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE
);
CREATE INDEX "Cohort_courseId_status_startsAt_idx" ON "Cohort"("courseId","status","startsAt");

CREATE TABLE "CohortSeat" (
  "id" TEXT PRIMARY KEY,
  "enrollmentId" TEXT NOT NULL,
  "cohortId" TEXT NOT NULL,
  "status" "CohortSeatStatus" NOT NULL DEFAULT 'RESERVED',
  "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activatedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  CONSTRAINT "CohortSeat_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE,
  CONSTRAINT "CohortSeat_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE,
  UNIQUE("enrollmentId","cohortId")
);
CREATE INDEX "CohortSeat_cohortId_status_idx" ON "CohortSeat"("cohortId","status");

CREATE TABLE "CohortEvent" (
  "id" TEXT PRIMARY KEY,
  "cohortId" TEXT NOT NULL,
  "type" "CohortEventType" NOT NULL,
  "title" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "joinUrl" TEXT,
  "recordingUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CohortEvent_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE
);
CREATE INDEX "CohortEvent_cohortId_startsAt_idx" ON "CohortEvent"("cohortId","startsAt");

CREATE TABLE "CapstoneSubmission" (
  "id" TEXT PRIMARY KEY,
  "enrollmentId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "status" "CapstoneStatus" NOT NULL DEFAULT 'DRAFT',
  "artifactUrl" TEXT,
  "summary" TEXT,
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CapstoneSubmission_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE,
  UNIQUE("enrollmentId","revision")
);
CREATE INDEX "CapstoneSubmission_enrollmentId_status_idx" ON "CapstoneSubmission"("enrollmentId","status");

CREATE TABLE "CapstoneReview" (
  "id" TEXT PRIMARY KEY,
  "submissionId" TEXT NOT NULL UNIQUE,
  "reviewerId" TEXT NOT NULL,
  "decision" "CapstoneReviewDecision" NOT NULL,
  "feedback" TEXT,
  "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CapstoneReview_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CapstoneSubmission"("id") ON DELETE CASCADE,
  CONSTRAINT "CapstoneReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "InstructorProfile"("id")
);
