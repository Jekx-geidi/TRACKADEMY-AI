# Plan: PRD v0.3 + v0.5 — Class Workspace, Teacher UX, Verification, Notifications

Sources, shared in chat and not saved in the repo:
- "Trackademy PRD v0.3 — Class Workspace" (2026-10-06)
- "Trackademy PRD v0.5 — Teacher Navigation, Visual Analytics, Communication, and Simplified UX" (2026-10-06)
- "Trackademy PRD v0.7 — Student Experience and UX" (2026-10-07)

Decisions (2026-10-06):
- **Backend stays Supabase** (Postgres + RLS + SECURITY DEFINER functions + private storage), not the Laravel stack the PRD suggests. Every PRD authorization rule becomes an RLS policy or a function check.
- **Product name stays "Trackademic"**, not "Trackademy".
- **Git** was initialised on 2026-10-06. The user pushes to GitHub; tasks are committed locally.

Each task is one vertical slice: migration → API → UI, plus tests.
- Database rules are tested against the **local** Supabase with `npm run test:db`. That needs `supabase start`, and it never touches the hosted project.
- Pure logic is tested with `npm test`.
- Every migration still has to be pushed to the hosted project by the user (`supabase db push --linked`).

## Phase V — PRD v0.5 Teacher UX (2026-10-06, supersedes v0.3 T2–T9 for teachers)

The teacher app has exactly five tabs: **Dashboard · Sections · Notifications · Students · Profile**.
- A "Section" is the v0.3 Class Workspace, stored in the `classes` table.
- Completion: submitted ÷ required students × 100. Exempt students are not counted as required.
- Status bands: 0% Not Started, 1–79% Needs Attention, 80–99% Almost Complete, 100% Complete. A text label is always shown with the colour.
- Lists page 20 rows at a time.

- [x] **V1 Backend: sections, subjects, assessments in subjects.**
  - Section description and membership status (active, inactive, removed).
  - `subjects` table.
  - New assessment fields: subject, assessment date, due date, instructions.
  - Exemptions.
  - Filing-code lookup and evidence creation are scoped to the section's members (closes the "any user can look up any code" gap).
  - Teachers can read evidence photos for their own assessments.
  - Absorbs v0.3 T2, T5 and T6.
- [x] **V2 Backend: verification and audit trail.** Verify, reject (with a reason), correct a score and exempt; every action goes into `audit_logs`. Absorbs v0.3 T8.
- [x] **V3 Backend: notifications, reminders and reports.**
  - Events: submission created, verified and rejected; student joined; reminder; report.
  - Pass, Pending and Overdue are derived from the evidence and the due dates.
  - Absorbs v0.3 T9, T12 and T13.
- [x] **V4 Backend: teacher lists and analytics.**
  - Lists: sections, section overview, subject assessments with completion, assessment students, and teacher students. Each has search, filters, sort and paging.
  - Dashboard overview and analytics.
  - Move, remove and mark inactive for students.
  - Teacher info on the profile.
- [x] **V5 Teacher shell and Sections.**
  - The five tabs.
  - Sections list.
  - Create Section, with the join code and an invite link.
  - `/join/:code` with confirmation.
  - Section workspace (Overview | Subjects | Students).
  - Subject workspace and assessment categories.
  - Create Assessment.
  - Assessment detail with the student submission list, View Evidence, Verify, Reject, Correct Score, Exempt and Send Reminder.
- [x] **V6 Notifications.** The teacher action center (All | Pass | Pending | Overdue, filters, mark read, archive, send reminder or report), plus the student and parent inbox.
- [x] **V7 Students.** List across sections; student detail with submissions, missing work, reports and reminders; edit, move, remove and mark inactive.
- [x] **V8 Dashboard.** Overview (status cards, Needs Attention, quick access, recent updates) and Analytics (section donuts, a Submission | Verification switch, subject analytics, drill-down).
- [x] **V9 Profile basics.** Account plus teacher information: school, department and teaching subjects.

