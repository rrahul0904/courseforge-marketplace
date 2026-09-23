# RE-226 — Aidemy / Crack AI Interviews clean-room product study

Status: research contract only; native donor-specific implementation is not yet claimed.

## 1. Source surfaces

Primary public surfaces reviewed:

- https://www.aidemy.co.in/
- https://crackaiinterviews.co.in/
- public social posts linking the Aidemy AI Engineering Interview Master Bundle

The public sales surface describes a commercial AI interview-preparation product with 22 courses, more than 1,100 interview questions, signup-gated free previews, lifetime access, content updates, community access, monthly live AMA, scenario practice, a live-coding capstone, a seven-day refund policy and a separate learner-platform preview.

This document records product behavior only. It does not claim access to private application code, paid lesson bodies, proprietary answers, internal analytics, payment-provider configuration, private community data or infrastructure credentials.

## 2. Canonical product mapping

Aidemy is a capability donor for **CourseForge Marketplace**.

CourseForge owns:
- creator/admin curriculum authoring
- course and bundle commerce
- order, entitlement, enrollment and refund state
- learner delivery
- progress and completion
- verified reviews and certificates
- content release/version management
- interview-learning primitives described below

A separate Aidemy rebuild should not be created unless a future requirement proves that the product cannot fit the CourseForge boundary.

ApplyAI may later consume a provider-neutral interview-question feed for mock-interview sessions, but paid curriculum, content versioning and learner entitlement stay in CourseForge.

## 3. Observed public product behavior

### 3.1 Acquisition funnel

The public funnel uses a conversion-oriented landing page:
1. immediate outcome promise for AI/ML/GenAI interview preparation
2. quantitative social proof
3. bundle size and lifetime-access promise
4. sample interview scenario
5. curriculum grouping by skill family
6. role/persona segmentation
7. platform demonstration
8. testimonials and outcome claims
9. comparison against alternatives
10. single-purchase pricing
11. refund promise
12. FAQ and repeated enrollment CTA

The funnel also exposes free-preview calls to action that require signup.

### 3.2 Curriculum structure

The public catalog spans:
- Python and mathematical foundations
- classical ML and deep-learning fundamentals
- transformers, prompting, LLMs and fine-tuning
- RAG and advanced retrieval
- agent frameworks and agent-design patterns
- FastAPI/serving
- safety and guardrails
- LLM evaluation
- LLMOps/deployment
- scenario/system-design practice
- coding-round practice

The donor value is not the exact proprietary content. The reusable product pattern is a structured interview-learning graph that moves from foundations to production reasoning and then to capstone practice.

### 3.3 Learner value proposition

The sales surface emphasizes:
- structured answers rather than isolated definitions
- tradeoff reasoning
- interview-shaped scenarios
- frequently updated content
- self-paced access
- role-oriented preparation
- free previews before purchase

This suggests that the learner workspace must optimize for repeated question drilling, explanation review and rapid navigation rather than long-form video-only consumption.

### 3.4 Commerce

Observed commercial behavior:
- one-time bundle purchase
- lifetime access
- discounted/founder-style promotional price presentation
- refund window
- community access as part of entitlement
- lifetime content updates

No payment provider should be inferred from the marketing page. CourseForge already has a provider abstraction and Stripe-oriented repository contracts; hosted payment behavior remains a separate certification gate.

## 4. Clean-room and licensing boundary

Do not copy or scrape:
- proprietary paid question text
- paid answer text
- lesson notes
- code solutions
- proprietary videos
- screenshots/assets
- testimonials
- brand names, logos or visual trade dress beyond factual reference in this research file

Independently authored questions and explanations may target the same general technical subjects because topics such as RAG, transformers, FastAPI and agent orchestration are generic technical subject matter.

Any company-attribution claim for an interview question must have provenance metadata. If independent evidence is unavailable, retain it as an attributed claim with a lower evidence status; do not present it as verified fact.

## 5. Proposed CourseForge capability model

### 5.1 Curriculum graph

Recommended hierarchy:

```
LearningTrack
  -> Course
     -> Module
        -> LearningItem
```

`LearningItem` is polymorphic:
- concept lesson
- interview question
- scenario drill
- coding exercise
- checkpoint quiz
- reference note

A bundle contains one or more courses and is associated with a commerce Product/Price and entitlement grant.

### 5.2 Interview-question entity

Suggested fields:

```
InterviewQuestion
- id
- courseId
- moduleId
- slug
- title
- prompt
- questionType
- difficulty
- expectedMinutes
- answerFramework
- explanation
- followUpPrompts[]
- tags[]
- roleTags[]
- companyClaimTags[]
- activeContentVersionId
- previewable
- publishedAt
- retiredAt
```

