# Trackademic PRD
## Product Requirements Document

**Version:** 0.1  
**Status:** MVP Planning  
**Product Name:** Trackademic  
**Product Type:** Student academic evidence, score tracking, and parent monitoring app  
**Primary Users:** Students, Parents/Guardians, Teachers  
**Target Age Group:** Grade 1 to Grade 10 students  
**Initial Platform Recommendation:** Mobile-first web app / PWA, with optional native mobile app later

---

# 1. Product Summary

Trackademic is a schoolwork monitoring and academic evidence app designed for students, parents, and teachers.

The product allows checked school papers such as quizzes, assignments, activities, projects, and other graded work to be photographed and automatically stored in the correct academic folder using a short assessment code.

Example:

A teacher creates or announces an assessment code:

`55922`

Before the activity starts, the teacher tells the class:

> "Write 55922 clearly on the upper-right corner of your paper for Trackademic."

After the teacher checks the paper and writes the score, the student or parent opens Trackademic and takes a photo of the paper.

The system detects the code `55922`, finds the correct assessment record, reads or suggests the score, and asks the user:

> Put this in Math > First Quarter > Quiz 4?

The image then becomes part of the student's academic record.

The main goal is to create a simple, evidence-based academic monitoring system that helps students, parents, and teachers stay aligned.

---

# 2. Problem Statement

Parents often do not have continuous visibility into their child's academic progress.

Common questions include:

- "Did you submit your project?"
- "What was your quiz score?"
- "Do you have missing assignments?"
- "Are you sure your teacher already checked this?"
- "Why did your grade suddenly drop?"
- "What schoolwork is still incomplete?"

Students may forget their results, lose papers, misunderstand deadlines, or fail to communicate their academic progress to their parents.

Teachers may also have difficulty confirming whether students have retained copies or evidence of previously checked work.

Existing learning management systems often require schools to fully adopt the system, while many students still rely heavily on physical paper.

Trackademic focuses on the gap between:

**physical schoolwork** and **digital academic tracking**.

---

# 3. Product Vision

Create a simple academic evidence system where every important checked school paper can become a searchable, categorized digital record.

The product should make this action simple:

**Take a photo of the paper -> detect the assessment code -> route it to the correct subject and activity -> save the score and evidence.**

---

# 4. Product Goals

## 4.1 Primary Goals

1. Allow parents to monitor a child's school performance without manually recording every score.
2. Allow students to keep a digital record of their checked schoolwork.
3. Allow teachers to create simple routing codes for assessments.
4. Automatically categorize scanned school papers.
5. Track quizzes, assignments, projects, activities, exams, and other schoolwork per quarter or semester.
6. Show missing, pending, submitted, checked, and verified schoolwork.
7. Reduce dependence on students verbally reporting their academic progress.

## 4.2 Secondary Goals

1. Help students prove that work was completed or checked.
2. Build a searchable archive of school evidence.
3. Allow multiple guardians or teachers to participate in one academic workspace.
4. Provide basic performance summaries over time.
5. Support younger students who do not own smartphones.

---

# 5. Non-Goals for MVP

The MVP should NOT become a full LMS.

The following are not required for the first version:

- Full online classroom
- Video lessons
- Student chat
- Teacher-parent messaging
- Attendance system
- Full grade computation for official report cards
- AI tutor
- Homework answer generation
- School enrollment system
- Payment system
- Full SIS integration
- Complex school administration features

These can be considered later.

---

# 6. User Roles

## 6.1 Student

A Student can:

- Join a workspace or class
- View assigned assessments
- Scan or upload school papers
- View detected assessment information
- Confirm or edit detected scores
- Save records as draft
- View personal academic history
- View missing work
- View subject performance
- See parent/teacher verification status

For younger students, this role may be managed primarily by the parent.

---

## 6.2 Parent / Guardian

A Parent or Guardian can:

- Create or join a family/student workspace
- Link to one or more students
- Scan papers on behalf of a child
- View all academic evidence for linked students
- View new scores
- View missing or pending work
- View subject summaries
- View quarter/semester progress
- Receive optional alerts
- Add notes
- Confirm student details before saving uploads

A guardian must only see students they are explicitly linked to.

---

## 6.3 Teacher

A Teacher can:

- Join or create a class/workspace
- Create subjects
- Create assessments
- Generate a unique short assessment code
- Announce the code to students
- View submitted evidence for assessments they own
- Confirm assessment details
- Optionally verify a student's uploaded paper
- View class submission status
- View which students do not yet have evidence