**Status (2026-10-06):**
- **Built:** V1–V9.
- **Migrations:** `20261006010000_sections_subjects`, `20261006020000_verification_notifications`, `20261006030000_teacher_lists_analytics` and `20261006040000_teacher_followups`.
- **Database tests:** 62 (`npm run test:db`).
- **Browser:** checked end-to-end on the local stack.
- **Not on the hosted project yet:** `supabase db push --linked`.

**Known limits:**
- Filter dropdowns list only the first 20 sections.
- The Overdue view is computed from due dates, so it has no stored notifications.
- Teachers can't edit a student's name yet.
- Theme and Language preferences aren't built.
- The default school year is a per-device setting only.

## Phase S — PRD v0.7 Student UX (2026-10-07, supersedes v0.3 T10–T11 for students)

The student app has exactly five tabs: **Dashboard · Classes · Upload · Notifications · Profile**.
- Scores, subjects, records, lacking work and the inbox live inside those five.
- Student statuses, always as words: Teacher Verified, Awaiting Verification, Needs Resubmission, Missing, Overdue, Excused.
- A rejected paper counts as Needs Resubmission until a new one is uploaded.

- [x] **S1 Backend.** `20261007000000_student_experience`:
  - `student_work`: My Work, My Lacking and My Records, with search, filters and paging.
  - `student_classes`, `student_subjects`, `student_dashboard` and `student_record`.
  - Names-only `class_classmates`; the teacher can hide them with `set_classmates_visible`.
  - `leave_class`, `my_guardians` and `new_my_link_code`.
  - New notifications: ASSESSMENT_CREATED and CLASS_JOINED for the student, STUDENT_LEFT for the teacher.
  - Students and parents can open the photos of the student's own papers.
- [ ] **S2 Dashboard and Upload.**
  - Dashboard: header, the Upload Score call to action, New Scores / Missing / Pending, Needs Attention and Recent Scores.
  - Upload: Confirm & Submit, a "Submitted" screen, and Upload Now from a missing item.
- [ ] **S3 Classes.** My Classes and Join; the class workspace (Overview | Subjects | My Work, Class Members by name only); subject detail by category; My Work / My Lacking / My Records; record detail.
- [ ] **S4 Notifications and Profile.**
  - Notifications: All | Teacher | Verified | Missing | Class, with filters, paging, mark read and archive.
  - Profile: student information, My Classes with Leave, guardians and the parent link code.

## Phase A — Class Workspace (PRD v0.3 P0)

### T1. Class Workspace details and a 6-digit class join code — DONE 2026-10-06
PRD §7, §9.1, §16.
- [x] A teacher creates a workspace with these fields:
  - grade level (1–10)
  - section
  - school year (`2026-2027`)
  - school name (optional)
  - adviser name (optional)

  The class name is built from them, e.g. "Grade 7 - St. Mark".
- [x] The server generates a **6-digit numeric** join code, unique among classes. Existing letter codes (e.g. `DEMO55`) keep working.
- [x] Only teachers can create one. Each field is validated by the server, and the form shows the same rules.
- [x] Students and teachers can join with the new numeric codes; the input no longer rejects 0 and 1.
- [x] Tests:
  - db: creation, code format, validation, role check.
  - unit: form schema and class code schema.
- Notes:
  - Migration `20261006000000_class_workspaces.sql`; tests in `apps/mobile/db-tests/classWorkspace.test.ts` and `src/features/classes/__tests__/schema.test.ts`. The teacher setup screen has the new form.
  - **Not yet on the hosted project:** `supabase db push --linked`.
  - Noticed, not fixed (outside T1): in dev, React StrictMode can call `ensure_my_student_profile` twice at once. One call then fails with 409 (duplicate student profile). The screen still works, because the cancelled call's error is ignored. Make the function race-safe (`on conflict do nothing` + re-select) in a later task.

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
