# Trackademic PRD
## Role-Based Academic Evidence and Monitoring Platform

**Version:** 0.2  
**Status:** MVP Planning  
**Product Name:** Trackademic  
**Product Type:** Academic evidence inventory, score tracking, and parent monitoring platform  
**Primary Roles:** Student, Parent/Guardian, Teacher  
**Target Users:** Grade 1 to Grade 10 students, their parents/guardians, and teachers  
**Primary Experience:** Mobile-first  
**Recommended Initial Stack:** Laravel + React + TypeScript + PostgreSQL/MySQL, with mobile camera/OCR support

---

# 1. Product Summary

Trackademic is a role-based academic evidence tracking platform that connects Students, Parents/Guardians, and Teachers around the same schoolwork records.

The platform is designed around one central problem:

> Physical quizzes, assignments, activities, projects, and checked papers are often difficult for parents, students, and teachers to track consistently.

Trackademic turns checked school papers into organized digital academic records.

The core workflow is:

```text
Teacher creates assessment
        ↓
System generates 5-digit code
        ↓
Teacher tells students to write the code
        ↓
Student completes the activity
        ↓
Teacher checks the paper
        ↓
Student or Parent uploads/scans the paper
        ↓
OCR detects the 5-digit code
        ↓
System matches the correct assessment folder
        ↓
Score is entered or detected
        ↓
Evidence is stored
        ↓
Teacher may verify
        ↓
Parent and Student see the updated record
```

---

# 2. Product Positioning

Trackademic is NOT a full Learning Management System.

It is primarily:

- an academic evidence inventory
- a schoolwork score tracker
- a parent monitoring tool
- a teacher submission audit tool
- a student proof-of-work archive

The product should avoid unnecessary LMS complexity.

---

# 3. Core Product Principle

Each role has a different responsibility:

```text
STUDENT = Submit
PARENT = Monitor
TEACHER = Organize + Verify
```

The interfaces, navigation, dashboards, and priorities must differ by role.

However, all roles interact with the same underlying academic records.

---

# 4. User Roles

## 4.1 Student

Primary purpose:

> Upload and manage personal academic evidence.

Students should have the simplest interface.

Core actions:

- Upload Score
- Scan School Paper
- Upload Photo
- Enter Assessment Code Manually
- View Scores
- View Subjects
- View Missing Work
- View Evidence History
- View Inbox
- View Teacher Verification Status

Students must never access another student's records.

---

## 4.2 Parent / Guardian

Primary purpose:

> Monitor the academic progress of linked children.

Core actions:

- View Child Dashboard
- View Child's Inbox
- View Teacher Reports
- View Child's Lacking
- View Teacher Reminders
- Scan Paper for Child
- View Scores
- View Academic Records
- Switch Between Linked Children

Parents only see explicitly linked children.

---

## 4.3 Teacher

Primary purpose:

> Organize assessments, manage subject folders, audit submissions, and verify evidence.

Core actions:

- Manage Subject Folders
- Create Assessment
- Generate Assessment Code
- View Submission Audit
- View Verification Queue
- View Missing Students
- Send Teacher Reports
- Send Teacher Reminders
- Verify or Reject Evidence

Teachers should not be forced to manually encode all student scores.

---

# 5. Authentication and Role Selection

After sign-up or login, the user must choose or confirm their role.

Screen title:

**How will you use Trackademic?**

Options:

### Student

`Track your schoolwork, scores, and submitted evidence.`

### Parent / Guardian

`Monitor your child's progress, scores, and missing schoolwork.`

### Teacher

`Create assessments, generate codes, and review student evidence.`

Role selection should determine:

- onboarding flow
- dashboard
- navigation
- permissions
- allowed routes

Role-based access must be enforced in the backend.

---

# 6. Role-Based Onboarding

## 6.1 Student Onboarding

Collect:

- Full Name
- Grade Level
- Section
- School optional
- Student ID optional
- Join Workspace/Class Code

After onboarding:

Route to Student Dashboard.

---

