-- Sections, subjects and assessments inside subjects (PRD v0.3 §9–§15, v0.5 §6–§14).
--
--   * A "Section" is a class workspace (public.classes). It gains a description, and a
--     membership has a status: ACTIVE, INACTIVE or REMOVED. Memberships are never deleted,
--     so history stays attached.
--   * Subjects live inside a section. Assessments can live inside a subject, with an
--     assessment date, due date and instructions. Older assessments with no subject keep
--     working as before.
--   * Section assessments are scoped to the section:
--       - only members (or parents of member students) can look up their filing code;
--       - only member students can have evidence filed for them;
--       - the section's teachers can read that evidence and its photo.
--   * As before, clients cannot write tables directly: every write is a SECURITY DEFINER function.

-- ---------------------------------------------------------------------------
-- Sections and memberships
-- ---------------------------------------------------------------------------

alter table public.classes
  add column description text check (description is null or char_length(description) between 1 and 300);

alter table public.class_members
  add column status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'REMOVED')),
  add column status_changed_at timestamptz;

create index class_members_class_idx on public.class_members (class_id, member_role, status);

-- The caller is an active teacher of the section.
create or replace function public.teaches_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.class_members m
    where m.class_id = p_class_id and m.user_id = (select auth.uid()) and m.member_role = 'TEACHER' and m.status = 'ACTIVE'
  );
$$;

-- The caller is an active member (teacher or student) of the section.
create or replace function public.is_class_member(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.class_members m
    where m.class_id = p_class_id and m.user_id = (select auth.uid()) and m.status = 'ACTIVE'
  );
$$;

-- The student (by student profile) is an active student member of the section.
create or replace function public.student_in_class(p_student_profile_id uuid, p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.class_members m
    join public.student_profiles s on s.owner_user_id = m.user_id
    where s.id = p_student_profile_id and m.class_id = p_class_id and m.member_role = 'STUDENT' and m.status = 'ACTIVE'
  );
$$;

-- Raises unless the caller is an active teacher of the section.
create or replace function public.require_section_teacher(p_class_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Please sign in first.' using errcode = '28000';
  end if;
  if p_class_id is null or not public.teaches_class(p_class_id) then
    raise exception 'Only teachers of this section can do that.' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;

revoke execute on function public.teaches_class(uuid) from public, anon;
revoke execute on function public.is_class_member(uuid) from public, anon;
revoke execute on function public.student_in_class(uuid, uuid) from public, anon;
revoke execute on function public.require_section_teacher(uuid) from public, anon, authenticated;
grant execute on function public.teaches_class(uuid) to authenticated;
grant execute on function public.is_class_member(uuid) to authenticated;
grant execute on function public.student_in_class(uuid, uuid) to authenticated;

drop function public.create_class_workspace(integer, text, text, text, text);

create or replace function public.create_class_workspace(
  p_grade_level integer,
  p_section text,
  p_school_year text,
  p_school_name text default null,
  p_adviser_name text default null,
  p_description text default null
)
returns table (
  id uuid,
  name text,
  join_code text,
  grade_level smallint,
  section text,
  school_year text,
  school_name text,
  adviser_name text,
  description text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_role('TEACHER');
  v_section text := btrim(coalesce(p_section, ''));
  v_year text := btrim(coalesce(p_school_year, ''));
  v_school text := nullif(btrim(coalesce(p_school_name, '')), '');
  v_adviser text := nullif(btrim(coalesce(p_adviser_name, '')), '');
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_class public.classes;
begin
  if p_grade_level is null or p_grade_level not between 1 and 10 then
    raise exception 'Grade level must be from 1 to 10.' using errcode = '22023';
  end if;
  if char_length(v_section) not between 1 and 60 then
    raise exception 'Enter a section of 1 to 60 characters.' using errcode = '22023';
  end if;
  if v_year !~ '^[0-9]{4}-[0-9]{4}$' or split_part(v_year, '-', 2)::int <> split_part(v_year, '-', 1)::int + 1 then
    raise exception 'School year must look like 2026-2027.' using errcode = '22023';
  end if;
  if char_length(v_school) > 120 or char_length(v_adviser) > 120 then
    raise exception 'School and adviser names must be 120 characters or fewer.' using errcode = '22023';
  end if;
  if char_length(v_description) > 300 then
    raise exception 'Keep the description to 300 characters.' using errcode = '22023';
  end if;

  for attempt in 1..20 loop
    begin
      insert into public.classes (name, join_code, owner_user_id, grade_level, section, school_year, school_name, adviser_name, description)
      values ('Grade ' || p_grade_level || ' - ' || v_section, public.generate_class_join_code(), v_uid,
              p_grade_level, v_section, v_year, v_school, v_adviser, v_description)
      returning * into v_class;
      exit;
    exception when unique_violation then
      if attempt = 20 then raise; end if;
    end;
  end loop;

  insert into public.class_members (class_id, user_id, member_role) values (v_class.id, v_uid, 'TEACHER');
  return query select v_class.id, v_class.name, v_class.join_code, v_class.grade_level, v_class.section,
    v_class.school_year, v_class.school_name, v_class.adviser_name, v_class.description;
end;
$$;

revoke execute on function public.create_class_workspace(integer, text, text, text, text, text) from public, anon;
grant execute on function public.create_class_workspace(integer, text, text, text, text, text) to authenticated;

-- Join codes as typed: spaces and dashes ignored, letters upper-cased.
create or replace function public.normalize_class_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));
$$;

