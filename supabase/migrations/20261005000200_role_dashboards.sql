-- Trackademic — role dashboards: real students on evidence, scores, and read access per role.
--
--   * Evidence now attaches to a real student: the student's own profile, or a child the
--     signed-in parent is linked to. Test students are no longer accepted.
--   * Evidence records the score the uploader read off the paper (0..total_score).
--     A recorded score is still not teacher-verified.
--   * Read access (all writes still go through SECURITY DEFINER functions):
--       - students and linked guardians read the student's evidence;
--       - teachers read evidence submitted for their own assessments, and the names of
--         those students;
--       - anyone who can read an evidence row can read its assessment's routing fields.
--   * Visibility checks live in SECURITY DEFINER helpers so policies never recurse.

-- ---------------------------------------------------------------------------
-- Score
-- ---------------------------------------------------------------------------

alter table public.evidence
  add column score numeric(7, 2) check (score is null or score >= 0);

create index evidence_uploaded_at_idx on public.evidence (uploaded_at desc);

-- ---------------------------------------------------------------------------
-- Visibility helpers
-- ---------------------------------------------------------------------------

-- The caller is the student, or a guardian linked to the student.
create or replace function public.can_act_for_student(p_student_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.student_profiles s
    where s.id = p_student_profile_id and s.owner_user_id = (select auth.uid())
  ) or exists (
    select 1 from public.guardian_links g
    where g.student_profile_id = p_student_profile_id and g.guardian_user_id = (select auth.uid())
  );
$$;

-- The caller teaches an assessment this student has submitted evidence for.
create or replace function public.teaches_student(p_student_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.evidence e
    join public.assessments a on a.id = e.assessment_id
    where e.student_profile_id = p_student_profile_id and a.teacher_user_id = (select auth.uid())
  );
$$;

-- The caller owns the assessment.
create or replace function public.owns_assessment(p_assessment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assessments a
    where a.id = p_assessment_id and a.teacher_user_id = (select auth.uid())
  );
$$;

-- The caller can see at least one evidence row for this assessment.
create or replace function public.has_evidence_for_assessment(p_assessment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.evidence e
    where e.assessment_id = p_assessment_id
      and (e.uploaded_by_user_id = (select auth.uid()) or public.can_act_for_student(e.student_profile_id))
  );
$$;

revoke execute on function public.can_act_for_student(uuid) from public, anon;
revoke execute on function public.teaches_student(uuid) from public, anon;
revoke execute on function public.owns_assessment(uuid) from public, anon;
revoke execute on function public.has_evidence_for_assessment(uuid) from public, anon;
grant execute on function public.can_act_for_student(uuid) to authenticated;
grant execute on function public.teaches_student(uuid) to authenticated;
grant execute on function public.owns_assessment(uuid) to authenticated;
grant execute on function public.has_evidence_for_assessment(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Read policies
-- ---------------------------------------------------------------------------

create policy "Students and guardians can read the student's evidence"
  on public.evidence for select to authenticated
  using (public.can_act_for_student(student_profile_id));

create policy "Teachers can read evidence for their assessments"
  on public.evidence for select to authenticated
  using (public.owns_assessment(assessment_id));

create policy "Evidence viewers can read its assessment"
  on public.assessments for select to authenticated
  using (public.has_evidence_for_assessment(id));

create policy "Teachers can read students who submitted to them"
  on public.student_profiles for select to authenticated
  using (public.teaches_student(id));

-- ---------------------------------------------------------------------------
-- Evidence creation: real students only, with a validated score.
-- ---------------------------------------------------------------------------

drop function public.create_evidence(uuid, uuid, uuid, text, text, text, numeric, text);

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

revoke execute on function public.create_evidence(uuid, uuid, uuid, text, text, numeric, text, numeric, text) from public, anon;
grant execute on function public.create_evidence(uuid, uuid, uuid, text, text, numeric, text, numeric, text) to authenticated;