Do not force every question to contain an LLM-generated answer. The canonical answer should be editor-authored or editor-approved content.

### 5.3 Evidence and provenance

```
QuestionEvidence
- id
- questionId
- evidenceType
- sourceUrl
- sourceLabel
- observedAt
- claimText
- claimStatus
- confidence
- reviewerId
- reviewedAt
```

`claimStatus`:
- independently_verified
- attributed_public_claim
- editorial_synthesis
- unverified
- rejected

Public company-name claims should default to `attributed_public_claim` until stronger evidence exists.

### 5.4 Content versioning

Lifetime updates require immutable release history rather than silent mutation.

```
ContentVersion
- id
- entityType
- entityId
- version
- body
- changeSummary
- createdBy
- createdAt
- publishedAt
- supersedesVersionId
```

Learner attempts should retain the content version used at attempt time.

### 5.5 Practice and attempts

```
QuestionAttempt
- id
- learnerId
- questionId
- contentVersionId
- mode
- responseText
- selectedAnswer
- selfScore
- deterministicScore
- durationMs
- revealedAnswerAt
- completedAt
```

Practice modes:
- topic drill
- mixed/random drill
- weak-topic drill
- scenario round
- timed round
- coding round

Phase A should support deterministic/self-evaluated practice only. LLM judging should be introduced later with explicit model/version/prompt/evidence records.

### 5.6 Learner organization

Add:
- Bookmark
- LearnerNote
- CourseProgress
- ModuleProgress
- PracticeSession
- PracticeSessionItem

A learner should be able to resume from last activity, bookmark difficult items and maintain notes without copying the canonical lesson body into the note record.

## 6. Access and preview model

Guest:
- browse catalog
- see curriculum metadata
- view explicitly previewable question/lesson snippets
- cannot access paid explanation/answer bodies

Authenticated non-entitled user:
- same catalog
- preview allowance
- checkout entry
- saved lead/preview state if product policy allows

Entitled learner:
- paid content
- attempts
- notes/bookmarks
- progress
- lifetime release updates
- eligible community/live-session links

Admin/instructor:
- author/review/publish curriculum
- change preview status
- manage content versions
- view aggregate learning metrics
- cannot impersonate learner entitlement without an auditable support action

All content APIs must enforce entitlement server-side. Client-side hiding is not sufficient.

## 7. Core user journeys

### 7.1 Guest preview to purchase
1. open landing/catalog
2. choose a course
3. select a previewable question
4. authenticate
5. preview content
6. choose bundle
7. checkout
8. verified payment event creates/activates entitlement
9. learner enters library at the selected course

### 7.2 Entitled learner drill
1. open course/module
2. start question
3. answer before reveal
4. optionally self-score against framework
5. persist attempt
6. show explanation/follow-ups
7. bookmark or note
8. continue to next question
9. update progress

### 7.3 Scenario round
1. choose scenario category
2. start session timer
3. show primary system-design problem
4. collect structured answer
5. reveal evaluation rubric/framework
6. present branching follow-ups
7. persist session and self-review

### 7.4 Coding round
Phase A:
- prompt + starter code/plain-text response
- no arbitrary code execution

Later:
- isolated sandbox with CPU/time/memory/network constraints
- language allowlist
- immutable test fixture
- stdout/stderr/exit status evidence
- no secret-bearing environment variables
- explicit abuse and resource controls

## 8. Conversion and retention mechanics to reproduce generically

Useful capabilities:
- curriculum category filters
- free-preview badges
- bundle savings display based on real configured prices
- lifetime entitlement marker
- progress/resume
- recently updated modules
- content release notes
- weak-topic view from attempts
- reminders only with user opt-in
- community/live-session calendar links after entitlement

Do not hard-code fake scarcity, fake enrollment counters, fake review counts or misleading reset timers. If urgency is displayed, it must be backed by an actual promotion record with a real end time.

## 9. Monetization model

CourseForge should support:
- one-time bundle price
- optional individual-course price
- coupons/promotions
- refund window policy
- creator/platform revenue split
- future subscription products without changing entitlement semantics

Recommended product/entitlement representation:

```
Bundle -> Product -> Price
Order -> OrderItem -> Entitlement
Entitlement(scope=BUNDLE, scopeId=bundleId, expiresAt=null)
```

Lifetime means no expiration while the entitlement remains active.

A full verified refund should revoke the entitlement according to CourseForge's existing commerce rules. A partial refund should not automatically revoke unless the product policy explicitly says so.

## 10. Community and live sessions

Observed marketing includes community access and a recurring live AMA.

