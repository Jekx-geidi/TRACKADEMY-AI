# Plan: PRD v0.3 — Class Workspace, Subject Folders, Verification, Parent Monitoring

Source: "Trackademy PRD v0.3 — Class Workspace" (shared in chat on 2026-10-06; not saved in the repo).

Decisions (2026-10-06):
- **Backend stays Supabase** (Postgres + RLS + SECURITY DEFINER functions + private storage), not the Laravel stack the PRD suggests. Every PRD authorization rule becomes an RLS policy or a function check.
- **Product name stays "Trackademic"**, not "Trackademy".
- **No git yet.** The user will initialise it after this work, so tasks are not committed one by one.

Each task is one vertical slice: migration → API → UI, plus tests.
- Database rules are tested against the **local** Supabase with `npm run test:db`. That needs `supabase start`, and it never touches the hosted project.
- Pure logic is tested with `npm test`.
- Every migration still has to be pushed to the hosted project by the user (`supabase db push --linked`).

## Phase A — Class Workspace (PRD P0)

### T1. Class Workspace details and a 6-digit class join code — IN PROGRESS
PRD §7, §9.1, §16.
- [ ] A teacher creates a workspace with these fields:
  - grade level (1–10)
  - section
  - school year (`2026-2027`)
  - school name (optional)
  - adviser name (optional)

  The class name is built from them, e.g. "Grade 7 - St. Mark".
- [ ] The server generates a **6-digit numeric** join code, unique among classes. Existing letter codes (e.g. `DEMO55`) keep working.
- [ ] Only teachers can create one. Each field is validated by the server, and the form shows the same rules.
- [ ] Students and teachers can join with the new numeric codes; the input no longer rejects 0 and 1.
- [ ] Tests:
  - db: creation, code format, validation, role check.
  - unit: form schema and class code schema.

### T2. Join a class with confirmation
PRD §9.3.
- [ ] `preview_class(code)` returns the class name, grade, section, school year and teacher name, and nothing else.
- [ ] The student enters a code, sees the class, then chooses **Join Class** or **Cancel**. Setup and a "Join a Class" action both use this flow.
- [ ] Tests:
  - db: preview by code, unknown code, no member data leaked.
  - unit: code input normalisation.

### T3. Teacher "My Classes" and the Class Workspace page
PRD §8.
- [ ] `/teacher/classes` lists the teacher's classes and has **+ Create Class Workspace**.
- [ ] `/teacher/classes/:id` shows the class header, student count, the join code (copyable) and the actions.
- [ ] Teacher Home links to My Classes.
- [ ] Tests:
  - db: a teacher sees only classes they belong to.
  - e2e: create a class, then open it.

### T4. Class roster and classmate privacy
PRD §10, §11, §37.
- [ ] The teacher sees the student roster.
- [ ] A student sees classmates' **names only**, each marked "Locked".
- [ ] Opening a classmate shows the "Private Student Record" notice.
- [ ] Teacher actions: remove a student, mark a student inactive.
- [ ] Tests:
  - db: a student can read classmates' names but none of their evidence, link codes or profile rows.
  - db: a non-member reads nothing.

### T5. Subjects inside a class
PRD §12.
- [ ] A `subjects` table: class, teacher, name, optional code, optional description.
- [ ] Teachers of the class create subjects. Class members can read them.
- [ ] The class page and the student's class view list the subjects.
- [ ] Tests:
  - db: create, read, and isolation between classes.

### T6. Assessments belong to a subject; subject folders
PRD §13, §14, §15, §20, §21.
- [ ] `assessments.subject_id`. The old free-text `subject` stays for existing rows.
- [ ] An assessment is created from inside a subject. The 5-digit filing code stays.
- [ ] Students in the class can read their class's assessments, but only their own evidence.
- [ ] The subject folder view groups assessments by Quarter → Type, with the student's own score and status.
- [ ] Tests:
  - db: a student reads assessments of their own class only.
  - unit: the folder grouping.

### T7. Teacher assessment view: every student × status
PRD §32, §35.
- [ ] For one assessment, list every student in the class with their score and status, or "No Evidence".
- [ ] Teachers read evidence for assessments in their own classes.
- [ ] Tests:
  - db: the teacher sees all students in their class and none from other classes.
  - unit: the status merge.

### T8. Teacher verification and audit trail
PRD §33, §34.
- [ ] `verify_evidence` and `reject_evidence(reason)` are teacher-only for their own assessments. Each records who and when.
- [ ] The `EXEMPT` status.
- [ ] An `audit_logs` table, written by the functions for: create, verify, reject and score change.
- [ ] The UI shows verify and reject buttons in the assessment view. Students and parents see the status change.
- [ ] Tests:
  - db: only the owning teacher can verify; an upload is never verified by itself; every action is logged.

### T9. Notifications and inbox
PRD §23, §26, §30, §31.
- [ ] A `notifications` table that each user reads only for themselves.
- [ ] Notifications are written by the server functions:
  - SUBMISSION_CREATED goes to the student, their guardians and the teacher.
  - SUBMISSION_VERIFIED and SUBMISSION_REJECTED go to the student and their guardians.
- [ ] Inbox screens: the Student Inbox, the Parent Inbox (replacing the placeholder) and Teacher notifications. Each has mark-read and read-all.
- [ ] Tests:
  - db: the right recipients get each notification; nobody reads someone else's.

### T10. Parent child dashboard
PRD §25.
- [ ] `/parent` shows the children with their classes.
- [ ] The child dashboard shows new scores, missing work, and reminder and report counts.
- [ ] Tests:
  - db: a parent sees linked children only.

## Phase B — PRD P1

- **T11. My Lacking / Child's Lacking** (PRD §22, §27). Class assessments with no evidence, filterable by subject, quarter, type and status.
- **T12. Teacher reminders** (PRD §29). Sent to the whole class, selected students or one student. Each reminder creates a notification for the students and their guardians.
- **T13. Teacher reports** (PRD §28). Categorised notes about one student, visible to that student's guardians and the student.
- **T14. Missing students actions** (PRD §35). Send a reminder, exempt, or mark not required.

## Not planned yet (PRD P2)

- Push notifications
- QR codes and printable labels
- Bulk verification
- Weekly digest
- School admin role
- SIS/LMS integration
- Analytics
