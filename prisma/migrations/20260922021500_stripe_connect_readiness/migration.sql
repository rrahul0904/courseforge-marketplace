ALTER TABLE "InstructorProfile"
  ADD COLUMN "payoutChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "payoutDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "payoutStatusUpdatedAt" TIMESTAMP(3);