## 6.2 Parent / Guardian Onboarding

Collect:

- Full Name
- Relationship to Student
- Link Existing Student
or
- Create Child Profile

Parent should eventually support multiple children.

After onboarding:

Route to Parent Dashboard.

---

## 6.3 Teacher Onboarding

Collect:

- Full Name
- School optional
- Subject(s)
- Create Workspace/Class
or
- Join Existing Workspace/Class

After onboarding:

Route to Teacher Dashboard.

---

# 7. Shared Academic Data Model

All roles must use the same shared academic records.

Example:

Teacher creates:

```text
Subject: Mathematics
Assessment: Quiz 4
Quarter: Q1
Total Score: 30
Code: 51819
```

Student uploads:

```text
Code: 51819
Score: 22/30
Evidence: Photo uploaded
```

Parent sees:

```text
Mathematics Quiz 4
22/30
Uploaded
```

Teacher sees:

```text
Jake Engaña
Mathematics Quiz 4
22/30
Needs Verification
```

Teacher verifies.

Student and Parent then see:

```text
Teacher Verified
```

---

# 8. Student Feature Requirements

## 8.1 Student Dashboard

The Student dashboard should focus on personal academic progress.

Show:

- Greeting
- Student Name
- Grade and Section
- Main Upload Score CTA
- New Scores
- Missing Work
- Pending Teacher Verification
- Recent Activity
- Subject Summary

Example:

```text
Good Afternoon, Jake

New Scores: 4
Missing: 2
Pending Verification: 3
```

---

## 8.2 Upload Score

This is the primary Student feature.

Flow:

```text
Upload Score
    ↓
Take Photo / Upload Photo
    ↓
OCR Detects Code
    ↓
Match Assessment
    ↓
Detect or Enter Score
    ↓
Confirm
    ↓
Save Evidence
```

Target:

3 to 4 taps where possible.

---

## 8.3 Manual Assessment Code Entry

If OCR fails:

```text
Enter the 5-digit code written on your paper
```

Example:

`51819`

The app should validate the code against active assessments.

---

## 8.4 My Scores

Show:

- Assessment
- Subject
- Score
- Total Score
- Percentage
- Date
- Verification Status

Example:

```text
Math Quiz 4
22/30
Teacher Verified
```

---

## 8.5 My Subjects

Show subject folders.

Example:

```text
Mathematics
8 Records
1 Missing

Science
11 Records
Complete
```

---

## 8.6 My Lacking

Show incomplete requirements.

Possible statuses:

- No Evidence
- Missing
- Due Soon
- Needs Resubmission

Language should remain supportive.

Example:

`You have 2 things to complete.`

---

## 8.7 Student Inbox

Contains:

- teacher reminders
- verification results
- rejected uploads
- assessment announcements
- parent-linked notifications if enabled

---

## 8.8 My Evidence

Digital archive of uploaded schoolwork.

Each record contains:

- photo
- assessment
- score
- upload date
- uploaded by
- status
- teacher verification

---

# 9. Parent / Guardian Feature Requirements

## 9.1 Parent Dashboard

Primary purpose:

Quickly understand the child's current academic status.

Show:

- Child Selector
- Current Quarter
- Grade and Section
- New Scores
- Missing Evidence
- Needs Attention
- Pending Verification
- Recent Records

Example:

```text
Viewing: Jake Engaña

New Scores: 4
Missing Evidence: 2
Needs Attention: 1
```

---

# 10. Child's Inbox

A central inbox for the child's academic updates.

Possible items:

- new checked quiz
- new assignment score
- teacher verification
- teacher report
- missing requirement
- rejected evidence
- reminder
- project update

Example:

```text
Mathematics Quiz 4 received
22/30
Waiting for Teacher Verification
```

Inbox items should support:

- Read
- Unread
- Archived

---

# 11. Teacher's Report

Teachers can send structured academic reports to parents.

Report categories:

- Good Progress
- Needs Improvement
- Missing Requirements
- Participation
- General Note

Each report includes:

