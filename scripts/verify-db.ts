import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not configured");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const course = await db.course.findUnique({
  where: { slug: "database-certification-course" },
  include: {
    instructor: true,
    products: { include: { prices: true } },
    cohorts: { include: { seats: true, events: true }, orderBy: { startsAt: "asc" } }
  }
});
if (!course || course.status !== "PUBLISHED") throw new Error("seeded published course missing");
if (!course.requiresCapstone) throw new Error("seeded course must exercise capstone persistence");
if (course.instructor.status !== "APPROVED") throw new Error("seeded instructor not approved");
const price = course.products[0]?.prices[0];
if (!price || price.amountCents !== 9900) throw new Error("seeded price missing");
if (price.providerPriceId !== null || course.instructor.payoutAccountId !== null) throw new Error("seed must not fake Stripe readiness");

const enrollment = await db.enrollment.findUnique({
  where: { id: "seed_enrollment" },
  include: {
    cohortSeats: { include: { cohort: true }, orderBy: { reservedAt: "asc" } },
    capstoneSubmissions: { include: { review: true }, orderBy: { revision: "asc" } }
  }
});
if (!enrollment) throw new Error("seeded enrollment missing");
if (enrollment.cohortSeats.length !== 2) throw new Error("one enrollment must retain original cohort and retake seat");
if (new Set(enrollment.cohortSeats.map((seat) => seat.enrollmentId)).size !== 1) throw new Error("retake must reuse the original enrollment");
if (enrollment.cohortSeats[0]?.status !== "COMPLETED" || enrollment.cohortSeats[1]?.status !== "RESERVED") throw new Error("cohort seat history is not preserved");
if (enrollment.capstoneSubmissions.length !== 2) throw new Error("capstone revision history missing");
if (enrollment.capstoneSubmissions[0]?.status !== "CHANGES_REQUESTED") throw new Error("first capstone review history missing");
const latest = enrollment.capstoneSubmissions[1];
if (latest?.status !== "APPROVED" || latest.review?.decision !== "APPROVED") throw new Error("latest capstone approval missing");
if (latest.review?.submissionId !== latest.id) throw new Error("capstone review must bind exact submission revision");

const liveEvent = course.cohorts.flatMap((cohort) => cohort.events).find((event) => event.id === "seed_event_live");
if (!liveEvent || liveEvent.recordingUrl !== null) throw new Error("missing-recording state must remain representable");

console.log("DB certification verified: marketplace invariants + one-enrollment retake history + versioned capstone review persistence.");
await db.$disconnect();