A Teacher should not be required to manually upload every student's paper.

---

# 7. Workspace Model

The app should use a workspace-based permission model.

A workspace may represent:

- a class
- a section
- a family academic space
- a teacher-managed subject group

Recommended MVP structure:

```text
Workspace
├── Teachers
├── Students
├── Guardians
├── Subjects
├── Academic Periods
└── Assessments
```

Example:

```text
Grade 5 - Section A
├── Teacher: Ms. Santos
├── Student: Jake Engaña
├── Guardian: Maria Engaña
├── Mathematics
├── Science
└── English
```

A parent should only see data for the child or children they are linked to.

---

# 8. Academic Structure

The system should support flexible academic periods.

## Recommended hierarchy

```text
School Year
└── Semester or Term
    └── Quarter
        └── Subject
            └── Assessment
```

Example:

```text
School Year 2026-2027
└── First Semester
    └── First Quarter
        └── Mathematics
            ├── Quiz 1
            ├── Assignment 1
            ├── Activity 1
            └── Project 1
```

The platform must allow schools or users to disable semesters if they use quarters only.

---

# 9. Assessment Types

Default assessment types:

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

Teachers should also be able to create a custom type later.

---

# 10. Assessment Code System

## 10.1 Purpose

The assessment code is primarily a routing and inventory identifier.

It is NOT proof that the paper is authentic.

Example:

`55922`

The code tells Trackademic:

```text
55922
-> Teacher: Ms. Santos
-> Subject: Mathematics
-> Quarter: First Quarter
-> Assessment: Quiz 4
-> Total Score: 20
```

---

## 10.2 Recommended Code Rules

For MVP:

- 5 digits
- Numeric only
- Randomly generated
- Unique among active assessments
- Easy to write by hand
- Avoid repeated patterns where possible
- Expire or archive after the academic period ends

Example:

`55922`

Future version may support:

- QR code
- Barcode
- Printable assessment label
- Teacher stamp
- Alphanumeric codes

---

## 10.3 Teacher Flow

Teacher creates assessment:

```text
Subject: Mathematics
Quarter: First Quarter
Type: Quiz
Title: Fractions Quiz
Total Score: 20
```

System generates:

```text
Assessment Code: 55922
```

Teacher tells students:

> Write 55922 clearly on the upper-right corner of your paper for Trackademic.

Students write the code before starting the activity.

---

# 11. Scan and Upload Flow

## 11.1 Primary Flow

1. User opens Trackademic.
2. User selects `Scan School Paper`.
3. Camera opens.
4. User photographs the checked paper.
5. Image is uploaded.
6. OCR extracts visible text.
7. System searches for a valid 5-digit assessment code.
8. System matches code with an assessment.
9. System optionally attempts to detect:
   - Student name
   - Score
   - Total score
   - Teacher markings
10. App displays confirmation.

Example:

```text
Code Detected: 55922

Mathematics
First Quarter
Quiz 4 - Fractions

Detected Score:
18 / 20

Student:
Jake Engaña
```

Actions:

- Save
- Edit
- Save as Draft
- Retake Photo
- Wrong Assessment

---

# 12. OCR and Computer Vision Requirements

## 12.1 MVP Objective

The OCR feature does not need to understand the entire school paper.

The MVP priority is:

1. Detect the 5-digit assessment code
2. Detect the written score if possible
3. Allow manual correction before saving

---

## 12.2 Recommended OCR Options

### Option A: Google ML Kit Text Recognition

Recommended for mobile-first implementation.

Use cases:

- Read printed or handwritten numeric codes from a photo
- On-device text detection
- Fast processing
- Can work offline depending on implementation

Best use for:

- Assessment code detection
- Basic score detection

---

### Option B: Tesseract OCR

Open-source OCR engine.

Best use for:

- Server-side or local OCR
- Digit-restricted recognition
- Custom preprocessing

Can configure recognition to prioritize:

`0123456789`

Useful as an alternative or fallback.

---

## 12.3 OCR Validation Logic

Never automatically save only because OCR found a number.

Example:

OCR detects:

`55922`

Backend must check:

1. Does assessment code `55922` exist?
2. Is it active?
3. Does the user have permission to access this assessment?
4. Is the linked student part of the correct workspace?
5. Has this assessment already been uploaded?
6. Does the expected total score match what was detected?