- Teacher
- Subject
- Student
- Message
- Date
- Academic Period

Example:

```text
Ms. Santos
Mathematics

Jake is improving in fractions but needs more practice with word problems.
```

Teacher Reports should be visible to:

- linked Parent/Guardian
- Student, if appropriate and enabled

---

# 12. Child's Lacking

A dedicated Parent feature for incomplete schoolwork.

Organize by:

- Subject
- Quarter
- Assessment Type

Possible statuses:

- Missing
- No Evidence
- Due Soon
- Needs Resubmission
- Awaiting Student Upload

Example:

```text
MATHEMATICS

Assignment 5
No Evidence

Quiz 3
No Uploaded Score
```

This should be one of the most important Parent screens.

---

# 13. Teacher's Reminder

Teachers can send reminders to:

- individual student
- selected students
- whole class

Examples:

```text
Bring Science activity tomorrow.
```

```text
Math Project is due Friday.
```

Parent actions:

- Mark as Read
- Remind Me Later

Student should also receive relevant reminders.

---

# 14. Scan for Child

Parents can upload schoolwork on behalf of a younger student.

Flow:

```text
Choose Child
    ↓
Take Photo
    ↓
Detect Code
    ↓
Match Assessment
    ↓
Enter/Confirm Score
    ↓
Save
```

This feature is important for Grade 1 to Grade 4 students who may not own or use phones independently.

---

# 15. Parent Academic Records

Parents should see a complete archive for each linked child.

Filters:

- Subject
- Quarter
- Assessment Type
- Verification Status
- Date

Record types:

- Quizzes
- Assignments
- Activities
- Projects
- Exams
- Performance Tasks
- Other

---

# 16. Teacher Feature Requirements

## 16.1 Teacher Dashboard

Show:

- Teacher Name
- Active Class/Subject
- Today's Assessments
- Active Assessment Codes
- Submissions Today
- Missing Students
- Evidence Waiting for Review

Example:

```text
Math Quiz 4
Code: 51819

28 Students
24 Submitted
3 Missing
1 Needs Review
```

---

# 17. Subject Folders

Teachers manage academic records through structured Subject Folders.

Example:

```text
Mathematics
├── Q1
│   ├── Quizzes
│   ├── Assignments
│   ├── Activities
│   └── Projects
│
└── Q2
```

Inside an assessment:

```text
Quiz 4
Code: 51819
Total: 30

Jake      22/30   Verified
Maria     27/30   Verified
Carlo     --      No Evidence
Ana       18/30   Needs Review
```

Subject Folders should be one of the primary Teacher navigation areas.

---

# 18. Create Assessment

Teacher inputs:

- Subject
- Quarter
- Semester optional
- Assessment Type
- Title
- Total Score
- Assessment Date
- Due Date optional
- Instructions optional

After saving, system generates a unique 5-digit code.

Example:

`51819`

Display:

**Today's Trackademic Code**

`51819`

Instruction:

`Ask students to write this code clearly on the upper-right corner of their paper.`

---

# 19. Assessment Code System

The 5-digit code is a routing identifier.

It is NOT:

- authentication
- proof of submission
- proof of verification
- proof of authenticity

Example:

```text
51819
→ Teacher: Ms. Santos
→ Subject: Mathematics
→ Quarter: Q1
→ Assessment: Quiz 4
→ Total Score: 30
```

Requirements:

- numeric only
- 5 digits
- randomly generated
- unique among active assessments
- validated in backend
- archived after academic period when appropriate

---

# 20. Submission Audit

A core Teacher feature.

Purpose:

Track what happened to each submitted piece of evidence.

Show:

- Student
- Assessment
- Uploaded At
- Uploaded By
- Score
- Evidence
- Current Status
- Verification Date
- Last Updated
- Audit History

Example:

```text
Jake Engaña
Math Quiz 4

Uploaded: Oct 5, 4:23 PM
Uploaded By: Student
Score: 22/30
Status: Teacher Verified
```

Potential audit events:

