# AGENTS.md
# Trackademic Agent Responsibilities

## Purpose

This file defines responsibilities for AI coding agents working on Trackademic.

All agents must follow:

- `CLAUDE.md`
- `PRD.md` or `Trackademic_PRD.md`
- existing project architecture
- database security rules
- child privacy requirements

Agents must not independently expand the scope of the application.

---

# 1. Product Agent

## Responsibility

Protect the product scope and translate requirements into implementable work.

## Must Understand

Core workflow:

```text
Teacher creates assessment
→ system creates routing code
→ student writes code
→ paper is checked
→ student/guardian scans paper
→ OCR detects code
→ system matches assessment
→ user confirms
→ evidence is saved
```

## Duties

- validate requested features against MVP goals
- write acceptance criteria
- identify edge cases
- keep requirements simple
- prevent LMS feature creep
- maintain role boundaries

## Must Challenge

Features that:

- create unnecessary teacher workload
- make scanning slower
- expose child data
- rely entirely on OCR accuracy
- turn the app into a general school management system

---

# 2. Architecture Agent

## Responsibility

Own technical architecture and system boundaries.

## Preferred Architecture

```text
Next.js
TypeScript
Tailwind CSS
Supabase
PostgreSQL
Supabase Auth
Supabase Storage
OCR service/module
```

## Duties

- define feature/module boundaries
- design APIs
- define database relationships
- keep authorization server-side
- avoid unnecessary infrastructure
- document architecture decisions

## Rules

Do not:

- add microservices without need
- add Redis unless justified
- add queues unless actual asynchronous processing requires them
- introduce multiple databases
- replace Supabase without explicit instruction

---

# 3. Database Agent

## Responsibility

Own schema, migrations, indexing, and data integrity.

## Core Tables

```text
users
workspaces
workspace_members
student_profiles
guardian_student_links
academic_periods
subjects
subject_students
assessments
evidence
notifications
```

## Duties

- create migrations
- define foreign keys
- enforce constraints
- add appropriate indexes
- preserve audit information
- use transactions where necessary
- implement or support Row Level Security

## Critical Rules

- assessment code is not a primary key
- evidence belongs to exactly one student and assessment
- parent-child relationships must be explicit
- teacher assignment must be explicit
- deleted users must not expose orphaned private records
- historical evidence should remain linked to historical academic context

---

# 4. Security and Privacy Agent

## Responsibility

Protect student and minor data.

## Threats to Consider

- unauthorized parent access
- teacher viewing unrelated students
- student viewing another student's records
- public evidence URLs
- predictable resource IDs
- leaked storage tokens
- insecure API endpoints
- role escalation
- workspace invitation abuse

## Duties

- audit authorization
- audit RLS policies
- check signed/private file access
- review route security
- review invitation logic
- verify account/data deletion
- minimize collected data

## Default Position

Deny access unless a verified relationship grants access.

---

# 5. Authentication Agent

## Responsibility

Implement identity, login, sessions, role-aware onboarding, and account recovery.

## Required Flows

- register
- login
- logout
- email verification if enabled
- password reset
- Google OAuth if enabled
- onboarding role selection
- workspace invitation acceptance

## Rules

Roles are contextual.

A user may potentially have multiple relationships in the future.

Do not make authorization depend only on a single client-side role string.

---

# 6. Workspace Agent

## Responsibility

Manage membership and relationships between users.

## Entities

- workspace
- members
- students
- guardians
- teachers

## Duties

- create workspace
- invite user
- join workspace
- remove member
- link guardian to student
- assign teacher
- enforce workspace boundaries

## Important

A guardian joining a workspace must not automatically gain access to every student.

A teacher joining a workspace must not automatically gain access to every record unless their assignment permits it.

---

# 7. Assessment Agent

## Responsibility

Own assessment creation and routing codes.

## Assessment Fields

```text
title
subject
teacher
type
academic period
assessment date
due date
total score
assessment code
status
```

## Code Requirements

- 5 numeric digits for MVP
- unique among active assessments
- server-generated
- validated before use
- not sequential
- archived when assessment is no longer active

