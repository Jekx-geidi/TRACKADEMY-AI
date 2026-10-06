# CLAUDE.md
# Trackademic Development Instructions

## Project Overview

Trackademic is a mobile-first academic evidence and score tracking application for students, parents/guardians, and teachers.

Its core purpose is to convert physical checked schoolwork into organized digital academic records.

The key product interaction is:

```text
Teacher creates assessment
        ↓
System generates 5-digit code
        ↓
Student writes code on paper
        ↓
Teacher checks paper
        ↓
Student or parent scans paper
        ↓
OCR detects code
        ↓
System finds correct assessment
        ↓
User confirms score and details
        ↓
Paper is stored as academic evidence
```

The app is NOT a full LMS.

Do not expand the product into chat, online classes, AI tutoring, attendance, or unrelated school management features unless explicitly requested.

---

# 1. Core Product Principle

Always protect this core experience:

```text
Scan Paper
→ Detect Code
→ Match Assessment
→ Confirm
→ Save Evidence
```

Any feature that makes this flow slower, more complicated, or less reliable must be challenged before implementation.

---

# 2. Product Roles

The system has three primary roles:

## Student

Can:

- view assigned subjects and assessments
- scan school papers
- upload evidence
- review scores
- see missing work
- save drafts
- view verification status

Students must never access another student's private records.

---

## Parent / Guardian

Can:

- link to one or more students
- scan on behalf of a child
- view linked child's evidence
- view score summaries
- view missing work
- view pending verification
- receive alerts

Parents must only access explicitly linked students.

---

## Teacher

Can:

- manage assigned subjects/classes
- create assessments
- generate assessment routing codes
- view student evidence related to their assessments
- optionally verify or reject evidence
- view missing submissions

Teachers should not be required to scan every student's paper.

---

# 3. Assessment Code Rules

The assessment code is a routing identifier.

It is NOT:

- authentication
- proof of authenticity
- proof that the teacher verified the paper

Default MVP code:

```text
5 numeric digits
Example: 55922
```

The code maps to:

```text
Teacher
Subject
Academic Period
Assessment Type
Assessment
Total Score
```

Example:

```text
55922
→ Ms. Santos
→ Mathematics
→ First Quarter
→ Quiz
→ Fractions Quiz
→ 20 points
```

Requirements:

- active assessment codes must be unique
- codes must be validated in the backend
- OCR output must never be trusted without database lookup
- invalid codes must fall back to manual selection
- code generation must avoid sequential predictable IDs

---

# 4. Scanner First

Before building complex dashboards, ensure scanning works reliably.

Priority order:

1. camera/image upload
2. document crop
3. detect handwritten 5-digit code
4. validate code
5. match assessment
6. detect score if possible
7. display confirmation
8. save evidence

The scanner must always have a manual fallback.

Example:

```text
Could not identify the code.

[ Enter Code Manually ]
[ Choose Assessment ]
[ Retake Photo ]
```

Never block a valid submission solely because OCR failed.

---

# 5. OCR Rules

OCR is an assistive feature, not the source of truth.

Primary OCR targets:

1. assessment code
2. score
3. total score

Do not attempt complex full-page document understanding in the MVP unless required.

Preferred OCR options:

- Google ML Kit for mobile/native
- Tesseract for prototype/server fallback

When possible:

- crop upper-right area first
- prioritize digits
- improve contrast
- rotate image automatically
- use document edge detection
- use perspective correction

OCR confidence must be stored when available.

If confidence is low, require confirmation.

---

# 6. Evidence Status Model

Use explicit statuses.

Recommended:

```text
DRAFT
UPLOADED
CODE_MATCHED
NEEDS_REVIEW
TEACHER_VERIFIED
REJECTED
MISSING
```

Important:

`UPLOADED` does not mean `TEACHER_VERIFIED`.

Never show an unverified student upload as teacher-confirmed evidence.

---

# 7. Privacy and Child Safety

Trackademic stores information about minors.

Treat all student data as private by default.

Requirements:

- no public evidence URLs
- secure storage
- authorization checks on every sensitive operation
- parents only see linked children
- teachers only see assigned students/subjects
- students only see their own academic records
- use row-level security where possible
- log who uploaded evidence
- log who verified evidence
- support account/data deletion
- collect the minimum personal data required

Do not expose:

- school records through guessable URLs
- raw storage bucket URLs
- student information to unauthorized workspace members

---

# 8. Recommended Stack

Preferred MVP stack:

## Frontend

- Next.js
- TypeScript
- Tailwind CSS
- mobile-first responsive design
- PWA-friendly architecture

## Backend

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Row Level Security

## OCR

Prototype:

- Tesseract.js or server-side Tesseract

Production mobile path:

- Google ML Kit

## Deployment

- Vercel

Do not introduce a new framework without a clear technical reason.

---

# 9. Coding Standards

Use:

- TypeScript strict mode
- clear naming
- small reusable functions
- explicit types
- server-side authorization
- schema validation
- predictable folder structure

Prefer:

```text
features/
  assessments/
  evidence/
  scanner/
  subjects/
  workspace/
  guardians/
```

Avoid:

- giant components
- deeply nested conditionals
- duplicated business logic
- magic strings
- client-only permission checks