If confidence is low:

> We found a possible code: 55922. Is this correct?

---

# 13. Photo Processing

Recommended processing before OCR:

1. Auto-detect document edges
2. Crop the paper
3. Fix perspective
4. Increase contrast
5. Reduce shadows
6. Rotate automatically
7. Focus OCR on upper-right area first
8. Run full-page OCR only if necessary

Because the teacher instructs students to place the code in the same location, recognition becomes easier.

Recommended rule:

**Assessment code must be written clearly inside a small box in the upper-right corner.**

Example:

```text
+---------+
|  55922  |
+---------+
```

---

# 14. Core MVP Features

## 14.1 Authentication

Required:

- Email/password
- Google Sign-In optional
- Password reset
- Role selection during onboarding

Roles:

- Student
- Parent/Guardian
- Teacher

---

## 14.2 Workspace

Required:

- Create workspace
- Invite member
- Join workspace
- Assign role
- Link parent to student
- Remove member
- Leave workspace

---

## 14.3 Student Profile

Required fields:

- First name
- Last name
- Grade level
- Section
- School name optional
- Student ID optional
- Profile image optional
- Linked guardian IDs

---

## 14.4 Subject Management

Required:

- Subject name
- Subject teacher
- Academic period
- Optional color/icon
- Student membership

---

## 14.5 Assessment Management

Teacher can create:

- Title
- Subject
- Type
- Quarter
- Semester optional
- Date
- Due date optional
- Total score
- Instructions optional
- Assessment code

---

## 14.6 Evidence Upload

Every evidence record should store:

- Image
- Student
- Assessment
- Assessment code
- Score
- Total score
- Upload date
- Uploaded by
- OCR confidence
- Verification status
- Notes
- Original image metadata where appropriate

---

## 14.7 Evidence Status

Recommended statuses:

- Draft
- Uploaded
- Code Matched
- Needs Review
- Teacher Verified
- Rejected
- Missing

Do not label all uploads as verified automatically.

---

## 14.8 Parent Dashboard

MVP dashboard:

```text
Student: Jake Engaña
Quarter: Q1

Math       86%
Science    78%
English    90%

New Scores: 4
Missing Evidence: 2
Pending Verification: 3
```

Parent should also see:

- latest uploaded papers
- low scores
- missing evidence
- upcoming due dates
- new teacher-verified work

---

## 14.9 Student Dashboard

Should show:

- subjects
- current quarter
- recently scanned work
- missing evidence
- pending uploads
- score history
- draft uploads

---

## 14.10 Teacher Dashboard

Should show:

- active assessments
- assessment codes
- number of students with evidence
- number missing
- evidence awaiting verification
- recent uploads

Example:

```text
Fractions Quiz
Code: 55922

28 students
24 uploaded
4 missing
6 awaiting verification
```

---

# 15. Missing Evidence Logic

This is an important feature.

If a teacher creates an assessment and the student belongs to that class, the system creates an expected assessment record.

Before evidence exists:

```text
Status: No Evidence
```

After upload:

```text
Status: Uploaded
```

After teacher confirmation:

```text
Status: Teacher Verified
```

This allows parents to distinguish between:

- work not yet uploaded
- uploaded work
- checked work
- verified work

---

# 16. Score Tracking

Each score record should support:

- points earned
- total possible points
- percentage
- date
- subject
- assessment type
- quarter/semester
- evidence image
- verification state

Example:

```text
18 / 20
90%
```

Scores should not be treated as official report card grades unless the school explicitly adopts the system.

---

# 17. Suggested Data Model

## User

```text
id
email
password_hash
first_name
last_name
role
profile_image
created_at
updated_at
```

## Workspace

```text
id
name
type
created_by
created_at
```

## WorkspaceMember

```text
id
workspace_id
user_id
role
status
joined_at
```

## StudentProfile

```text
id
user_id
grade_level
section
school_name
student_number
```

## GuardianStudentLink

```text
id
guardian_user_id
student_user_id
workspace_id
relationship
status
```

## AcademicPeriod

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

## Subject

```text
id
workspace_id
name
teacher_user_id
academic_period_id
```

## SubjectStudent

```text
id
subject_id
student_user_id
```

## Assessment

```text
id
subject_id
teacher_user_id
title
type
description
assessment_code
total_score
assessment_date
due_date
status
created_at
```

## Evidence