## Duties

- create assessment
- generate code
- code lookup
- update assessment
- archive assessment
- provide expected student list

---

# 8. Scanner Agent

## Responsibility

Own the most important product interaction.

## Required Flow

```text
Open camera/upload
→ capture paper
→ preprocess image
→ OCR
→ identify candidate code
→ backend validation
→ assessment match
→ score suggestion
→ confirmation
→ save
```

## Priorities

1. reliability
2. speed
3. simple fallback
4. mobile usability

## Must Support

- invalid code
- no code
- blurry photo
- wrong orientation
- multiple possible codes
- manual code entry
- retake photo
- manual assessment selection

Never make OCR success mandatory.

---

# 9. OCR Agent

## Responsibility

Extract useful text from captured papers.

## Priority Targets

1. 5-digit assessment code
2. score
3. total score

## Strategy

Prefer targeted extraction.

Example:

```text
1. Scan upper-right area
2. Detect digit candidates
3. Validate candidate against database
4. If no match, scan larger area
5. If still no match, manual fallback
```

## Rules

OCR output is untrusted.

Never create or route evidence solely from raw OCR without confirmation/database validation.

Return confidence where possible.

---

# 10. Image Processing Agent

## Responsibility

Improve input quality before OCR and storage.

## Capabilities

- compression
- crop
- edge detection
- rotation
- perspective correction
- contrast normalization
- thumbnail creation

## Constraints

Do not destroy teacher markings or score visibility.

Do not overcompress.

Preserve enough resolution for later human review.

---

# 11. Evidence Agent

## Responsibility

Manage academic evidence lifecycle.

## Evidence Fields

```text
student
assessment
uploaded_by
image
detected_code
ocr_text
ocr_confidence
score
total_score
status
uploaded_at
verified_by
verified_at
```

## Status Flow

Typical:

```text
DRAFT
→ UPLOADED
→ CODE_MATCHED
→ NEEDS_REVIEW
→ TEACHER_VERIFIED
```

Alternative:

```text
NEEDS_REVIEW
→ REJECTED
```

## Rules

Never present uploaded evidence as teacher verified unless a teacher verification action exists.

---

# 12. Verification Agent

## Responsibility

Handle teacher review and evidence status changes.

## Teacher Actions

- verify
- reject
- mark wrong student
- mark wrong assessment
- add optional note

## Audit Requirements

Store:

- verifier
- timestamp
- prior state
- resulting state

Verification must be reversible only through an authorized workflow.

---

# 13. Parent Experience Agent

## Responsibility

Make progress understandable without overwhelming guardians.

## Dashboard Priority

Show:

- child
- current period
- new scores
- missing evidence
- low scores
- pending verification
- recent records

Avoid excessive charts.

Use plain language.

## Important

Do not make the interface feel punitive.

Use wording such as:

- Needs attention
- No evidence yet
- Awaiting verification
- Recently added

---

# 14. Student Experience Agent

## Responsibility

Make Trackademic useful to students independently of parent monitoring.

## Student Value

Students should be able to:

- keep proof of completed work
- see their academic records
- know what is missing
- organize physical schoolwork digitally
- review past results

Do not create an experience whose only purpose is surveillance.

---

# 15. Teacher Experience Agent

## Responsibility

Minimize teacher workload.

## Teacher's Minimum Required Interaction

```text
Create assessment
→ get code
→ announce code
```

Verification should be optional or efficiently batchable.

Do not require repetitive per-student data entry if the student/parent can do it.

---

# 16. Dashboard Agent

## Responsibility

Build dashboards only after core scanner and data model are stable.

## Parent

Focus:

- child overview
- latest scores
- missing evidence
- verification status

## Student

Focus:

- scan CTA
- recent evidence
- missing work
- subjects

## Teacher

Focus:

- active assessments
- assessment codes
- uploaded count
- missing count
- verification queue

Avoid dashboard complexity before usage data justifies it.

---

# 17. Notification Agent

## Responsibility

Implement useful, non-spammy notifications.

## Valid Notifications

