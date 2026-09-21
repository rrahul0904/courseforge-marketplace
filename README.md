# CourseForge Marketplace

CourseForge is the canonical multi-instructor learning marketplace in this portfolio. It is a clean-room implementation informed by public creator-platform patterns such as ProLaud and marketplace patterns such as Udemy; no proprietary source code or course content is copied.

## Product boundary

CourseForge owns instructor onboarding, course publishing, marketplace discovery, checkout, entitlements, learner access, reviews, certificates and payouts.

It is intentionally separate from Academic OS, which remains student workflow software and can later consume CourseForge entitlements through APIs.

## Current launch slice

- Next.js 16 App Router shell and public course catalogue
- Prisma ORM 7 + PostgreSQL driver adapter
- explicit student / instructor / admin server authorization boundary
- instructor application and administrator approval endpoints
- marketplace versus instructor-referral revenue policy
- Stripe Checkout + Connect destination-charge adapter
- idempotent Stripe webhook processing
- verified commerce invariant: `Order -> Entitlement -> Enrollment`
- health endpoint and CI
- local commerce/security tests

## Local development

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm test
npm run dev
```

Protected routes fail closed when a valid signed server session is not present. The local dev-session helper requires `COURSEFORGE_ALLOW_DEV_LOGIN=true` and is hard-disabled when `NODE_ENV=production`.

## Status

This repository is under active implementation. The current branch establishes the marketplace-commerce foundation; hosted PostgreSQL, production identity, Stripe Connect account onboarding, media delivery and end-to-end hosted evidence remain release gates.

See `docs/ARCHITECTURE.md` for the launch-critical invariants and next slices.
