-- Trackademic Phase 0 — scanner prototype schema.
--
-- Scope: just enough to prove "scan paper -> detect code -> match assessment -> confirm -> save evidence".
-- Workspaces, subjects, academic periods and guardian links arrive in Phase 1; until then
-- subject/quarter live as text on assessments and evidence is attached to a test student.
--
-- Security model for the prototype:
--   * Every client is an authenticated Supabase user (anonymous sign-in is fine).
--   * Clients never write tables directly. Assessments and evidence are created through
--     SECURITY DEFINER functions that generate codes and validate routing server-side.
--   * Assessment lookup by code goes through an RPC that returns only routing fields,
--     never a table-wide SELECT.
--   * Evidence images live in a private bucket under a per-user folder.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 100),
  -- Phase 0 only: evidence may be attached to test students. Real student records
  -- (linked to auth users, guardians and workspaces) arrive in Phase 1.
  is_test_student boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid references auth.users (id) on delete set null,
  subject text not null check (char_length(btrim(subject)) between 1 and 80),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  assessment_type text not null check (assessment_type in (
    'QUIZ', 'ASSIGNMENT', 'ACTIVITY', 'PROJECT', 'EXAM', 'PERFORMANCE_TASK',
    'SEATWORK', 'HOMEWORK', 'RECITATION', 'LABORATORY_ACTIVITY', 'OTHER'
  )),
  quarter text not null check (quarter in (
    'FIRST_QUARTER', 'SECOND_QUARTER', 'THIRD_QUARTER', 'FOURTH_QUARTER'
  )),
  total_score integer not null check (total_score > 0 and total_score <= 1000),
  -- Routing/lookup value only. Never a primary key, never proof of authenticity.
  assessment_code text not null check (assessment_code ~ '^[0-9]{5}$'),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Active codes must be unique; archived assessments release their code.
create unique index assessments_active_code_key
  on public.assessments (assessment_code) where status = 'ACTIVE';
create index assessments_assessment_code_idx on public.assessments (assessment_code);
create index assessments_teacher_user_id_idx on public.assessments (teacher_user_id);

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete restrict,
  student_profile_id uuid not null references public.student_profiles (id) on delete restrict,
  uploaded_by_user_id uuid not null references auth.users (id) on delete cascade,
  -- Object key inside the private "evidence" bucket. Never a public URL.
  image_path text not null unique,
  -- The 5-digit code the user confirmed (equal to the matched assessment's code).
  detected_code text not null check (detected_code ~ '^[0-9]{5}$'),
  code_source text not null check (code_source in ('OCR', 'MANUAL')),
  ocr_text text check (ocr_text is null or char_length(ocr_text) <= 20000),
  ocr_confidence numeric(5, 4) check (ocr_confidence is null or (ocr_confidence >= 0 and ocr_confidence <= 1)),
  ocr_engine text check (ocr_engine is null or char_length(ocr_engine) <= 40),
  status text not null check (status in (
    'DRAFT', 'UPLOADED', 'CODE_MATCHED', 'NEEDS_REVIEW', 'TEACHER_VERIFIED', 'REJECTED', 'MISSING'
  )),
  uploaded_at timestamptz not null default now(),
  verified_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz,
  -- Teacher verification must always record who and when.
  constraint evidence_verification_recorded check (
    status <> 'TEACHER_VERIFIED' or (verified_by is not null and verified_at is not null)
  )
);