```text
id
assessment_id
student_user_id
uploaded_by_user_id
image_url
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

## Notification

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

---

# 18. Required APIs

The exact provider can change, but the product needs the following capabilities.

## 18.1 Authentication API

Options:

- Supabase Auth
- Firebase Authentication
- Auth0
- Clerk

MVP recommendation:

**Supabase Auth**

Reasons:

- Easy email/password login
- Google OAuth support
- Integrates with PostgreSQL
- Row Level Security
- Good for MVP development

---

## 18.2 Database

Recommended:

**PostgreSQL via Supabase**

Required for:

- users
- workspaces
- members
- student links
- subjects
- assessments
- assessment codes
- scores
- evidence metadata
- notifications

---

## 18.3 File Storage

Recommended:

**Supabase Storage**

Required for:

- scanned papers
- thumbnails
- profile images
- evidence attachments

Storage should be private by default.

Use signed URLs or protected storage access.

---

## 18.4 OCR API / SDK

Recommended first choice:

**Google ML Kit Text Recognition**

Alternative:

**Tesseract OCR**

Possible future fallback:

- Google Cloud Vision
- Azure AI Vision
- AWS Textract

Cloud OCR should not be required for the MVP unless local recognition quality is insufficient.

---

## 18.5 Camera / Image Capture

For PWA/web:

Use browser file/camera capture.

Example concept:

```text
<input type="file" accept="image/*" capture="environment">
```

For native mobile:

Use:

- Expo Camera
- React Native Vision Camera
- Flutter camera plugin

---

## 18.6 Image Processing

Possible libraries:

- OpenCV
- OpenCV.js
- Sharp
- Canvas API
- Native image manipulation library

Use for:

- crop
- perspective correction
- rotation
- compression
- contrast enhancement

---

## 18.7 Notifications

MVP can start with in-app notifications.

Future push options:

- Firebase Cloud Messaging
- OneSignal
- Expo Notifications

Notification examples:

- New score uploaded
- Low score detected
- Missing evidence
- Teacher verified work
- Assessment due soon

---

## 18.8 Email Service

Optional for MVP.

Useful for:

- invitations
- email verification
- password reset
- parent alerts

Options:

- Resend
- SendGrid
- Postmark
- Supabase built-in auth emails

---

# 19. Suggested Technology Stack

## Option A: Fastest MVP

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- PWA support

### Backend

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Edge Functions where needed

### OCR

- ML Kit if mobile/native
- Tesseract.js or server-side Tesseract for web prototype

### Deployment

- Vercel

Recommended for rapid MVP development.

---

## Option B: Mobile-First

### App

- React Native
- Expo
- TypeScript

### Backend

- Supabase

### OCR

- Google ML Kit

### Push Notifications

- Expo Notifications / Firebase Cloud Messaging

This is recommended if camera scanning is the main product experience.

---

# 20. Recommended Build Strategy

Start as:

**Mobile-first PWA + Supabase**

Why:

- Easy deployment
- Students and parents can open a link
- No Play Store/App Store requirement initially
- Faster testing
- Lower development cost
- Can later build React Native mobile app

Important:

OCR quality should be tested early.

The biggest technical risk is not the dashboard.

The biggest technical risk is:

**Can the app reliably detect a handwritten 5-digit code from real student papers?**

Build and test this feature before building a large UI.

---

# 21. MVP Development Order

## Phase 0 - Technical Prototype

Goal:

Prove that handwritten code detection works.

Build:

1. Camera/image upload
2. Crop paper
3. OCR image
4. Detect 5-digit number
5. Match number to mock assessment
6. Display matched folder

Success example:

```text
Photo
-> 55922 detected
-> Mathematics
-> Q1
-> Fractions Quiz
```

Do this BEFORE building the full product.

---

## Phase 1 - Foundation

Build:

- Authentication
- User roles
- Workspace
- Student profiles
- Guardian-student linking
- Teacher profiles
- Subjects
- Academic periods

---

## Phase 2 - Assessment Inventory

Build:

- Create assessment
- Generate 5-digit code
- Assessment list
- Student expected-work records
- Code lookup API

---

## Phase 3 - Paper Scanner

Build:

- Camera
- Upload
- OCR
- Code detection
- Code validation
- Assessment matching
- Score suggestion
- Manual correction
- Save as evidence

---

## Phase 4 - Dashboards

Build:

- Parent dashboard
- Student dashboard
- Teacher dashboard
- Missing evidence
- Recent scores
- Subject summaries

---

## Phase 5 - Verification

Build:

- Teacher evidence review
- Teacher verified status
- Reject/wrong upload
- Duplicate detection
- Audit trail

---

## Phase 6 - Notifications

Build:

- New score
- Missing evidence
- Low score
- New assessment
- Verification result

---

# 22. Recommended Backend API Endpoints

Example REST-style API.

## Authentication

```text
POST /auth/register
POST /auth/login
POST /auth/logout
```

If using Supabase Auth, most authentication calls can use Supabase directly.

---

## Workspace

```text
POST   /workspaces
GET    /workspaces/:id
POST   /workspaces/:id/invite
POST   /workspaces/:id/join
GET    /workspaces/:id/members
DELETE /workspaces/:id/members/:userId
```

---

## Students

```text
POST /students
GET  /students/:id
GET  /students/:id/subjects
GET  /students/:id/evidence
GET  /students/:id/progress
```

---

## Guardian Links

```text
POST /guardian-links
GET  /guardians/:id/students
DELETE /guardian-links/:id
```

---

## Subjects

```text
POST /subjects
GET  /subjects/:id
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

