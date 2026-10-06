-- Demo data for the Phase 0 scanner prototype (local development only).

insert into public.student_profiles (id, display_name, is_test_student)
values ('00000000-0000-4000-8000-000000000001', 'Test Student', true)
on conflict (id) do nothing;

-- Seeded assessments have no teacher owner; they exist so the scanner can be tested
-- without first creating an assessment in the app.
insert into public.assessments (id, subject, title, assessment_type, quarter, total_score, assessment_code)
values
  ('00000000-0000-4000-8000-000000000101', 'Mathematics', 'Fractions Quiz', 'QUIZ', 'FIRST_QUARTER', 20, '55922'),
  ('00000000-0000-4000-8000-000000000102', 'Science', 'Plant Parts Activity', 'ACTIVITY', 'FIRST_QUARTER', 15, '48317'),
  ('00000000-0000-4000-8000-000000000103', 'English', 'Reading Comprehension Seatwork', 'SEATWORK', 'FIRST_QUARTER', 10, '70264')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------------------
-- Demo accounts, one per role (local development only — `supabase db reset` loads this).
-- All three use the password: demo1234
--   teacher@demo.test  Teacher, owns the class and the three assessments above
--   student@demo.test  Student "Juan Dela Cruz", in the class, has saved scores
--   parent@demo.test   Parent "Maria Dela Cruz", linked to the student
-- Never run this against the hosted project.
-- ---------------------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('demo1234', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', u.full_name),
  now(), now(), '', '', '', ''
from (values
  ('00000000-0000-4000-8000-0000000000a1'::uuid, 'teacher@demo.test', 'Ana Reyes'),
  ('00000000-0000-4000-8000-0000000000a2'::uuid, 'student@demo.test', 'Juan Dela Cruz'),
  ('00000000-0000-4000-8000-0000000000a3'::uuid, 'parent@demo.test', 'Maria Dela Cruz')
) as u (id, email, full_name)
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.email in ('teacher@demo.test', 'student@demo.test', 'parent@demo.test')
on conflict do nothing;

-- The new-user trigger already created the profiles; give them a role and finish setup.
update public.profiles p
set role = v.role, setup_completed_at = now(), updated_at = now()
from (values
  ('00000000-0000-4000-8000-0000000000a1'::uuid, 'TEACHER'),
  ('00000000-0000-4000-8000-0000000000a2'::uuid, 'STUDENT'),
  ('00000000-0000-4000-8000-0000000000a3'::uuid, 'PARENT')
) as v (id, role)
where p.id = v.id;

insert into public.student_profiles (id, display_name, owner_user_id, link_code)
values ('00000000-0000-4000-8000-0000000000b2', 'Juan Dela Cruz', '00000000-0000-4000-8000-0000000000a2', 'JUAN22')
on conflict (id) do nothing;

insert into public.guardian_links (guardian_user_id, student_profile_id)
values ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-0000000000b2')
on conflict do nothing;

insert into public.classes (id, name, join_code, owner_user_id)
values ('00000000-0000-4000-8000-0000000000c1', 'Grade 5 Sampaguita', 'DEMO55', '00000000-0000-4000-8000-0000000000a1')
on conflict (id) do nothing;

insert into public.class_members (class_id, user_id, member_role)
values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1', 'TEACHER'),
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a2', 'STUDENT')
on conflict do nothing;

-- The demo teacher owns the seeded assessments, so their dashboard shows codes and submissions.
update public.assessments
set teacher_user_id = '00000000-0000-4000-8000-0000000000a1'
where id in (
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000103'
);

-- Saved scores, still waiting for the teacher. No image files exist for these rows;
-- image_path follows the real layout but is only a placeholder key.
insert into public.evidence (
  id, assessment_id, student_profile_id, uploaded_by_user_id, image_path,
  detected_code, code_source, score, status, uploaded_at
)
select e.id, e.assessment_id, '00000000-0000-4000-8000-0000000000b2', e.uploader,
  e.uploader::text || '/assessment/' || e.assessment_id::text || '/' || e.id::text || '.jpg',
  a.assessment_code, e.source, e.score, e.status, now() - e.age
from (values
  ('00000000-0000-4000-8000-0000000000e1'::uuid, '00000000-0000-4000-8000-000000000101'::uuid,
   '00000000-0000-4000-8000-0000000000a2'::uuid, 'OCR', 18::numeric, 'CODE_MATCHED', interval '2 days'),
  ('00000000-0000-4000-8000-0000000000e2'::uuid, '00000000-0000-4000-8000-000000000102'::uuid,
   '00000000-0000-4000-8000-0000000000a3'::uuid, 'MANUAL', 9::numeric, 'UPLOADED', interval '1 day')
) as e (id, assessment_id, uploader, source, score, status, age)
join public.assessments a on a.id = e.assessment_id
on conflict (id) do nothing;
