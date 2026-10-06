# Trackademic — web app / PWA (Milestone 1)

Trackademic is a web-first record of checked schoolwork for students, parents/guardians and teachers. See [Trackademic_PRD_v0.2_Role_Based.md](Trackademic_PRD_v0.2_Role_Based.md).

- **Student**: submits their own checked papers and scores.
- **Parent / guardian**: follows a linked child and can scan papers for them.
- **Teacher**: creates assessments, which come with 5-digit codes, and sees what was submitted.

Core flow: **Take Photo → Detect Code → Match Assessment → Confirm Score → Save**

**Web first.** Trackademic runs in the browser on a phone, tablet, laptop or school PC, so nobody needs a personal phone or an install. It is also an installable **PWA**: users can add it to the home screen and it opens like an app with its own icon and window, but it is still the same website, updated with a single deploy.

```text
Browser (phone / tablet / laptop / PC)  ──  or the installed PWA
        ↓
Trackademic web app   Vite + React DOM + TypeScript (react-router)
        ↓
Supabase              Postgres + Auth + private Storage (RLS on every table)
```

## What works today

- Onboarding, sign up, sign in, forgot password, and Google sign-in (once the Google provider is configured).
- Role selection, then a role-specific setup step:
  - Student: gets a parent link code and can join a class.
  - Parent: links a child by code, or adds a child.
  - Teacher: creates or joins a class.
- Each role has its own tabs, and only its own tabs. Every role's centre tab is the emphasised one.
  - **Student** (`/student`): Home, Subjects, **Upload**, Records, Profile.
  - **Parent** (`/parent`): Home, Child, **Scan**, Inbox, Profile.
  - **Teacher** (`/teacher`): Home, Subjects, **Create**, Audit, Profile.
- Upload flow:
  1. Photo.
  2. OCR looks for the code. This is assistive only.
  3. The server checks the code against active assessments.
  4. The user types the score, checked against the assessment total.
  5. The photo is saved privately.
  
  Manual code entry is always available.
- **Profile** (every role): change name, profile photo, email (confirmed by a link sent to the new address) and password (asks for the current one). Photos are stored privately; only the owner can see them.
- Teacher creates an assessment (Subject → Type → Title → Quarter → Total) and gets a server-generated 5-digit code.
- Dashboards read real data:
  - Student: recent scores, pending verification and subject averages.
  - Parent: new scores, needs attention and recent records.
  - Teacher: active codes, submissions and the verification queue.

### Not built yet

- **Teacher verify/reject.** Papers stay "Waiting for teacher".
- **"Missing work" and "missing students".** Assessments aren't linked to classes yet, so these show empty states.
- **Teacher reports, reminders and the Inbox.** These are placeholders.
- **Notifications.**

## Repository layout

```text
apps/mobile/                       Vite · React DOM · TypeScript · react-router
  index.html                       page shell (manifest, icons)
  public/                          PWA: manifest.webmanifest, sw.js, icons/, favicon
  src/web/
    main.tsx                       entry: fonts, styles, service worker
    App.tsx                        routes + auth/role guards
    screens/                       auth, setup, student, parent, teacher, scan
    ui/                            UI kit (buttons, cards, fields, tab bar, dashboards, profile, dialog)
    styles.css                     design tokens and shared styles
  src/features/                    domain logic + Zod schemas (assessments, evidence, auth, profile, scanner, dashboards)
  src/services/
    api/                           auth, assessments, evidence, students, guardians, teachers, profile
    ocr/                           OCRService interface: Tesseract (browser), mock
    camera/  image/                file-input photo picking; canvas resize + code-box crop
  src/lib/                         env, Supabase client, session storage, pwa (service worker + install prompt)
supabase/migrations/               schema, RLS, SECURITY DEFINER RPCs, private storage
```

Some shared modules still have an Expo version beside the browser one (`foo.ts` + `foo.web.ts`, or `foo.native.ts`), and the old Expo screens are still in `src/app` and `src/components`. Vite and TypeScript pick `.web.ts` first and never build the Expo files; they are waiting to be removed.

