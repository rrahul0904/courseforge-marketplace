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
  create: { id: "seed_profile", userId: instructor.id, slug: "courseforge-instructor", headline: "Seed instructor", bio: "Deterministic seed profile for database certification.", expertise: ["marketplace"], status: "APPROVED", verifiedAt: new Date("2026-09-21T00:00:00Z") }
});
const course = await db.course.upsert({
  where: { slug: "database-certification-course" },
  update: { status: "PUBLISHED" },
  create: { id: "seed_course", instructorId: profile.id, slug: "database-certification-course", title: "Database Certification Course", description: "Seeded course used to certify migration and persistence.", category: "Engineering", level: "Intermediate", status: "PUBLISHED", publishedAt: new Date("2026-09-21T00:00:00Z") }
});
const product = await db.product.upsert({
  where: { id: "seed_product" }, update: { active: true },
  create: { id: "seed_product", courseId: course.id, name: "Database Certification Course", active: true }
});
await db.price.upsert({
  where: { id: "seed_price" }, update: { amountCents: 9900, active: true },
  create: { id: "seed_price", productId: product.id, amountCents: 9900, currency: "USD", active: true }
});
await db.user.upsert({ where: { email: "student@courseforge.local" }, update: {}, create: { id: "seed_student", email: "student@courseforge.local", name: "CourseForge Student", role: "STUDENT" } });
console.log("CourseForge deterministic seed applied; Stripe IDs intentionally unset.");
await db.$disconnect();