-- What a student sees before confirming a join (PRD v0.3 §9.3). No ids, codes or member data.
create or replace function public.preview_class(p_join_code text)
returns table (
  name text,
  grade_level smallint,
  section text,
  school_year text,
  school_name text,
  teacher_name text,
  student_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_class public.classes;
begin
  if auth.uid() is null then
    raise exception 'Please sign in first.' using errcode = '28000';
  end if;
  select * into v_class from public.classes c where c.join_code = public.normalize_class_code(p_join_code);
  if not found then
    raise exception 'No class has that code. Check it with your teacher.' using errcode = 'P0001';
  end if;
  return query
    select v_class.name, v_class.grade_level, v_class.section, v_class.school_year, v_class.school_name,
      coalesce(v_class.adviser_name, (select p.full_name from public.profiles p where p.id = v_class.owner_user_id)),
      (select count(*)::int from public.class_members m
        where m.class_id = v_class.id and m.member_role = 'STUDENT' and m.status = 'ACTIVE');
end;
$$;

revoke execute on function public.preview_class(text) from public, anon;
grant execute on function public.preview_class(text) to authenticated;

-- Joining reactivates an earlier membership, and gives a student their student profile.
create or replace function public.join_class(p_join_code text)
returns table (id uuid, name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_class public.classes;
begin
  if v_uid is null then
    raise exception 'Please sign in first.' using errcode = '28000';
  end if;
  select p.role into v_role from public.profiles p where p.id = v_uid;
  if v_role not in ('TEACHER', 'STUDENT') then
    raise exception 'Only teachers and students can join a class.' using errcode = '42501';
  end if;

  select * into v_class from public.classes c where c.join_code = public.normalize_class_code(p_join_code);
  if not found then
    raise exception 'No class has that code. Check it with your teacher.' using errcode = 'P0001';
  end if;

  if v_role = 'STUDENT' then
    perform public.ensure_my_student_profile();
  end if;

  insert into public.class_members (class_id, user_id, member_role)
  values (v_class.id, v_uid, v_role)
  on conflict (class_id, user_id) do update
    set status = 'ACTIVE', status_changed_at = now()
    where public.class_members.status <> 'ACTIVE';

  return query select v_class.id, v_class.name;
end;
$$;

-- ---------------------------------------------------------------------------
-- Subjects
-- ---------------------------------------------------------------------------

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete restrict,
  teacher_user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 80),
  subject_code text check (subject_code is null or char_length(subject_code) between 1 and 20),
  description text check (description is null or char_length(description) between 1 and 300),
  created_at timestamptz not null default now()
);

create unique index subjects_class_name_key on public.subjects (class_id, lower(name));

alter table public.subjects enable row level security;
revoke all on public.subjects from anon;
revoke insert, update, delete on public.subjects from authenticated;
grant select on public.subjects to authenticated;

create policy "Section members can read its subjects"
  on public.subjects for select to authenticated
  using (public.is_class_member(class_id));