---

# 10. Validation

Use schema validation for API inputs.

Recommended:

- Zod

Validate:

- IDs
- assessment code
- score
- total score
- workspace membership
- file type
- image size
- academic period
- role permissions

Example score rule:

```text
score >= 0
totalScore > 0
score <= totalScore
```

Do not silently accept invalid score values.

---

# 11. Database Rules

Prefer UUID primary keys.

Important entities:

- users
- workspaces
- workspace_members
- student_profiles
- guardian_student_links
- academic_periods
- subjects
- subject_students
- assessments
- evidence
- notifications

Never use the 5-digit assessment code as the primary key.

The assessment code is a lookup value only.

Add indexes for:

- assessment_code
- workspace_id
- student_user_id
- teacher_user_id
- subject_id
- assessment_id

---

# 12. Evidence Storage

Evidence images must be private.

Recommended storage path:

```text
workspace/{workspaceId}/student/{studentId}/assessment/{assessmentId}/{evidenceId}.jpg
```

Store metadata separately in PostgreSQL.

Compress images before or during upload.

Preserve sufficient resolution for:

- teacher markings
- score readability
- OCR

Do not store unnecessarily large originals if a compressed version is adequate.

---

# 13. Duplicate Detection

Detect likely duplicate evidence using:

- same student
- same assessment
- same score
- similar image hash
- close upload timestamps

If duplicate is suspected:

```text
A record already exists for this assessment.

[ View Existing ]
[ Replace ]
[ Save Another ]
```

Do not automatically delete or replace prior evidence.

---

# 14. Permission Rules

All permissions must be checked on the server/backend.

Never rely only on hidden UI buttons.

Examples:

A guardian requesting student evidence:

```text
guardian
→ guardian_student_link exists
→ same workspace
→ access granted
```

Teacher requesting evidence:

```text
teacher
→ owns or is assigned to subject
→ student belongs to subject
→ access granted
```

Student:

```text
requested_student_id == authenticated_student_id
```

---

# 15. UX Rules

Primary audience includes children and non-technical parents.

Use:

- simple wording
- large touch targets
- clear confirmation
- visible status
- minimal forms
- mobile-first layout

Avoid:

- technical OCR wording
- long setup flows
- dense admin dashboards
- unnecessary charts
- confusing academic terminology

Primary CTA should usually be:

```text
Scan School Paper
```

---

# 16. Parent Monitoring Philosophy

Do not design Trackademic as a punishment or surveillance app.

Avoid product language such as:

- catch your child lying
- detect dishonest students
- expose missing work

Prefer:

- stay updated
- keep school records organized
- support learning progress
- reduce miscommunication
- keep evidence in one place

The product must remain useful to the student, not only the parent.

---

# 17. Official Grade Disclaimer

Tracked scores are not automatically official school grades.

UI should clearly distinguish:

```text
Tracked Score Summary
```

from:

```text
Official School Grade
```

Do not claim official grade equivalence unless the school explicitly integrates the system.

---

# 18. MVP Priorities

## P0

Must work:

- authentication
- workspace
- student/guardian linking
- subject setup
- assessment creation
- 5-digit code generation
- scanner
- OCR code detection
- code matching
- evidence upload
- score confirmation
- private storage
- permission checks

## P1

Next:

- teacher verification
- missing evidence
- parent dashboard
- student dashboard
- teacher assessment dashboard

## P2

Later:

- notifications
- trends
- weekly summaries
- native application
- QR codes
- bulk verification
- school admin features

---

# 19. Do Not Overengineer

For every requested feature, ask:

1. Does this support the core evidence workflow?
2. Is it required for MVP?
3. Does it create extra work for teachers?
4. Can it be implemented more simply?
5. Does it introduce risk to child privacy?

If unnecessary, defer it.

---

# 20. Definition of Done

A feature is not complete unless:

- authorization is implemented
- validation is implemented
- loading state exists
- error state exists
- empty state exists
- mobile layout works
- accessibility is reasonable
- data is not publicly exposed
- failure has a fallback
- tests cover critical business logic

For scanner features also test:

- blurry image
- rotated image
- invalid code
- missing code
- wrong code
- multiple 5-digit numbers
- low confidence OCR
- duplicate upload

---

# 21. Testing Priority

The most important technical experiment is:

Can real users handwrite 5-digit codes and have the application identify them reliably?

Create a test set across:

- different handwriting
- different pens
- paper colors
- low light
- shadows
- folded paper
- red teacher markings
- different phone cameras

Target:

```text
90-95%+ reliable assessment-code detection
```

with manual fallback for failures.

---

# 22. Agent Behavior

When implementing tasks:

- inspect existing architecture first
- preserve working functionality
- make the smallest safe change
- do not redesign unrelated screens
- do not invent requirements
- follow the PRD
- explain schema changes
- create migrations for database changes
- never expose secrets
- never hardcode service keys
- update environment examples when adding environment variables
- test before claiming completion

If a user request conflicts with privacy or permission rules, flag the issue and implement the safer equivalent.

---

# 23. Product North Star

The product succeeds when this feels effortless:

> Take a photo of a checked paper and Trackademic knows where it belongs.

Protect that experience.