## OCR

```text
POST /ocr/analyze
```

Input:

```json
{
  "image": "uploaded-image"
}
```

Output example:

```json
{
  "assessmentCode": "55922",
  "score": 18,
  "totalScore": 20,
  "confidence": 0.91
}
```

---

# 23. Code Matching Logic

Pseudo logic:

```text
scan image
    ↓
extract OCR text
    ↓
find candidate 5-digit numbers
    ↓
for each candidate:
    check assessment database
    ↓
valid match?
    YES -> return assessment
    NO  -> continue
    ↓
no matches?
    ask user to enter code manually
```

Never trust OCR without database validation.

---

# 24. Duplicate Handling

A student may accidentally upload the same paper twice.

Possible detection:

- same assessment
- same student
- similar score
- similar image hash
- upload within short time window

Show:

> A paper for this assessment already exists. Replace it or save another copy?

---

# 25. Permissions and Security

Because the product handles minors and academic data, permissions are critical.

## Required rules

1. Student cannot access another student's private evidence.
2. Parent can only access linked children.
3. Teacher can only access students within assigned workspace/subject.
4. Evidence images must not be publicly accessible.
5. Every sensitive action must check authorization server-side.
6. Use Row Level Security if using Supabase.
7. Record who uploaded and who verified evidence.
8. Allow account and data deletion.
9. Do not expose student records through predictable URLs.

---

# 26. Child Privacy Requirements

This app handles data about minors.

Before public deployment, legal/privacy review is required.

At minimum:

- parental/guardian consent flow
- privacy policy
- terms of use
- data retention policy
- account deletion
- child data deletion
- secure private storage
- minimum necessary personal information
- clear distinction between school-issued and user-entered records

For the Philippines, the product must consider compliance with the Data Privacy Act of 2012 and applicable guidance from the National Privacy Commission.

If deployed internationally, additional child privacy laws may apply.

---

# 27. UX Principles

## 27.1 Keep Scanning Extremely Simple

Main CTA:

**Scan School Paper**

Avoid forcing the user to manually choose:

- teacher
- subject
- quarter
- activity type

if the assessment code can identify these automatically.

---

## 27.2 Always Confirm Before Saving

OCR can make mistakes.

Display:

```text
We found:

Code: 55922
Math
Q1
Quiz 4

Score:
18 / 20

Is this correct?
```

Buttons:

- Confirm & Save
- Edit
- Save Draft

---

## 27.3 Make Status Easy to Understand

Use clear wording:

- No evidence
- Uploaded
- Needs review
- Verified by teacher

Avoid overly technical language.

---

# 28. Core Screens

## Public

- Landing Page
- Login
- Register
- Forgot Password

## Onboarding

- Choose role
- Create/join workspace
- Create/link student
- Join class

## Student

- Home
- Scan
- Subjects
- Academic Records
- Missing Work
- Profile

## Parent

- Child Overview
- Scan for Child
- Scores
- Evidence
- Missing Work
- Notifications

## Teacher

- Class Overview
- Subjects
- Assessments
- Create Assessment
- Assessment Code
- Student Evidence
- Verification Queue

---

# 29. Example End-to-End Scenario

Teacher Ms. Santos creates:

```text
Mathematics
First Quarter
Quiz
Fractions Quiz
20 points
```