create or replace function public.create_subject(
  p_class_id uuid,
  p_name text,
  p_code text default null,
  p_description text default null
)
returns table (id uuid, class_id uuid, name text, subject_code text, description text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_section_teacher(p_class_id);
  v_name text := btrim(coalesce(p_name, ''));
  v_code text := nullif(btrim(coalesce(p_code, '')), '');
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_row public.subjects;
begin
  if char_length(v_name) not between 1 and 80 then
    raise exception 'Enter a subject name of 1 to 80 characters.' using errcode = '22023';
  end if;
  if char_length(v_code) > 20 or char_length(v_description) > 300 then
    raise exception 'Keep the code to 20 and the description to 300 characters.' using errcode = '22023';
  end if;
  begin
    insert into public.subjects (class_id, teacher_user_id, name, subject_code, description)
    values (p_class_id, v_uid, v_name, v_code, v_description)
    returning * into v_row;
  exception when unique_violation then
    raise exception 'This section already has a subject with that name.' using errcode = '23505';
  end;
  return query select v_row.id, v_row.class_id, v_row.name, v_row.subject_code, v_row.description;
end;
$$;

revoke execute on function public.create_subject(uuid, text, text, text) from public, anon;
grant execute on function public.create_subject(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Assessments inside a subject
-- ---------------------------------------------------------------------------

alter table public.assessments
  add column subject_id uuid references public.subjects (id) on delete restrict,
  add column assessment_date date,
  add column due_date date,
  add column instructions text check (instructions is null or char_length(instructions) between 1 and 2000),
  add constraint assessments_due_after_date check (due_date is null or assessment_date is null or due_date >= assessment_date);

create index assessments_subject_id_idx on public.assessments (subject_id);

-- The section an assessment belongs to (null for older assessments with no subject).
create or replace function public.assessment_class(p_assessment_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.class_id from public.assessments a join public.subjects s on s.id = a.subject_id where a.id = p_assessment_id;
$$;

-- The caller created the assessment, or teaches its section.
create or replace function public.teaches_assessment(p_assessment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.owns_assessment(p_assessment_id)
    or coalesce(public.teaches_class(public.assessment_class(p_assessment_id)), false);
$$;

-- The caller may route work to this assessment: it belongs to no section, or the caller is a
-- member of its section, or a parent of a student member.
create or replace function public.can_file_to_assessment(p_assessment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.assessment_class(p_assessment_id) is null then true
    else public.is_class_member(public.assessment_class(p_assessment_id))
      or exists (
        select 1 from public.guardian_links g
        where g.guardian_user_id = (select auth.uid())
          and public.student_in_class(g.student_profile_id, public.assessment_class(p_assessment_id))
      )
  end;
$$;

revoke execute on function public.assessment_class(uuid) from public, anon;
revoke execute on function public.teaches_assessment(uuid) from public, anon;
revoke execute on function public.can_file_to_assessment(uuid) from public, anon;
grant execute on function public.assessment_class(uuid) to authenticated;
grant execute on function public.teaches_assessment(uuid) to authenticated;
grant execute on function public.can_file_to_assessment(uuid) to authenticated;

create policy "Section members can read section assessments"
  on public.assessments for select to authenticated
  using (subject_id is not null and public.is_class_member(public.assessment_class(id)));

create or replace function public.create_subject_assessment(
  p_subject_id uuid,
  p_assessment_type text,
  p_title text,
  p_quarter text,
  p_total_score integer,
  p_assessment_date date default null,
  p_due_date date default null,
  p_instructions text default null
)
returns table (
  id uuid,
  assessment_code text,
  subject_id uuid,
  subject text,
  title text,
  assessment_type text,
  quarter text,
  total_score integer,
  assessment_date date,
  due_date date,
  instructions text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject public.subjects;
  v_uid uuid;
  v_title text := btrim(coalesce(p_title, ''));
  v_instructions text := nullif(btrim(coalesce(p_instructions, '')), '');
  v_row public.assessments;
begin
  select * into v_subject from public.subjects s where s.id = p_subject_id;
  v_uid := public.require_section_teacher(v_subject.class_id);

  if char_length(v_title) not between 1 and 120 then
    raise exception 'Enter a title of 1 to 120 characters.' using errcode = '22023';
  end if;
  if p_total_score is null or p_total_score not between 1 and 1000 then
    raise exception 'Total score must be from 1 to 1000.' using errcode = '22023';
  end if;
  if p_due_date is not null and p_assessment_date is not null and p_due_date < p_assessment_date then
    raise exception 'The due date cannot be before the assessment date.' using errcode = '22023';
  end if;
  if char_length(v_instructions) > 2000 then
    raise exception 'Keep the instructions to 2000 characters.' using errcode = '22023';
  end if;

  for attempt in 1..5 loop
    begin
      insert into public.assessments (
        teacher_user_id, subject_id, subject, title, assessment_type, quarter, total_score,
        assessment_code, assessment_date, due_date, instructions
      )
      values (
        v_uid, v_subject.id, v_subject.name, v_title, p_assessment_type, p_quarter, p_total_score,
        public.generate_assessment_code(), p_assessment_date, p_due_date, v_instructions
      )
      returning * into v_row;
      exit;
    exception when unique_violation then
      if attempt = 5 then raise; end if;
    end;
  end loop;

  return query select v_row.id, v_row.assessment_code, v_row.subject_id, v_row.subject, v_row.title,
    v_row.assessment_type, v_row.quarter, v_row.total_score, v_row.assessment_date, v_row.due_date,
    v_row.instructions, v_row.created_at;
end;
$$;

revoke execute on function public.create_subject_assessment(uuid, text, text, text, integer, date, date, text) from public, anon;
grant execute on function public.create_subject_assessment(uuid, text, text, text, integer, date, date, text) to authenticated;

-- Filing-code lookup now only returns section assessments the caller may file to.
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
      and a.assessment_code = any (select c from unnest(p_codes) as c where c ~ '^[0-9]{5}$')
      and public.can_file_to_assessment(a.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Evidence: section assessments only take work from the section's students.
-- ---------------------------------------------------------------------------

create or replace function public.create_evidence(
  p_evidence_id uuid,
  p_assessment_id uuid,
  p_student_profile_id uuid,
  p_confirmed_code text,
  p_code_source text,
  p_score numeric,
  p_ocr_text text,
  p_ocr_confidence numeric,
  p_ocr_engine text
)
returns table (
  id uuid,
  assessment_id uuid,
  detected_code text,
  status text,
  score numeric,
  uploaded_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_total integer;
  v_class uuid;
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
  select a.total_score into v_total
  from public.assessments a
  where a.id = p_assessment_id and a.status = 'ACTIVE' and a.assessment_code = p_confirmed_code;
  if not found then
    raise exception 'Assessment code does not match an active assessment' using errcode = '22023';
  end if;

  if p_score is null or p_score < 0 or p_score > v_total then
    raise exception 'Score must be between 0 and %', v_total using errcode = '22023';
  end if;

  -- Only the student, or a guardian linked to the student, may submit for them.
  if not public.can_act_for_student(p_student_profile_id) then
    raise exception 'You cannot submit work for this student' using errcode = '42501';
  end if;

  -- A section assessment only takes work from the section's active students.
  v_class := public.assessment_class(p_assessment_id);
  if v_class is not null and not public.student_in_class(p_student_profile_id, v_class) then
    raise exception 'This student is not in that section.' using errcode = '42501';
  end if;

  -- The image must already be uploaded into this user's private folder.
  v_path := v_user::text || '/assessment/' || p_assessment_id::text || '/' || p_evidence_id::text || '.jpg';
  if not exists (
    select 1 from storage.objects o where o.bucket_id = 'evidence' and o.name = v_path
  ) then
    raise exception 'Evidence image not found' using errcode = '22023';
  end if;

  -- OCR-read codes the user confirmed are CODE_MATCHED; manually typed codes are UPLOADED.
  -- Neither is ever TEACHER_VERIFIED: that requires a teacher action.
  v_status := case when p_code_source = 'OCR' then 'CODE_MATCHED' else 'UPLOADED' end;

  insert into public.evidence (
    id, assessment_id, student_profile_id, uploaded_by_user_id, image_path,
    detected_code, code_source, score, ocr_text, ocr_confidence, ocr_engine, status
  )
  values (
    p_evidence_id, p_assessment_id, p_student_profile_id, v_user, v_path,
    p_confirmed_code, p_code_source, round(p_score, 2), left(p_ocr_text, 20000), p_ocr_confidence,
    left(p_ocr_engine, 40), v_status
  )
  returning * into v_row;

  return query select v_row.id, v_row.assessment_id, v_row.detected_code, v_row.status, v_row.score, v_row.uploaded_at;
end;
$$;

-- Section teachers read the section's evidence and its students' names.
create policy "Section teachers can read evidence for section assessments"
  on public.evidence for select to authenticated
  using (public.teaches_assessment(assessment_id));

create or replace function public.teaches_student_profile(p_student_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.student_profiles s
    join public.class_members m on m.user_id = s.owner_user_id and m.member_role = 'STUDENT'
    where s.id = p_student_profile_id and public.teaches_class(m.class_id)
  );
$$;

revoke execute on function public.teaches_student_profile(uuid) from public, anon;
grant execute on function public.teaches_student_profile(uuid) to authenticated;

create policy "Section teachers can read their students' profiles"
  on public.student_profiles for select to authenticated
  using (public.teaches_student_profile(id));

-- Evidence photos are stored at {uploader}/assessment/{assessment id}/{evidence id}.jpg.
create or replace function public.teaches_evidence_path(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (storage.foldername(p_name))[3] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.teaches_assessment(((storage.foldername(p_name))[3])::uuid)
    else false
  end;
$$;

revoke execute on function public.teaches_evidence_path(text) from public, anon;
grant execute on function public.teaches_evidence_path(text) to authenticated;

create policy "Section teachers can read evidence photos for their assessments"
  on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and public.teaches_evidence_path(name));
