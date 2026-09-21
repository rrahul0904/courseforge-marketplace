# CourseForge architecture

## Product boundary

CourseForge is the commercial learning marketplace. Academic OS remains a separate student workflow product and may consume CourseForge entitlements later.

## Launch-critical invariants

1. Authentication and authorization fail closed on server routes.
2. Instructor status is distinct from user role; an application must be approved before the user becomes an instructor.
3. Payment never writes enrollment directly. The verified flow is `Order -> Entitlement -> Enrollment`.
4. Stripe webhook events are idempotent by provider event id.
5. Marketplace versus instructor-referral economics are persisted on the order before redirecting to Checkout.
6. Instructor payouts require a connected account id; checkout refuses a course that is not payout-ready.

## Initial deployment shape

- Next.js 16 App Router
- PostgreSQL
- Prisma ORM 7 + PostgreSQL driver adapter
- Stripe Checkout + Connect destination charges
- signed HTTP-only server session boundary, replaceable by a managed identity provider without changing authorization call-sites

## Next slices

- real identity provider + account recovery / email verification
- initial migration and seed data
- Stripe Connect onboarding and account-status refresh
- course authoring CRUD and moderation
- learner library backed by entitlements
- signed media playback and caption pipeline
- reviews, certificates, coupons and refunds
