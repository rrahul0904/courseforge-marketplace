# REA donor — Lumina Learn educator operating system (2026-10-21)

**Decision:** CAPABILITY DONOR -> existing CourseForge Marketplace. Do **not** create a new LMS repository.
**Intake:** https://www.reddit.com/r/SaaS/comments/1xbher1/hey_guys_i_finally_built_my_saas_product_and_its/
**Verified website:** https://www.luminalearn.space/ and https://luminalearn.space/about
**Related work:** CourseForge #6 (live cohorts/capstones) and #2 (marketplace release gates); new educator operations issue #8.

## Evidence and uncertainty

| Source | Publicly observed | What remains unverified |
| --- | --- | --- |
| Original Reddit author | Founder claims initial music-teacher focus, earlier MusicLMS name, four previous WordPress LMS customers, and customer-owned AWS account deployment | Account architecture, 4-user commercial traction and AWS self-hosting are founder assertions; no code or AWS account inspected |
| Official public site | Pre-recorded video courses, live and 1:1 scheduling, QR/check-in and parent absence alerts, bidirectional Google Calendar sync, invoicing, Razorpay Route, white-label branded website studio, multi-branch rooms and management | Functionality behind authentication is not exercised |
| Official pricing | Starter ₹2,499/mo, Professional ₹4,999/mo, Business ₹11,000/mo and negotiated Enterprise; 0% advertised cut on live lessons, 25% on recorded sales for three smaller tiers | Marketing claims; Enterprise page contradicts itself on recorded-course commission. We do not reproduce prices as policy |
| Official roadmap | Native iOS/Android, AI curriculum/quizzes, teaching chatbot, MCP, global checkout listed as in development | Explicitly not counted as released |
| Similar-name sites | musiclms.app, luminalearn.org, luminalearnai.com appear in search results | No verified founder relationship: EXCLUDE from donor evidence |

## Functional reconstruction — original implementation only

Public *behavior* is the donor. Do not copy copyrightable source code, private API shapes, visual trade dress, names, testimonials, screenshots, prompts, course media, or logos.

### Existing CourseForge modules to reuse
- Account roles and instructor approval, course authoring, catalog, sections, lessons and enrollments.
- Verified payment boundary Order -> Entitlement -> Enrollment; Stripe Connect contracts remain separate from the competitor's Razorpay assertions.
- Existing #6 plans for cohorts, seats, events, graded capstones.
- Independent AcademicOS certification product remains separate.

### Proposed operations extension
1. Studio/academy tenant and staff roles: owner, branch manager, teacher, student, optional guardian.
2. Branches, rooms, cohort/class schedule and instructor calendar with transactional collision prevention.
3. Roster and guardian consent; minimal student data, independent verified child/guardian link.
4. Student check-in: single-tap or short-lived signed QR tokens, replay-safe attendance and immutable audit evidence.
5. Invoice + receipt + reminder state machine with tax/provider compliance, without inventing a paid entitlement.
6. Original white-label website builder using editable schema blocks, revisions, preview, human approval and rollback.
7. Calendar sync using authorized OAuth, deduplicated webhook handling, explicit conflict resolution and rate limits.
8. Customer-owned AWS deployment as an OPTIONAL IaC adapter with no live deploy without authorization.
9. REA AI only for bounded proposals with provenance, preview and human approval.

## Proposed relational contracts — NOT MIGRATED

- Studio(id, ownerUserId, timezone, plan), StudioMembership(studioId,userId,role)
- StudioBranch(studioId,id), StudioRoom(studioId,branchId,id)
- StudioStudent(studioId,studentId,guardianConsentStatus)
- StudioClass(studioId,id,courseId), ClassSession(studioId,id,roomId,branchId,instructorId,startsAt,endsAt,status)
- SessionParticipant(studioId,sessionId,studentId,rosterStatus)
- SessionAttendance(studioId,sessionId,studentId,verifiedBy,checkedInAt,source), with DB UNIQUE(studioId,sessionId,studentId)
- Invoice(studioId,id,studentId,status,providerRef), WebsiteDraft(studioId,revision,status), WebsitePublish(studioId,revision,approvedBy)
- Child tables require tenant-scoped foreign keys, authorization and subject filters. Scheduling needs a DB-side exclusion/locking gate to withstand concurrent requests.