- uploaded
- code matched
- score edited
- evidence replaced
- teacher verified
- rejected
- reassigned

---

# 21. Verification Queue

Teacher can review submitted evidence.

Show:

- Student
- Assessment
- Score
- Evidence Thumbnail
- Upload Time
- Uploaded By

Actions:

- Verify
- Reject
- Flag
- View Paper
- Correct Score
- Correct Assessment

Verification status must be visible to Student and Parent.

---

# 22. Missing Students

For each assessment, teacher should see students with no evidence.

Example:

```text
Math Quiz 4

No Evidence:
- Carlo
- Mark
- Angela
```

Teacher may:

- send reminder
- exempt student
- mark not required
- leave as missing

---

# 23. Teacher Reports

Teacher can create reports for:

- individual student
- optionally whole class in future

Fields:

- Student
- Subject
- Category
- Report Message
- Academic Period
- Date

Reports should appear in Parent's Teacher Report feature.

---

# 24. Teacher Reminders

Teacher can create reminders for:

- individual student
- selected students
- whole class

Fields:

- Message
- Student/Class
- Subject optional
- Due Date optional
- Reminder Date

Reminders appear in:

- Parent Teacher's Reminder
- Student Inbox

---

# 25. Role-Based Navigation

## Student

```text
Home
Subjects
Upload
Records
Profile
```

Primary center action:

`Upload Score`

---

## Parent

```text
Dashboard
Child
Scan
Inbox
Profile
```

Important secondary screens:

- Child's Lacking
- Teacher's Report
- Teacher's Reminder
- Records

---

## Teacher

```text
Dashboard
Subjects
Create
Audit
Profile
```

Important secondary screens:

- Verification Queue
- Missing Students
- Reports
- Reminders

---

# 26. OCR and Scanning

Primary OCR target:

1. 5-digit assessment code
2. score
3. total score

The system should not attempt full-document understanding in MVP.

Recommended workflow:

```text
Capture Image
    ↓
Crop / Enhance
    ↓
OCR Upper-Right Region
    ↓
Detect 5-Digit Candidate
    ↓
Validate Against Database
    ↓
Match Assessment
```

If no valid code is detected:

- Enter Code Manually
- Choose Assessment
- Retake Photo

OCR must never be the only way to submit evidence.

---

# 27. Evidence Statuses

Recommended statuses:

```text
DRAFT
UPLOADED
CODE_MATCHED
NEEDS_REVIEW
TEACHER_VERIFIED
REJECTED
MISSING
EXEMPT
```

Important:

`UPLOADED` does not mean `TEACHER_VERIFIED`.

---

# 28. Evidence Record

Each Evidence record should include:

```text
id
student_id
assessment_id
uploaded_by_user_id
image_path
detected_code
ocr_text
ocr_confidence
score
total_score
status
uploaded_at
verified_by
verified_at
notes
```

---

# 29. Workspace Structure

Recommended structure:

```text
Workspace
├── Teachers
├── Students
├── Guardians
├── Subjects
├── Academic Periods
├── Assessments
├── Reports
└── Reminders
```

A user may participate in multiple workspaces later.

---

# 30. Academic Structure

Flexible hierarchy:

```text
School Year
└── Semester optional
    └── Quarter
        └── Subject
            └── Assessment
```

Supported assessment types:

- Quiz
- Assignment
- Activity
- Project
- Exam
- Performance Task
- Seatwork
- Homework
- Recitation
- Laboratory Activity
- Other

---

# 31. Suggested Data Model

## users

```text
id
name
email
password
primary_role
created_at
updated_at
```

## workspaces

```text
id
name
type
created_by
created_at
```

## workspace_members

```text
id
workspace_id
user_id
role
status
```

## student_profiles

```text
id
user_id
grade_level
section
school_name
student_number
```

## guardian_student_links

```text
id
guardian_user_id
student_user_id
workspace_id
relationship
status
```

## academic_periods

```text
id
workspace_id
school_year
semester
quarter
start_date
end_date
status
```