## Backend

The backend is **Supabase** (Postgres + Auth + Storage):

- **Reads.** Row Level Security limits every read to what the signed-in user may see:
  - A student sees their own records.
  - A guardian sees their linked children's records.
  - A teacher sees papers submitted to their own assessment codes.
- **Writes.** Every write goes through a `SECURITY DEFINER` function that checks the caller's role.
  - Example: `create_evidence` re-checks the code, the score range, and that the caller is the student or a linked guardian.
- **Images.** Evidence images and profile photos live in private buckets (`evidence`, `profile`) and are never public. Profile photos are shown through short-lived signed URLs, to their owner only.

Screens never call Supabase directly; they go through `src/services/api/*`. A future REST backend (for example Laravel + Sanctum) at `VITE_API_URL` would only replace those modules. Today that variable is optional and unused.

**Sessions.**
- **Web / PWA:** the session is kept in the site's `localStorage`, as usual for browser Supabase apps. Browsers have no Keychain-style store, so any script running on the page could read it. Load no third-party scripts, and serve the app with a strict Content-Security-Policy (see "Deploy the web app"). On shared school devices, users should **Sign Out** when they're done.

## 1. Install

Requires Node 20+.

```bash
cd apps/mobile
npm install
cp .env.example .env.local      # then fill in the values below
```

`.env.local` only holds public values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_API_URL` (optional)

The older `EXPO_PUBLIC_*` names still work, so an existing `.env.local` keeps running.

**Never put the service role key or the database password in the app or in any committed file.**

## 2. Supabase

**Hosted.** Apply the migrations using the session pooler connection string, entering the password only in your terminal:

```bash
supabase db push --db-url "postgresql://postgres.<ref>:<password>@<pooler-host>:5432/postgres"
```

Then set the Project URL and publishable key in `.env.local`.

**Local (Docker).**

```bash
supabase start        # applies migrations
supabase status       # API URL + publishable key for .env.local
```

## 3. Which API URL to use on which device

`localhost` means "this device", so a phone can't reach a local Supabase at `http://localhost:54321`.

| Running on | Local Supabase URL |
|---|---|
| Browser on this computer | `http://localhost:54321` |
| Phone on the same Wi-Fi | `http://<your-computer-LAN-IP>:54321`, e.g. `http://192.168.1.20:54321` (allow ports 54321 and 8081 through the firewall) |

The **hosted** Supabase URL (`https://<ref>.supabase.co`) works the same on every device. `VITE_*` values are baked in at build time, so restart `npm run dev` or rebuild after changing them.

## 4. Run

```bash
cd apps/mobile
npm run dev            # development server at http://localhost:8081, also on the LAN (no service worker in dev)
npm run build          # typecheck + production build → apps/mobile/dist (static files, incl. manifest + sw.js)
npm run preview        # serve dist at http://localhost:8081 to try the installable PWA
```

Checks:

```bash
npm run typecheck
npm run lint
npm test               # Vitest unit tests
npm run test:db        # database rules (RLS + functions) against the LOCAL Supabase; needs `supabase start`
```

### Deploy the web app

`npm run build` gives a static site in `dist/`, ready for any static host (Vercel, Netlify, Cloudflare Pages, S3 or a school server).

- **Serve over HTTPS.** Installing the app, using the camera and running the service worker all need HTTPS (`localhost` is the only exception).
- **Single-page fallback.** Unknown paths such as `/student/records` must serve `index.html`.
- **Cache headers.** Serve `sw.js` and `index.html` with `Cache-Control: no-cache` so updates arrive. `/assets/*` files have hashed names and can be cached forever.
- **Content-Security-Policy.** A strict policy, for example `script-src 'self' https://cdn.jsdelivr.net 'wasm-unsafe-eval'; connect-src 'self' https://<ref>.supabase.co https://cdn.jsdelivr.net; img-src 'self' data: blob: https://<ref>.supabase.co`. Tesseract.js loads its OCR engine and language data from jsDelivr.
- **Supabase Auth.** Add the deployed URL to Supabase Auth → URL Configuration (Site URL and Redirect URLs) so sign-in redirects work.