## Phase 1 engineering slice delivered on research branch

- `domain/studio-ops.mjs`: pure rules for explicit-timezone scheduling, instructor and room collisions, cross-studio separation; HMAC-SHA256 signed attendance tokens bound to studio/session/student, expire in <=15 minutes; role-aware student binding precondition; check-in window and idempotent repeat behavior.
- `tests/studio-ops.test.mjs`: 22 synthetic tests for legal/illegal bookings, conflict/no-conflict cases, invalid timezone/duration, unenrolled students, token tampering, weak secrets, cross-studio and cross-student use, token expiry, repeated attendance and invalid attendance windows.
- Local Node test run: 22 tests passed before branch push. No claims about exact remote SHA CI or full hosted functionality.

**Strict limitation:** Domain functions are NOT connected to Prisma, REST, UI, calendar, QR rendering, actual payment, email or real customers. Caller MUST enforce authenticated authority. DB transactions and unique indexes MUST defend race conditions. No production release claim.

## REA completion gates

| Phase | Concrete completion receipt | Status |
| --- | --- | --- |
| Intake and clean-room research | Source URLs, disagreements, identity disambiguation, capability matrix | Done for public pages |
| Scope+acceptance | User journeys, actor permissions, positive + adversarial test cases | Initial dossier; review pending |
| Studio persistence | Prisma migration, transaction collision tests, tenant ownership and RBAC | Pending |
| Live booking+attendance | Authenticated API, QR UI, student and instructor screens, persistent check-in | Pending |
| Business operations | Guardian consent, billing and safe notifications; outbox replay | Pending |
| Website studio | Editable original templates, preview/approve/publish, rollback browser proof | Pending |
| Integrations | Hosted sandbox payment, authorized Google Calendar round trips, protected media | Pending |
| BYO AWS | Policy-scoped Terraform dry run, rollback, cost/secret review | Pending |
| Privacy/reliability | Threat model, minors data safety, WCAG, load, abuse, separate tenant UAT | Pending |
| Release | Exact-head CI, build, browser video/screenshots, reviewer receipt, deployment authorization | NOT READY |

### Golden workflow for end-to-end verification
Demo adult educator creates a studio and branch -> assigns room -> invites adult demo student -> schedules a class without collision -> enrollment verified -> signs a short-lived token -> authenticated student checks in exactly once -> teacher sees provenance -> invoice issued -> sandbox payment reconciles -> learning access displayed -> tenant B cannot read or mutate tenant A data.

### Mandatory failure tests
Double-booked instructor or room, simultaneous booking writes, revoked roster, expired/tampered/cross-studio QR, spoofed student identity, repeat check-in, unauthorized guardian read, invoice refunds/webhook replay, calendar sync storms/conflicts, unpublished site leak, unauthorized publish, AWS rollback, and mobile/responsive browser journeys.

## Next exact implementation steps
1. Review #6 cohort primitives and unify instructor availability, session IDs and staff roles before schema migration.
2. Create Prisma migration with tenant-owned constraints and booking serialization; test against real local PostgreSQL.
3. Wire authenticated booking/check-in APIs and independent student/instructor browser flows.
4. Add privacy-focused guardian and payment/invoice acceptance after the narrow live loop passes.
5. Keep research PR draft; never promote to release without exact-SHA evidence and user go/no-go.

**Business validation:** founder-reported 85% admin reduction and revenue growth are not verified. Pilot first with independent teachers and capture timed baseline vs automated task completion.