- evidence uploaded
- evidence verified
- evidence rejected
- assessment created
- missing evidence after due date
- low score if enabled
- upcoming due date if enabled

## Rules

- notifications must be configurable
- avoid excessive parent alerts
- do not shame students
- use neutral language

---

# 18. API Agent

## Responsibility

Define and implement secure API contracts.

## Requirements

Every protected API must:

1. authenticate user
2. validate input
3. authorize action
4. perform operation
5. return safe response
6. avoid leaking internal/private fields

## Example

Assessment code lookup must NOT allow random public users to enumerate school records.

Code lookup should require authenticated workspace context.

---

# 19. Testing Agent

## Responsibility

Test critical workflows and edge cases.

## Highest Priority Tests

### Scanner

- valid handwritten code
- invalid code
- poorly written code
- multiple numbers
- upside-down paper
- low-light image
- blurry image

### Security

- guardian accesses unrelated student
- teacher accesses unrelated subject
- student accesses another student's evidence
- public storage URL attempt
- modified client role attempt

### Evidence

- duplicate upload
- incorrect score
- score greater than total
- deleted assessment
- archived assessment
- rejected evidence

---

# 20. QA Acceptance Flow

A release must pass this end-to-end scenario:

1. Teacher logs in.
2. Teacher creates Mathematics Quiz.
3. System generates code `55922`.
4. Student writes code on sample paper.
5. Paper contains score `18/20`.
6. Student or guardian scans paper.
7. OCR identifies `55922`.
8. Backend matches correct assessment.
9. App suggests `18/20`.
10. User confirms.
11. Evidence is saved privately.
12. Parent can see it.
13. Student can see it.
14. Correct teacher can see it.
15. Unrelated users cannot see it.
16. Teacher verifies it.
17. Status updates to `Teacher Verified`.

If this flow breaks, the release is not ready.

---

# 21. Performance Agent

## Responsibility

Keep mobile interactions fast.

## Targets

Prioritize:

- small initial bundle
- compressed image upload
- responsive scan flow
- optimized database queries
- indexed code lookup
- pagination for evidence lists

Avoid loading full-resolution evidence thumbnails in dashboards.

---

# 22. Accessibility Agent

## Responsibility

Ensure the product remains usable for children, parents, and teachers.

Requirements:

- readable text
- keyboard support on web
- visible focus
- strong contrast
- descriptive labels
- large touch targets
- understandable errors
- do not rely only on color for status

---

# 23. Documentation Agent

## Responsibility

Keep project docs synchronized with implementation.

Update when relevant:

- README
- environment variables
- database schema
- API documentation
- setup instructions
- migration notes
- deployment notes

Never leave obsolete setup instructions after architectural changes.

---

# 24. Agent Coordination Rules

Before editing:

1. inspect current implementation
2. identify impacted features
3. check existing types/schema
4. preserve unrelated functionality

When multiple agents work:

- database schema decisions belong to Database Agent
- permission decisions require Security Agent review
- scanner/OCR changes require Scanner and OCR responsibilities
- scope questions belong to Product Agent

Avoid parallel agents editing the same critical file unless coordinated.

---

# 25. Change Discipline

Every implementation should be:

- focused
- minimal
- testable
- reversible
- documented when architecture changes

Do not:

- rewrite the entire codebase for a small feature
- rename core entities without migration
- remove working behavior without requirement
- fabricate APIs
- claim tests passed if they were not run

---

# 26. Environment and Secrets

Never commit:

- Supabase service role keys
- private API keys
- OAuth secrets
- production credentials

Use:

```text
.env.local
.env.example
```

`.env.example` contains names only, never secrets.

---

# 27. Preferred Delivery Format

When completing implementation work, summarize:

```text
Implemented
- ...

Changed
- ...

Database
- ...

Security
- ...

Tests
- ...

Known limitations
- ...
```

Keep reporting factual.

---

# 28. North Star Rule

All agents should remember:

**Trackademic is an academic evidence inventory system, not a general LMS.**

The core value is:

> A checked physical paper can be photographed and automatically organized into the correct student's academic record.

Protect that behavior above all else.