## subjects

```text
id
workspace_id
name
teacher_user_id
academic_period_id
```

## subject_students

```text
id
subject_id
student_user_id
status
```

## assessments

```text
id
subject_id
teacher_user_id
title
type
assessment_code
total_score
assessment_date
due_date
status
created_at
```

## evidence

```text
id
assessment_id
student_user_id
uploaded_by_user_id
image_path
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

## teacher_reports

```text
id
teacher_user_id
student_user_id
subject_id
category
message
academic_period_id
created_at
```

## reminders

```text
id
teacher_user_id
subject_id
student_user_id nullable
workspace_id
message
due_date
created_at
```

## notifications

```text
id
user_id
type
title
message
reference_id
read_at
created_at
```

## audit_logs

```text
id
user_id
action
entity_type
entity_id
metadata_json
created_at
```

---

# 32. API Requirements

## Auth

```text
POST /auth/register
POST /auth/login
POST /auth/logout
```

---

## Role

```text
POST /profile/role
GET  /profile
```

---

## Students

```text
GET  /students/:id
GET  /students/:id/scores
GET  /students/:id/lacking
GET  /students/:id/inbox
GET  /students/:id/records
```

---

## Guardians

```text
GET  /guardians/:id/children
POST /guardian-links
DELETE /guardian-links/:id
```

---

## Subjects

```text
POST /subjects
GET  /subjects
GET  /subjects/:id
GET  /subjects/:id/assessments
GET  /subjects/:id/students
```

---

## Assessments

```text
POST /assessments
GET  /assessments/:id
GET  /assessments/code/:code
PATCH /assessments/:id
POST /assessments/:id/archive
GET  /assessments/:id/missing-students
```

---

## Evidence

```text
POST /evidence/scan
POST /evidence
GET  /evidence/:id
PATCH /evidence/:id
POST /evidence/:id/verify
POST /evidence/:id/reject
```

---

## Teacher Reports

```text
POST /teacher-reports
GET  /students/:id/teacher-reports
```

---

## Reminders

```text
POST /reminders
GET  /students/:id/reminders
GET  /guardians/:id/reminders
```

---

## Submission Audit

```text
GET /assessments/:id/audit
GET /students/:id/audit
```

---

# 33. Permission Rules

## Student

Can:

- view own records
- upload own evidence
- edit own unverified drafts
- view own inbox

Cannot:

- access another student's records
- verify evidence
- create teacher assessments

---

## Parent

Can:

- view linked children only
- scan/upload for linked child
- view linked child's scores
- view linked child's lacking items
- view reports/reminders

Cannot:

- access unrelated children
- verify evidence
- create teacher assessments

---

## Teacher

Can:

- manage assigned subjects
- create assessments
- view students in assigned subjects
- verify evidence in assigned subjects
- send reports/reminders

Cannot:

- access unrelated classes/subjects
- access unrelated student records

---

# 34. Security Requirements

Because Trackademic handles minors:

- all evidence images private by default
- authorization on every sensitive endpoint
- no predictable public file URLs
- audit sensitive actions
- secure session handling
- password hashing
- CSRF protection where applicable
- input validation
- file type validation
- image size limits
- rate limiting for sensitive endpoints
- account deletion support
- data deletion support
- minimum necessary student data

---

# 35. Recommended Tech Stack

## Backend

- Laravel
- PHP 8+
- Laravel Sanctum
- Laravel Policies/Gates
- Laravel Storage
- Laravel Notifications

## Frontend

- React
- TypeScript
- Inertia.js or API-based architecture
- Tailwind CSS
- Vite

## Database

Preferred:

- PostgreSQL

Alternative:

- MySQL

## OCR

Prototype options:

- Tesseract OCR
- PaddleOCR

Mobile/future:

- Google ML Kit Text Recognition

## File Storage

MVP:

- Laravel private storage

Production options:

- S3
- Cloudflare R2
- other S3-compatible object storage

---

# 36. UX Design Principles

Use one shared visual system across all roles.

Recommended style:

- white / soft lavender background
- deep navy or dark purple primary surfaces
- purple accent
- minimal icons
- rounded cards
- clean typography
- mobile-first spacing

However, role hierarchy must differ.

Student:

- simple
- action-oriented
- upload-focused

Parent:

- monitoring
- summary-focused
- attention-focused

Teacher:

- management
- audit-focused
- folder-based

---

# 37. Parent UX Priority

The Parent dashboard should answer:

1. How is my child doing?
2. What is missing?
3. What did the teacher say?
4. Is there anything I need to act on?
5. What are the latest scores?

Avoid unnecessary school administration features.

---

# 38. Teacher UX Priority

The Teacher dashboard should answer:

1. What assessments are active?
2. What code should students use?
3. Who has submitted evidence?
4. Who is missing?
5. What needs verification?
6. What reports/reminders should I send?

---

# 39. Student UX Priority

The Student app should answer:

1. How do I upload my score?
2. What scores do I have?
3. What am I missing?
4. Has my teacher verified my work?
5. Can I prove that I submitted or completed something?

---

# 40. MVP Scope

## P0

Must Build:

- authentication
- role selection
- role-based routing
- student profile
- guardian-child linking
- teacher workspace
- subject folders
- create assessment
- generate 5-digit code
- upload/scan evidence
- manual code fallback
- score entry
- evidence storage
- parent child dashboard
- teacher verification
- submission audit basic history

---

## P1

Next:

- Child's Inbox
- Child's Lacking
- Teacher Reports
- Teacher Reminders
- Missing Students
- Verification Queue enhancements
- Notifications

---

## P2

Later:

- push notifications
- multiple school accounts
- school admin role
- QR codes
- printable teacher code labels
- bulk verification
- advanced analytics
- grade trends
- weekly parent digest
- official SIS/LMS integration
- native mobile application if web-first

---

# 41. Core End-to-End MVP Scenario

The MVP is successful when this flow works:

### Teacher

1. Logs in.
2. Creates Mathematics Quiz 4.
3. Sets total score to 30.
4. Receives code `51819`.
5. Tells students to write `51819`.

### Student

6. Completes the quiz.
7. Teacher writes `22/30`.
8. Student uploads the paper.
9. Trackademic detects `51819`.
10. System matches Mathematics Quiz 4.
11. Student confirms `22/30`.
12. Evidence is saved.

### Parent

13. Parent opens dashboard.
14. Parent sees `Math Quiz 4 - 22/30`.
15. Parent sees status `Awaiting Teacher Verification`.

### Teacher

16. Teacher sees Jake in Submission Audit.
17. Teacher opens evidence.
18. Teacher verifies the record.

### Student and Parent

19. Both see status:

`Teacher Verified`

This shared lifecycle is the core product.

---

# 42. MVP Success Metrics

Track:

- first assessment created
- assessment codes generated
- evidence uploads per student
- OCR code detection success rate
- manual fallback usage
- teacher verification rate
- parent weekly activity
- missing evidence resolved
- average upload time
- duplicate upload rate

---

# 43. Primary Technical Risks

## OCR Reliability

Handwriting varies.

Mitigation:

- 5 numeric digits only
- fixed upper-right placement
- write code inside a box
- manual fallback
- database validation

## Teacher Adoption

Avoid additional workload.

Teacher should mainly:

```text
Create Assessment
→ Share Code
→ Optionally Verify
```

## Minor Privacy

Strict permission model is mandatory.

## Fake Evidence

Do not equate uploaded evidence with verified evidence.

## Storage Cost

Compress images and use thumbnails.

## Role Confusion

Do not reuse one generic dashboard for all roles.

Role-based routes and permissions are required.

---

# 44. North Star

Trackademic succeeds when:

> Students can easily submit academic evidence, parents can clearly monitor progress, and teachers can organize and verify schoolwork without creating unnecessary extra work.

The product should always preserve this alignment:

```text
Student submits
Parent monitors
Teacher organizes and verifies
```
