import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

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
  create: {
    id: "seed_profile",
    userId: instructor.id,
    slug: "courseforge-instructor",
    headline: "Seed instructor",
    bio: "Deterministic seed profile for database certification.",
    expertise: ["marketplace"],
    status: "APPROVED",
    verifiedAt: new Date("2026-09-21T00:00:00Z")
  }
});

const track = await db.track.upsert({
  where: { slug: "ai-engineering-interview-foundations" },
  update: {
    title: "AI Engineering Interview Foundations",
    description: "Clean-room deterministic interview-learning seed content."
  },
  create: {
    id: "seed_track",
    slug: "ai-engineering-interview-foundations",
    title: "AI Engineering Interview Foundations",
    description: "Clean-room deterministic interview-learning seed content."
  }
});

const course = await db.course.upsert({
  where: { slug: "database-certification-course" },
  update: { status: "PUBLISHED", trackId: track.id },
  create: {
    id: "seed_course",
    instructorId: profile.id,
    trackId: track.id,
    slug: "database-certification-course",
    title: "Database Certification Course",
    description: "Seeded course used to certify migration and persistence.",
    category: "Engineering",
    level: "Intermediate",
    status: "PUBLISHED",
    publishedAt: new Date("2026-09-21T00:00:00Z")
  }
});

const module = await db.module.upsert({
  where: { courseId_position: { courseId: course.id, position: 1 } },
  update: { title: "Reliable AI systems" },
  create: {
    id: "seed_interview_module",
    courseId: course.id,
    title: "Reliable AI systems",
    position: 1
  }
});

const question = await db.interviewQuestion.upsert({
  where: {
    moduleId_slug: {
      moduleId: module.id,
      slug: "reliable-retrieval-pipeline"
    }
  },
  update: {
    title: "Design a reliable retrieval pipeline",
    prompt: "You are preparing a retrieval-backed AI feature for production. Explain how you would make the retrieval path reliable, observable, and reversible before broad rollout.",
    previewPrompt: "What reliability concerns would you evaluate before shipping a retrieval-backed AI feature?",
    questionType: "interview",
    difficulty: "INTERMEDIATE",
    expectedMinutes: 8,
    answerFramework: "Cover data freshness, retrieval quality, observability, failure modes, and rollback. State assumptions and explain the tradeoffs behind the rollout plan.",
    explanation: "A strong deterministic self-review checks whether the response addresses each reliability dimension; it does not require an LLM judge.",
    rubricJson: [
      { id: "freshness", label: "Data freshness and indexing lifecycle", points: 25 },
      { id: "quality", label: "Retrieval quality and evaluation", points: 25 },
      { id: "observability", label: "Monitoring and failure detection", points: 25 },
      { id: "rollback", label: "Safe rollout and rollback", points: 25 }
    ],
    followUpPrompts: [
      "How would you detect stale or incomplete index updates?",
      "Which rollback signal would stop the rollout?"
    ],
    tags: ["retrieval", "reliability", "observability"],
    roleTags: ["ai-engineer"],
    companyClaimTags: [],
    contentVersionId: "seed_question_v1",
    previewable: true,
    publishedAt: new Date("2026-09-24T00:00:00Z"),
    retiredAt: null
  },
  create: {
    id: "seed_interview_question",
    moduleId: module.id,
    slug: "reliable-retrieval-pipeline",
    title: "Design a reliable retrieval pipeline",
    prompt: "You are preparing a retrieval-backed AI feature for production. Explain how you would make the retrieval path reliable, observable, and reversible before broad rollout.",
    previewPrompt: "What reliability concerns would you evaluate before shipping a retrieval-backed AI feature?",
    questionType: "interview",
    difficulty: "INTERMEDIATE",
    expectedMinutes: 8,
    answerFramework: "Cover data freshness, retrieval quality, observability, failure modes, and rollback. State assumptions and explain the tradeoffs behind the rollout plan.",
    explanation: "A strong deterministic self-review checks whether the response addresses each reliability dimension; it does not require an LLM judge.",
    rubricJson: [
      { id: "freshness", label: "Data freshness and indexing lifecycle", points: 25 },
      { id: "quality", label: "Retrieval quality and evaluation", points: 25 },
      { id: "observability", label: "Monitoring and failure detection", points: 25 },
      { id: "rollback", label: "Safe rollout and rollback", points: 25 }
    ],
    followUpPrompts: [
      "How would you detect stale or incomplete index updates?",
      "Which rollback signal would stop the rollout?"
    ],
    tags: ["retrieval", "reliability", "observability"],
    roleTags: ["ai-engineer"],
    companyClaimTags: [],
    contentVersionId: "seed_question_v1",
    previewable: true,
    publishedAt: new Date("2026-09-24T00:00:00Z")
  }
});