Treat these as entitlement-linked resources:
- CommunityAccessGrant
- LiveSession
- LiveSessionRegistration
- LiveSessionRecording

Do not claim a Discord/Slack/WhatsApp/community-provider integration until a real provider is selected and verified.

## 11. Analytics

Minimum privacy-conscious events:
- landing_view
- catalog_view
- preview_opened
- signup_completed
- checkout_started
- entitlement_activated
- practice_session_started
- question_attempted
- answer_revealed
- bookmark_added
- note_saved
- module_completed
- refund_processed

Derived metrics:
- preview-to-signup conversion
- signup-to-checkout conversion
- checkout-to-entitlement activation
- active learners
- course/module completion
- median attempts per question
- weak-topic distribution
- release adoption

Avoid sending paid answer text, learner free-text answers or sensitive identity fields into generic analytics tools.

## 12. Security and abuse boundary

Required controls:
- server-side authorization for learner/admin/instructor routes
- entitlement check for every paid-content read
- signed/idempotent payment webhooks
- rate limits on preview and question endpoints
- CSRF/session protection
- input validation
- admin audit trail
- immutable content-version references on attempts
- no arbitrary URL fetch from question content
- no unsafe code execution in Phase A
- per-user export/delete controls where applicable

Preview leakage tests must verify that direct URLs/API calls cannot retrieve paid answer bodies.

## 13. Accessibility and UX

- keyboard reachable catalog and drill controls
- answer reveal state announced to assistive technology
- sufficient contrast
- mobile-first question reading
- code blocks horizontally scroll without page overflow
- progress conveyed in text, not color alone
- reduced-motion behavior
- focus restoration after next-question navigation

## 14. Proposed implementation phases

### Phase A — deterministic interview-learning core
- schema: track/course/module/question/evidence/attempt/bookmark/note
- deterministic seed fixtures
- server-side entitlement gate
- one previewable item
- one paid drill flow
- answer reveal
- attempt persistence
- progress calculation
- tests for auth/entitlement/preview/provenance/scoring

### Phase B — learner practice system
- random/topic/weak-topic drill
- scenario sessions
- saved sessions
- search/filter/tagging
- versioned content releases
- release notes
- admin content-review workflow

### Phase C — commerce polish
- bundle pricing
- promotion records
- refund-policy UI
- entitlement-linked community/live sessions
- browser UAT across guest/buyer/learner/admin

### Phase D — optional AI assistance
Only after the deterministic learning product is stable:
- explanation simplification
- Socratic hints
- mock-interview follow-ups
- semantic related-question suggestions
- LLM-assisted answer feedback

Every AI-generated learner-facing assessment should capture provider/model/version and be clearly identified as automated feedback.

### Phase E — sandboxed coding
- isolated executor
- language allowlist
- resource budgets
- deterministic hidden tests
- execution audit/evidence
- abuse protection

## 15. Smallest implementation slice

Implement only:

1. Track -> Course -> Module -> InterviewQuestion
2. QuestionEvidence
3. QuestionAttempt
4. Bookmark
5. LearnerNote
6. preview flag
7. existing CourseForge entitlement check
8. deterministic drill scoring/self-score contract
9. one guest preview path
10. one entitled learner drill path

Acceptance evidence:
- migration succeeds
- deterministic seed succeeds twice
- unauthorized paid-content API returns fail-closed response
- preview endpoint exposes only preview-safe fields
- entitled learner can reveal an answer and persist attempt
- attempt stores contentVersionId
- bookmark/note are tenant/user scoped
- refund/revoked entitlement blocks the paid drill
- exact-head unit/integration/typecheck/build evidence
- browser UAT for guest preview and entitled learner

## 16. Explicit non-claims

This reverse-engineering slice does not claim:
- the original Aidemy implementation stack
- the original payment provider
- the original auth provider
- ownership or reuse of the 1,100+ proprietary question bank
- verification of every company-attribution marketing claim
- live community integration
- LLM grading
- secure coding sandbox
- hosted production readiness

## 17. Product improvement opportunities

CourseForge can improve the generic pattern without copying the donor:
- evidence status for question provenance
- immutable content releases
- learner-visible change log
- weak-topic practice generated from actual attempts
- rubric-based self-assessment before optional AI feedback
- transparent promotion end times
- explicit refund/entitlement state
- exportable learner notes and progress
- accessible mobile drill mode
- provider-neutral community/live-session links
- future ApplyAI interoperability through a read-only InterviewQuestionSet contract

## 18. Next bounded repository action

Implement Phase A schema + deterministic fixtures on a follow-up branch after this research contract is reviewed. Keep PR #1 launch certification separate: this donor spec must not be used to imply hosted payment, identity, media, browser UAT or production readiness.