### Install it (PWA)

- **Android / Chrome / Edge (desktop too).** Choose **Install App** on the sign-in or Profile screen, or use the browser's install icon or menu.
- **iPhone / iPad.** In Safari, tap **Share → Add to Home Screen**. The app shows this hint itself.
- **What the service worker caches.** Only the app's own code, icons and fonts, so the app opens quickly and still shows its start screen without a connection. Supabase traffic, meaning sign-in, records, scores and evidence photos, is never cached, so no student data is stored by the PWA. Saving papers and reading records still need a connection.

## 5. Try it

**Demo accounts (local Supabase only).** `supabase db reset` loads them from [supabase/seed.sql](supabase/seed.sql). All three use the password `demo1234`:

| Email | Role | What's there |
|---|---|---|
| `teacher@demo.test` | Teacher | Class "Grade 5 Sampaguita" (join code `DEMO55`); owns codes `55922`, `48317`, `70264` |
| `student@demo.test` | Student | Juan Dela Cruz, in the class, 2 saved scores (link code `JUAN22`) |
| `parent@demo.test` | Parent | Maria Dela Cruz, linked to Juan |

On 2026-10-05 the seed was also run once on the hosted project, for testing on phones (`supabase db query --linked --file supabase/seed.sql`). `demo1234` is public, so delete these accounts or change their passwords before real students use the hosted project. To try it from scratch instead:

1. **Teacher.**
   1. Sign up and choose **Teacher**. Create a class and note its class code.
   2. Go to **Create** and enter Subject, Type, Title, Quarter and Total. You get a 5-digit code such as `23566`.
2. **Student.**
   1. Sign up and choose **Student**. Note the parent link code, then join the class with the class code.
   2. Go to **Upload** and take or upload a photo.
   3. If the code isn't read, choose **Enter 5-digit assessment code**.
   4. Enter the score and choose **Confirm & Save**. The paper appears under Recent scores and Pending verification.
3. **Parent.**
   1. Sign up and choose **Parent / Guardian**. Link the child with the student's link code.
   2. The dashboard shows the child's scores. Use **Scan** to save a paper on the child's behalf.
4. **Teacher again.** **Home** shows the submissions and the verification queue. **Audit** lists every paper.

## 6. OCR

- **How the code is found.**
  - The photo is resized and the upper-right "code box" is cropped.
  - OCR reads the box first, then the whole page.
  - 5-digit candidates are extracted (fixing look-alikes such as `S→5` and `O→0`).
- **Codes are validated by the server.** Only codes the database confirms count as matches.
- **Manual entry is always available.**
- **Engines.** They sit behind `OCRService` (`src/services/ocr`):
  - **Tesseract.js**, running in the browser.
  - **A mock** for tests.
- **Handwriting.** Handwritten-code OCR is **not shown to be reliable**. Testing so far used synthetic images, and handwriting-style digits were misread. In a 2026-10-06 browser test, Tesseract also missed a clearly printed code, and manual entry finished the save. The next step is a real-paper test set.

## Security notes

- **RLS.** RLS is on for every table and denies by default. Clients can't write tables directly.
- **Assessment codes.**
  - Codes are random, generated server-side, and unique among active assessments.
  - A code is never used as a primary key and never proves authenticity.
- **Evidence.**
  - Evidence images are private, at `{uploaderId}/assessment/{assessmentId}/{evidenceId}.jpg`, with no update/delete policies.
  - Uploads are never marked "teacher verified". Only a teacher action may set that, and that action isn't built yet.
- **Known gaps.**
  - Any signed-in user can look up any active code. Lookups should be scoped to class membership.
  - Teachers can't view evidence images yet; that needs signed URLs.
