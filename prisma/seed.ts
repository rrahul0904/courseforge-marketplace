import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not configured");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const instructor = await db.user.upsert({
  where: { email: "instructor@courseforge.local" },
  update: { name: "CourseForge Instructor", role: "INSTRUCTOR" },
  create: { id: "seed_instructor", email: "instructor@courseforge.local", name: "CourseForge Instructor", role: "INSTRUCTOR" }
});
const profile = await db.instructorProfile.upsert({
  where: { userId: instructor.id },
  update: { status: "APPROVED", verifiedAt: new Date("2026-09-21T00:00:00Z") },
  create: { id: "seed_profile", userId: instructor.id, slug: "courseforge-instructor", headline: "Seed instructor", bio: "Deterministic seed profile for database certification.", expertise: ["marketplace"], status: "APPROVED", verifiedAt: new Date("2026-09-21T00:00:00Z") }
});
const course = await db.course.upsert({
  where: { slug: "database-certification-course" },
  update: { status: "PUBLISHED", requiresCapstone: true },
  create: { id: "seed_course", instructorId: profile.id, slug: "database-certification-course", title: "Database Certification Course", description: "Seeded course used to certify migration and persistence.", category: "Engineering", level: "Intermediate", status: "PUBLISHED", requiresCapstone: true, publishedAt: new Date("2026-09-21T00:00:00Z") }
});
const product = await db.product.upsert({
  where: { id: "seed_product" }, update: { active: true },
  create: { id: "seed_product", courseId: course.id, name: "Database Certification Course", active: true }
});
await db.price.upsert({
  where: { id: "seed_price" }, update: { amountCents: 9900, active: true },
  create: { id: "seed_price", productId: product.id, amountCents: 9900, currency: "USD", active: true }
});
const student = await db.user.upsert({
  where: { email: "student@courseforge.local" },
  update: { name: "CourseForge Student", role: "STUDENT" },
  create: { id: "seed_student", email: "student@courseforge.local", name: "CourseForge Student", role: "STUDENT" }
});
const order = await db.order.upsert({
  where: { id: "seed_order" },
  update: { status: "PAID", paidAt: new Date("2026-09-21T12:00:00Z") },
  create: {
    id: "seed_order",
    userId: student.id,
    status: "PAID",
    currency: "USD",
    grossCents: 9900,
    netCents: 9900,
    platformFeeCents: 1485,
    instructorNetCents: 8415,
    paymentProvider: "seed-certification",
    providerPaymentId: "seed_payment_verified",
    paidAt: new Date("2026-09-21T12:00:00Z")
  }
});
await db.orderItem.upsert({
  where: { id: "seed_order_item" },
  update: { unitPriceCents: 9900, quantity: 1 },
  create: { id: "seed_order_item", orderId: order.id, productId: product.id, unitPriceCents: 9900, quantity: 1 }
});
const entitlement = await db.entitlement.upsert({
  where: { id: "seed_entitlement" },
  update: { status: "ACTIVE", revokedAt: null, expiresAt: null },
  create: { id: "seed_entitlement", orderId: order.id, userId: student.id, productId: product.id, status: "ACTIVE", startsAt: new Date("2026-09-21T12:00:00Z") }
});
const enrollment = await db.enrollment.upsert({
  where: { id: "seed_enrollment" },
  update: { entitlementId: entitlement.id },
  create: { id: "seed_enrollment", userId: student.id, courseId: course.id, entitlementId: entitlement.id, enrolledAt: new Date("2026-09-21T12:00:00Z") }
});