Trackademic generates:

`55922`

Teacher tells students:

> Write 55922 clearly on the upper-right corner of your paper.

Jake writes `55922`.

Jake completes the quiz.

Teacher checks the paper:

```text
18 / 20
```

Jake brings the paper home.

Jake does not own a phone.

Jake's mother opens Trackademic and selects:

**Scan for Jake**

She takes a photo.

Trackademic detects:

```text
55922
```

The app matches:

```text
Mathematics
Q1
Fractions Quiz
Teacher: Ms. Santos
```

OCR suggests:

```text
18 / 20
```

Mother confirms.

The record is saved.

Teacher later sees:

```text
Jake Engaña
Fractions Quiz
Evidence Uploaded
18 / 20
```

Teacher may optionally tap:

**Verify**

Parent dashboard now displays:

```text
Fractions Quiz
18/20
90%
Teacher Verified
```

---

# 30. MVP Success Metrics

Suggested early metrics:

## Activation

- % of users who create or join workspace
- % of teachers who create first assessment
- % of students/parents who complete first scan

## Scanner Quality

- Assessment code detection accuracy
- % of scans requiring manual code entry
- % of scores correctly detected
- average number of retakes

## Engagement

- papers scanned per student per week
- active parents per week
- active teachers per week
- assessments created per teacher

## Value

- % of expected assessments with evidence
- number of missing-work alerts resolved
- number of teacher-verified records

---

# 31. Main Technical Risks

## Risk 1: Handwritten OCR Accuracy

Different students write numbers differently.

Mitigation:

- fixed 5-digit format
- upper-right placement
- write inside a box
- OCR restricted to digits
- database validation
- manual fallback

---

## Risk 2: Teachers May Not Want Extra Work

Mitigation:

Teacher only needs to:

1. create assessment
2. announce code
3. optionally verify later

Avoid requiring teachers to scan every paper.

---

## Risk 3: Students May Forget the Code

Mitigation:

- teacher displays code on board
- code visible in student app
- allow manual routing
- future QR code option

---

## Risk 4: Fake or Edited Evidence

MVP should not claim that every photo is authentic.

Use status labels.

Example:

```text
Uploaded by student
```

versus:

```text
Verified by teacher
```

Future options:

- QR
- teacher signature recognition
- teacher scan
- school integration

---

# 32. Future Features

After MVP validation:

- QR assessment codes
- Printable teacher code labels
- Teacher stamp mode
- Bulk teacher verification
- Grade trends
- Subject risk alerts
- Parent weekly reports
- Multiple children per guardian
- School accounts
- School admin dashboard
- LMS/SIS integration
- OCR of teacher comments
- AI summary of academic progress
- Automatic document classification
- Offline scanning queue
- Native mobile apps
- Backup/export student portfolio
- End-of-quarter PDF academic evidence report

---

# 33. Proposed MVP Definition

The MVP is complete when the following scenario works reliably:

> A teacher creates an assessment and receives a 5-digit code. A student writes the code on a physical paper. After the paper is checked, the student or guardian takes a photo. Trackademic detects the code, identifies the correct assessment, allows the score to be confirmed, saves the image, and displays the record to the authorized student, guardian, and teacher.

Anything not required to complete this scenario should be considered secondary for the first build.

---

# 34. First Prototype Checklist

Before building the full app, complete this checklist:

- [ ] Create 20 fake assessment codes
- [ ] Handwrite them using different handwriting styles
- [ ] Take photos under different lighting conditions
- [ ] Test OCR
- [ ] Measure code recognition accuracy
- [ ] Test upper-right code crop
- [ ] Validate code against database
- [ ] Test wrong/invalid codes
- [ ] Test manual correction
- [ ] Test score recognition such as `18/20`
- [ ] Decide whether web OCR is enough
- [ ] Decide whether native ML Kit is required

Recommended target before continuing:

**At least 90-95% assessment-code recognition under expected usage conditions, with a reliable manual fallback.**

---

# 35. Build-First Recommendation

Do not start with dashboards.

Build this first:

```text
[ Camera ]
     ↓
[ Detect 55922 ]
     ↓
[ Find assessment ]
     ↓
Mathematics
Q1
Fractions Quiz
     ↓
[ Confirm ]
```

If this experience is fast and reliable, Trackademic has a strong core product.

The dashboard, analytics, alerts, and parent monitoring features can then be built around this academic evidence inventory.