await db.questionEvidence.upsert({
  where: { id: "seed_question_evidence" },
  update: {
    evidenceType: "clean_room_editorial",
    sourceUrl: null,
    sourceLabel: "CourseForge editorial seed",
    observedAt: new Date("2026-09-24T00:00:00Z"),
    claimText: "Independently authored generic technical interview prompt with no company attribution.",
    claimStatus: "EDITORIAL_SYNTHESIS",
    confidence: 100
  },
  create: {
    id: "seed_question_evidence",
    questionId: question.id,
    evidenceType: "clean_room_editorial",
    sourceLabel: "CourseForge editorial seed",
    observedAt: new Date("2026-09-24T00:00:00Z"),
    claimText: "Independently authored generic technical interview prompt with no company attribution.",
    claimStatus: "EDITORIAL_SYNTHESIS",
    confidence: 100
  }
});

const product = await db.product.upsert({
  where: { id: "seed_product" },
  update: { active: true },
  create: {
    id: "seed_product",
    courseId: course.id,
    name: "Database Certification Course",
    active: true
  }
});

await db.price.upsert({
  where: { id: "seed_price" },
  update: { amountCents: 9900, active: true },
  create: {
    id: "seed_price",
    productId: product.id,
    amountCents: 9900,
    currency: "USD",
    active: true
  }
});

const student = await db.user.upsert({
  where: { email: "student@courseforge.local" },
  update: { name: "CourseForge Student", role: "STUDENT" },
  create: {
    id: "seed_student",
    email: "student@courseforge.local",
    name: "CourseForge Student",
    role: "STUDENT"
  }
});

const order = await db.order.upsert({
  where: { id: "seed_order" },
  update: {
    status: "PAID",
    grossCents: 9900,
    netCents: 9900,
    paymentProvider: "deterministic_seed",
    providerPaymentId: null,
    paidAt: new Date("2026-09-24T00:00:00Z")
  },
  create: {
    id: "seed_order",
    userId: student.id,
    status: "PAID",
    currency: "USD",
    grossCents: 9900,
    netCents: 9900,
    paymentProvider: "deterministic_seed",
    paidAt: new Date("2026-09-24T00:00:00Z")
  }
});

await db.orderItem.upsert({
  where: { id: "seed_order_item" },
  update: { unitPriceCents: 9900, quantity: 1 },
  create: {
    id: "seed_order_item",
    orderId: order.id,
    productId: product.id,
    unitPriceCents: 9900,
    quantity: 1
  }
});

const entitlement = await db.entitlement.upsert({
  where: {
    orderId_productId: {
      orderId: order.id,
      productId: product.id
    }
  },
  update: {
    userId: student.id,
    status: "ACTIVE",
    expiresAt: null,
    revokedAt: null
  },
  create: {
    id: "seed_entitlement",
    orderId: order.id,
    userId: student.id,
    productId: product.id,
    status: "ACTIVE",
    startsAt: new Date("2026-09-24T00:00:00Z")
  }
});

await db.enrollment.upsert({
  where: {
    userId_courseId: {
      userId: student.id,
      courseId: course.id
    }
  },
  update: { entitlementId: entitlement.id },
  create: {
    id: "seed_enrollment",
    userId: student.id,
    courseId: course.id,
    entitlementId: entitlement.id,
    enrolledAt: new Date("2026-09-24T00:00:00Z")
  }
});

console.log("CourseForge deterministic seed applied; interview Phase A fixture is clean-room and external provider IDs remain unset.");
await db.$disconnect();