const firstCohort = await db.cohort.upsert({
  where: { slug: "database-certification-summer-2026" },
  update: { status: "COMPLETED", capacity: 25 },
  create: {
    id: "seed_cohort_first",
    courseId: course.id,
    slug: "database-certification-summer-2026",
    name: "Summer 2026",
    status: "COMPLETED",
    startsAt: new Date("2026-07-01T16:00:00Z"),
    endsAt: new Date("2026-08-15T16:00:00Z"),
    enrollmentOpensAt: new Date("2026-05-01T00:00:00Z"),
    enrollmentClosesAt: new Date("2026-07-05T00:00:00Z"),
    capacity: 25
  }
});
const retakeCohort = await db.cohort.upsert({
  where: { slug: "database-certification-fall-2026" },
  update: { status: "OPEN", capacity: 25 },
  create: {
    id: "seed_cohort_retake",
    courseId: course.id,
    slug: "database-certification-fall-2026",
    name: "Fall 2026",
    status: "OPEN",
    startsAt: new Date("2026-10-15T16:00:00Z"),
    endsAt: new Date("2026-11-30T16:00:00Z"),
    enrollmentOpensAt: new Date("2026-09-01T00:00:00Z"),
    enrollmentClosesAt: new Date("2026-10-20T00:00:00Z"),
    capacity: 25
  }
});
await db.cohortSeat.upsert({
  where: { id: "seed_seat_first" },
  update: { status: "COMPLETED", completedAt: new Date("2026-08-15T16:00:00Z") },
  create: { id: "seed_seat_first", enrollmentId: enrollment.id, cohortId: firstCohort.id, status: "COMPLETED", activatedAt: new Date("2026-07-01T16:00:00Z"), completedAt: new Date("2026-08-15T16:00:00Z") }
});
await db.cohortSeat.upsert({
  where: { id: "seed_seat_retake" },
  update: { status: "RESERVED" },
  create: { id: "seed_seat_retake", enrollmentId: enrollment.id, cohortId: retakeCohort.id, status: "RESERVED", reservedAt: new Date("2026-10-01T12:00:00Z") }
});
await db.cohortEvent.upsert({
  where: { id: "seed_event_live" },
  update: { recordingUrl: null },
  create: { id: "seed_event_live", cohortId: retakeCohort.id, type: "LIVE_SESSION", title: "Build session", startsAt: new Date("2026-10-16T16:00:00Z"), endsAt: new Date("2026-10-16T17:00:00Z"), joinUrl: "https://live.example.test/session", recordingUrl: null }
});

const revisionOne = await db.capstoneSubmission.upsert({
  where: { id: "seed_capstone_v1" },
  update: { status: "CHANGES_REQUESTED" },
  create: { id: "seed_capstone_v1", enrollmentId: enrollment.id, revision: 1, status: "CHANGES_REQUESTED", artifactUrl: "https://artifacts.example.test/capstone/v1", summary: "First deterministic capstone revision.", submittedAt: new Date("2026-08-10T12:00:00Z") }
});
await db.capstoneReview.upsert({
  where: { id: "seed_review_v1" },
  update: { decision: "CHANGES_REQUESTED", feedback: "Add stronger evidence and resubmit." },
  create: { id: "seed_review_v1", submissionId: revisionOne.id, reviewerId: profile.id, decision: "CHANGES_REQUESTED", feedback: "Add stronger evidence and resubmit.", reviewedAt: new Date("2026-08-11T12:00:00Z") }
});
const revisionTwo = await db.capstoneSubmission.upsert({
  where: { id: "seed_capstone_v2" },
  update: { status: "APPROVED" },
  create: { id: "seed_capstone_v2", enrollmentId: enrollment.id, revision: 2, status: "APPROVED", artifactUrl: "https://artifacts.example.test/capstone/v2", summary: "Second deterministic capstone revision.", submittedAt: new Date("2026-08-13T12:00:00Z") }
});
await db.capstoneReview.upsert({
  where: { id: "seed_review_v2" },
  update: { decision: "APPROVED", feedback: "Approved deterministic fixture." },
  create: { id: "seed_review_v2", submissionId: revisionTwo.id, reviewerId: profile.id, decision: "APPROVED", feedback: "Approved deterministic fixture.", reviewedAt: new Date("2026-08-14T12:00:00Z") }
});

console.log("CourseForge deterministic seed applied; cohort retake and capstone revision history certified without fake Stripe readiness.");
await db.$disconnect();