create index evidence_assessment_id_idx on public.evidence (assessment_id);
create index evidence_student_profile_id_idx on public.evidence (student_profile_id);
create index evidence_uploaded_by_user_id_idx on public.evidence (uploaded_by_user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security (deny by default)
-- ---------------------------------------------------------------------------

alter table public.student_profiles enable row level security;
alter table public.assessments enable row level security;
alter table public.evidence enable row level security;

revoke all on public.student_profiles, public.assessments, public.evidence from anon;
revoke insert, update, delete on public.student_profiles, public.assessments, public.evidence from authenticated;

-- Phase 0: only test students are visible, and only to signed-in users.
create policy "Signed-in users can read test students"
  on public.student_profiles for select to authenticated
  using (is_test_student);

-- Teachers can list their own assessments. Everyone else resolves codes via the RPC.
create policy "Teachers can read their own assessments"
  on public.assessments for select to authenticated
  using (teacher_user_id = (select auth.uid()));

-- Uploaders can read the evidence they uploaded.
create policy "Uploaders can read their own evidence"
  on public.evidence for select to authenticated
  using (uploaded_by_user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Assessment code generation (server-side, random, non-sequential)
-- ---------------------------------------------------------------------------

create or replace function public.generate_assessment_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_code text;
  v_attempt integer := 0;
begin
  loop
    v_attempt := v_attempt + 1;
    if v_attempt > 100 then
      raise exception 'Could not generate a unique assessment code' using errcode = 'P0001';
    end if;

    -- Cryptographically random value in [10000, 99999]; avoids a leading zero that
    -- students tend to drop when handwriting.
    v_code := (10000 + (('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 90000))::text;

    -- Skip hard-to-trust patterns: one repeated digit, or 4+ of the same digit in a row.
    continue when v_code ~ '(\d)\1{3}';
    -- Skip straight ascending/descending runs such as 12345 or 98765.
    continue when position(v_code in '0123456789') > 0 or position(v_code in '9876543210') > 0;
    -- Skip codes already in use by an active assessment.
    continue when exists (
      select 1 from public.assessments a where a.assessment_code = v_code and a.status = 'ACTIVE'
    );

    return v_code;
  end loop;
end;
$$;

revoke execute on function public.generate_assessment_code() from public, anon, authenticated;

create or replace function public.create_assessment(
  p_subject text,
  p_title text,
  p_assessment_type text,
  p_quarter text,
  p_total_score integer
)
returns table (
  id uuid,
  assessment_code text,
  subject text,
  title text,
  assessment_type text,
  quarter text,
  total_score integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_attempt integer := 0;
  v_row public.assessments;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  -- Retry if a concurrent insert grabbed the same code (partial unique index).
  loop
    v_attempt := v_attempt + 1;
    begin
      insert into public.assessments (teacher_user_id, subject, title, assessment_type, quarter, total_score, assessment_code)
      values (v_user, btrim(p_subject), btrim(p_title), p_assessment_type, p_quarter, p_total_score, public.generate_assessment_code())
      returning * into v_row;
      exit;
    exception when unique_violation then
      if v_attempt >= 5 then
        raise;
      end if;
    end;
  end loop;

  return query select v_row.id, v_row.assessment_code, v_row.subject, v_row.title,
    v_row.assessment_type, v_row.quarter, v_row.total_score, v_row.created_at;
end;
$$;

revoke execute on function public.create_assessment(text, text, text, text, integer) from public, anon;
grant execute on function public.create_assessment(text, text, text, text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Code lookup: validates OCR candidates / manual codes against active assessments.
-- Returns routing fields only. Capped per call to slow down enumeration.
-- ---------------------------------------------------------------------------

create or replace function public.find_assessments_by_codes(p_codes text[])
returns table (
  id uuid,
  assessment_code text,
  subject text,
  title text,
  assessment_type text,
  quarter text,
  total_score integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_codes is null or cardinality(p_codes) = 0 then
    return;
  end if;
  if cardinality(p_codes) > 10 then
    raise exception 'Too many codes in one lookup' using errcode = '22023';
  end if;

  return query
    select a.id, a.assessment_code, a.subject, a.title, a.assessment_type, a.quarter, a.total_score
    from public.assessments a
    where a.status = 'ACTIVE'
      and a.assessment_code = any (
        select c from unnest(p_codes) as c where c ~ '^[0-9]{5}$'
      );
end;
$$;

revoke execute on function public.find_assessments_by_codes(text[]) from public, anon;
grant execute on function public.find_assessments_by_codes(text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Evidence creation: the server re-validates routing before saving.
-- ---------------------------------------------------------------------------

create or replace function public.create_evidence(
  p_evidence_id uuid,
  p_assessment_id uuid,
  p_student_profile_id uuid,
  p_confirmed_code text,
  p_code_source text,
  p_ocr_text text,
  p_ocr_confidence numeric,
  p_ocr_engine text
)
returns table (
  id uuid,
  assessment_id uuid,
  detected_code text,
  status text,
  uploaded_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_path text;
  v_status text;
  v_row public.evidence;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_code_source not in ('OCR', 'MANUAL') then
    raise exception 'Invalid code source' using errcode = '22023';
  end if;

  -- Never trust the client's routing: the confirmed code must belong to this active assessment.
  if not exists (
    select 1 from public.assessments a
    where a.id = p_assessment_id and a.status = 'ACTIVE' and a.assessment_code = p_confirmed_code
  ) then
    raise exception 'Assessment code does not match an active assessment' using errcode = '22023';
  end if;

  -- Phase 0: evidence may only be attached to test students.
  if not exists (
    select 1 from public.student_profiles s where s.id = p_student_profile_id and s.is_test_student
  ) then
    raise exception 'Unknown student' using errcode = '22023';
  end if;

  -- The image must already be uploaded into this user's private folder.
  v_path := v_user::text || '/assessment/' || p_assessment_id::text || '/' || p_evidence_id::text || '.jpg';
  if not exists (
    select 1 from storage.objects o where o.bucket_id = 'evidence' and o.name = v_path
  ) then
    raise exception 'Evidence image not found' using errcode = '22023';
  end if;

  -- OCR-read codes the user confirmed are CODE_MATCHED; manually typed codes are UPLOADED.
  -- Neither is ever TEACHER_VERIFIED: that requires a teacher action (Phase 5).
  v_status := case when p_code_source = 'OCR' then 'CODE_MATCHED' else 'UPLOADED' end;

  insert into public.evidence (
    id, assessment_id, student_profile_id, uploaded_by_user_id, image_path,
    detected_code, code_source, ocr_text, ocr_confidence, ocr_engine, status
  )
  values (
    p_evidence_id, p_assessment_id, p_student_profile_id, v_user, v_path,
    p_confirmed_code, p_code_source, left(p_ocr_text, 20000), p_ocr_confidence, left(p_ocr_engine, 40), v_status
  )
  returning * into v_row;

  return query select v_row.id, v_row.assessment_id, v_row.detected_code, v_row.status, v_row.uploaded_at;
end;
$$;

revoke execute on function public.create_evidence(uuid, uuid, uuid, text, text, text, numeric, text) from public, anon;
grant execute on function public.create_evidence(uuid, uuid, uuid, text, text, text, numeric, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Private storage for evidence images
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidence', 'evidence', false, 10485760, array['image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Objects live at {auth.uid()}/assessment/{assessmentId}/{evidenceId}.jpg.
-- No update/delete policies: prior evidence is never silently replaced.
create policy "Users can upload evidence into their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can read evidence in their own folder"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
