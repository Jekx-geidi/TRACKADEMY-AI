-- Teacher verification, audit trail, notifications, reminders and reports
-- (PRD v0.3 §23, §26, §28–§34; v0.5 §16–§22, §42).
--
--   * Section teachers verify, reject (with a reason), correct a score, or exempt a student.
--     An upload is never verified by itself.
--   * Every evidence action is written to audit_logs, which only the section's teachers read.
--   * Notifications are written by the server functions, never by clients. Each user reads
--     only their own. A student's notifications also go to their linked parents.
--   * Reminders reach a whole section, or selected students, plus their parents.
--     Reports reach the student's parents, and the student only when shared with them.

-- ---------------------------------------------------------------------------
-- Evidence review fields and exemptions
-- ---------------------------------------------------------------------------

alter table public.evidence
  add column rejected_by uuid references auth.users (id) on delete set null,
  add column rejected_at timestamptz,
  add column rejection_reason text check (rejection_reason is null or char_length(rejection_reason) between 1 and 500);

create table public.assessment_exemptions (
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  student_profile_id uuid not null references public.student_profiles (id) on delete cascade,
  exempted_by uuid references auth.users (id) on delete set null,
  reason text check (reason is null or char_length(reason) between 1 and 300),
  created_at timestamptz not null default now(),
  primary key (assessment_id, student_profile_id)
);

alter table public.assessment_exemptions enable row level security;
revoke all on public.assessment_exemptions from anon;
revoke insert, update, delete on public.assessment_exemptions from authenticated;
grant select on public.assessment_exemptions to authenticated;

create policy "Section teachers, students and parents can read exemptions"
  on public.assessment_exemptions for select to authenticated
  using (public.teaches_assessment(assessment_id) or public.can_act_for_student(student_profile_id));

-- ---------------------------------------------------------------------------
-- Audit trail
-- ---------------------------------------------------------------------------

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null check (char_length(action) between 1 and 40),
  entity_type text not null check (char_length(entity_type) between 1 and 40),
  entity_id uuid not null,
  class_id uuid references public.classes (id) on delete set null,
  assessment_id uuid references public.assessments (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp()
);

create index audit_logs_entity_idx on public.audit_logs (entity_id, created_at);
create index audit_logs_class_idx on public.audit_logs (class_id, created_at desc);

alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from anon;
revoke insert, update, delete on public.audit_logs from authenticated;
grant select on public.audit_logs to authenticated;

create policy "Section teachers can read the audit trail"
  on public.audit_logs for select to authenticated
  using (
    (class_id is not null and public.teaches_class(class_id))
    or (assessment_id is not null and public.teaches_assessment(assessment_id))
  );

create or replace function public.write_audit(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_class_id uuid,
  p_assessment_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, class_id, assessment_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_class_id, p_assessment_id, coalesce(p_metadata, '{}'::jsonb));
$$;

revoke execute on function public.write_audit(text, text, uuid, uuid, uuid, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in (
    'SUBMISSION_CREATED', 'SUBMISSION_VERIFIED', 'SUBMISSION_REJECTED', 'SCORE_UPDATED',
    'STUDENT_JOINED', 'TEACHER_REMINDER', 'TEACHER_REPORT'
  )),
  title text not null check (char_length(title) between 1 and 200),
  body text check (body is null or char_length(body) <= 1000),
  actor_user_id uuid references auth.users (id) on delete set null,
  class_id uuid references public.classes (id) on delete set null,
  subject_id uuid references public.subjects (id) on delete set null,
  assessment_id uuid references public.assessments (id) on delete set null,
  evidence_id uuid references public.evidence (id) on delete set null,
  student_profile_id uuid references public.student_profiles (id) on delete set null,
  read_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default clock_timestamp()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
revoke all on public.notifications from anon;
revoke insert, update, delete on public.notifications from authenticated;
grant select on public.notifications to authenticated;

create policy "Users read their own notifications"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.notify(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_class_id uuid default null,
  p_subject_id uuid default null,
  p_assessment_id uuid default null,
  p_evidence_id uuid default null,
  p_student_profile_id uuid default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, title, body, actor_user_id, class_id, subject_id, assessment_id, evidence_id, student_profile_id)
  select p_user_id, p_type, left(p_title, 200), left(p_body, 1000), auth.uid(), p_class_id, p_subject_id, p_assessment_id, p_evidence_id, p_student_profile_id
  where p_user_id is not null;
$$;

revoke execute on function public.notify(uuid, text, text, text, uuid, uuid, uuid, uuid, uuid) from public, anon, authenticated;

-- The student's own account (if any), then their linked parents.
create or replace function public.student_family(p_student_profile_id uuid)
returns table (user_id uuid, is_student boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select s.owner_user_id, true from public.student_profiles s where s.id = p_student_profile_id and s.owner_user_id is not null
  union
  select g.guardian_user_id, false from public.guardian_links g where g.student_profile_id = p_student_profile_id;
$$;

revoke execute on function public.student_family(uuid) from public, anon, authenticated;

-- Active teachers of the assessment's section; for older assessments, the teacher who made it.
create or replace function public.assessment_teachers(p_assessment_id uuid)
returns table (user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id from public.class_members m
  where m.class_id = public.assessment_class(p_assessment_id) and m.member_role = 'TEACHER' and m.status = 'ACTIVE'
  union
  select a.teacher_user_id from public.assessments a where a.id = p_assessment_id and a.teacher_user_id is not null;
$$;

revoke execute on function public.assessment_teachers(uuid) from public, anon, authenticated;

create or replace function public.display_score(p_score numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim_scale(p_score)::text;
$$;

create or replace function public.my_name()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(btrim(p.full_name), ''), 'Your teacher') from public.profiles p where p.id = auth.uid();
$$;

revoke execute on function public.my_name() from public, anon, authenticated;

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns integer
language sql
security definer
set search_path = ''
as $$
  with updated as (
    update public.notifications n set read_at = now()
    where n.user_id = auth.uid() and n.read_at is null and (p_ids is null or n.id = any (p_ids))
    returning 1
  )
  select count(*)::int from updated;
$$;

create or replace function public.archive_notification(p_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications n set archived_at = now(), read_at = coalesce(n.read_at, now())
  where n.id = p_id and n.user_id = auth.uid();
$$;

revoke execute on function public.mark_notifications_read(uuid[]) from public, anon;
revoke execute on function public.archive_notification(uuid) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
grant execute on function public.archive_notification(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Evidence creation: audit and notify
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
  v_assessment public.assessments;
  v_class uuid;
  v_path text;
  v_status text;
  v_row public.evidence;
  v_student text;
  v_line text;
  v_member record;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_code_source not in ('OCR', 'MANUAL') then
    raise exception 'Invalid code source' using errcode = '22023';
  end if;

  -- Never trust the client's routing: the confirmed code must belong to this active assessment.
  select * into v_assessment
  from public.assessments a
  where a.id = p_assessment_id and a.status = 'ACTIVE' and a.assessment_code = p_confirmed_code;
  if not found then
    raise exception 'Assessment code does not match an active assessment' using errcode = '22023';
  end if;

  if p_score is null or p_score < 0 or p_score > v_assessment.total_score then
    raise exception 'Score must be between 0 and %', v_assessment.total_score using errcode = '22023';
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

  perform public.write_audit('EVIDENCE_CREATED', 'evidence', v_row.id, v_class, p_assessment_id,
    jsonb_build_object('score', v_row.score, 'code_source', p_code_source));

  select s.display_name into v_student from public.student_profiles s where s.id = p_student_profile_id;
  v_line := public.display_score(v_row.score) || '/' || v_assessment.total_score || ' · Awaiting verification';
  for v_member in select t.user_id from public.assessment_teachers(p_assessment_id) t loop
    perform public.notify(v_member.user_id, 'SUBMISSION_CREATED', v_student || ' submitted ' || v_assessment.title, v_line,
      v_class, v_assessment.subject_id, p_assessment_id, v_row.id, p_student_profile_id);
  end loop;
  for v_member in select f.user_id, f.is_student from public.student_family(p_student_profile_id) f loop
    perform public.notify(v_member.user_id, 'SUBMISSION_CREATED',
      case when v_member.is_student then 'Your ' || v_assessment.title || ' was recorded'
           else v_student || ' submitted ' || v_assessment.title || ' - ' || v_assessment.assessment_code end,
      v_line, v_class, v_assessment.subject_id, p_assessment_id, v_row.id, p_student_profile_id);
  end loop;

  return query select v_row.id, v_row.assessment_id, v_row.detected_code, v_row.status, v_row.score, v_row.uploaded_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- Teacher review
-- ---------------------------------------------------------------------------

-- Locks and returns the evidence row, if the caller teaches its assessment.
create or replace function public.evidence_for_review(p_evidence_id uuid)
returns public.evidence
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.evidence;
begin
  if auth.uid() is null then
    raise exception 'Please sign in first.' using errcode = '28000';
  end if;
  select * into v_row from public.evidence e where e.id = p_evidence_id for update;
  if not found or not public.teaches_assessment(v_row.assessment_id) then
    raise exception 'Only teachers of this section can do that.' using errcode = '42501';
  end if;
  return v_row;
end;
$$;

revoke execute on function public.evidence_for_review(uuid) from public, anon, authenticated;

-- Notifies the student's family about a reviewed paper.
create or replace function public.notify_review(p_row public.evidence, p_type text, p_verb text, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assessment public.assessments;
  v_student text;
  v_member record;
begin
  select * into v_assessment from public.assessments a where a.id = p_row.assessment_id;
  select s.display_name into v_student from public.student_profiles s where s.id = p_row.student_profile_id;
  for v_member in select f.user_id, f.is_student from public.student_family(p_row.student_profile_id) f loop
    perform public.notify(v_member.user_id, p_type,
      case when v_member.is_student then 'Your ' || v_assessment.title
           else v_student || '''s ' || v_assessment.title end || ' ' || p_verb,
      p_body, public.assessment_class(p_row.assessment_id), v_assessment.subject_id, p_row.assessment_id, p_row.id, p_row.student_profile_id);
  end loop;
end;
$$;

revoke execute on function public.notify_review(public.evidence, text, text, text) from public, anon, authenticated;

create or replace function public.verify_evidence(p_evidence_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.evidence := public.evidence_for_review(p_evidence_id);
  v_total integer;
begin
  update public.evidence e
  set status = 'TEACHER_VERIFIED', verified_by = auth.uid(), verified_at = now(),
      rejected_by = null, rejected_at = null, rejection_reason = null
  where e.id = p_evidence_id
  returning * into v_row;

  perform public.write_audit('EVIDENCE_VERIFIED', 'evidence', v_row.id, public.assessment_class(v_row.assessment_id), v_row.assessment_id,
    jsonb_build_object('score', v_row.score));
  select a.total_score into v_total from public.assessments a where a.id = v_row.assessment_id;
  perform public.notify_review(v_row, 'SUBMISSION_VERIFIED', 'was verified by ' || public.my_name(),
    'Score: ' || public.display_score(v_row.score) || '/' || v_total);
end;
$$;

create or replace function public.reject_evidence(p_evidence_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := btrim(coalesce(p_reason, ''));
  v_row public.evidence := public.evidence_for_review(p_evidence_id);
begin
  if char_length(v_reason) not between 1 and 500 then
    raise exception 'Give a reason so the student knows what to fix.' using errcode = '22023';
  end if;

  update public.evidence e
  set status = 'REJECTED', rejected_by = auth.uid(), rejected_at = now(), rejection_reason = v_reason,
      verified_by = null, verified_at = null
  where e.id = p_evidence_id
  returning * into v_row;

  perform public.write_audit('EVIDENCE_REJECTED', 'evidence', v_row.id, public.assessment_class(v_row.assessment_id), v_row.assessment_id,
    jsonb_build_object('reason', v_reason));
  perform public.notify_review(v_row, 'SUBMISSION_REJECTED', 'needs another look', v_reason);
end;
$$;

create or replace function public.correct_evidence_score(p_evidence_id uuid, p_score numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.evidence := public.evidence_for_review(p_evidence_id);
  v_from numeric := v_row.score;
  v_total integer;
begin
  select a.total_score into v_total from public.assessments a where a.id = v_row.assessment_id;
  if p_score is null or p_score < 0 or p_score > v_total then
    raise exception 'Score must be from 0 to %.', v_total using errcode = '22023';
  end if;

  update public.evidence e set score = round(p_score, 2) where e.id = p_evidence_id returning * into v_row;

  perform public.write_audit('SCORE_CORRECTED', 'evidence', v_row.id, public.assessment_class(v_row.assessment_id), v_row.assessment_id,
    jsonb_build_object('from', trim_scale(v_from), 'to', trim_scale(v_row.score)));
  perform public.notify_review(v_row, 'SCORE_UPDATED', 'score was updated',
    'Score: ' || public.display_score(v_row.score) || '/' || v_total);
end;
$$;

create or replace function public.set_exemption(p_assessment_id uuid, p_student_profile_id uuid, p_exempt boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid := public.assessment_class(p_assessment_id);
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Please sign in first.' using errcode = '28000';
  end if;
  if v_class is null or not public.teaches_class(v_class) then
    raise exception 'Only teachers of this section can do that.' using errcode = '42501';
  end if;
  if not public.student_in_class(p_student_profile_id, v_class) then
    raise exception 'This student is not in that section.' using errcode = '42501';
  end if;

  if coalesce(p_exempt, false) then
    insert into public.assessment_exemptions (assessment_id, student_profile_id, exempted_by, reason)
    values (p_assessment_id, p_student_profile_id, auth.uid(), left(v_reason, 300))
    on conflict (assessment_id, student_profile_id) do update set reason = excluded.reason;
  else
    delete from public.assessment_exemptions x where x.assessment_id = p_assessment_id and x.student_profile_id = p_student_profile_id;
  end if;

  perform public.write_audit(case when p_exempt then 'STUDENT_EXEMPTED' else 'EXEMPTION_REMOVED' end,
    'student_profile', p_student_profile_id, v_class, p_assessment_id, jsonb_build_object('reason', v_reason));
end;
$$;

revoke execute on function public.verify_evidence(uuid) from public, anon;
revoke execute on function public.reject_evidence(uuid, text) from public, anon;
revoke execute on function public.correct_evidence_score(uuid, numeric) from public, anon;
revoke execute on function public.set_exemption(uuid, uuid, boolean, text) from public, anon;
grant execute on function public.verify_evidence(uuid) to authenticated;
grant execute on function public.reject_evidence(uuid, text) to authenticated;
grant execute on function public.correct_evidence_score(uuid, numeric) to authenticated;
grant execute on function public.set_exemption(uuid, uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Joining tells the section's teachers
-- ---------------------------------------------------------------------------

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
  v_changed boolean;
  v_teacher record;
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

  with upserted as (
    insert into public.class_members (class_id, user_id, member_role)
    values (v_class.id, v_uid, v_role)
    on conflict (class_id, user_id) do update
      set status = 'ACTIVE', status_changed_at = now()
      where public.class_members.status <> 'ACTIVE'
    returning 1
  )
  select exists (select 1 from upserted) into v_changed;

  if v_changed and v_role = 'STUDENT' then
    for v_teacher in
      select m.user_id from public.class_members m
      where m.class_id = v_class.id and m.member_role = 'TEACHER' and m.status = 'ACTIVE'
    loop
      perform public.notify(v_teacher.user_id, 'STUDENT_JOINED', coalesce(public.my_name(), 'A student') || ' joined ' || v_class.name, null, v_class.id);
    end loop;
  end if;

  return query select v_class.id, v_class.name;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reminders
-- ---------------------------------------------------------------------------

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid references auth.users (id) on delete set null,
  class_id uuid not null references public.classes (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  assessment_id uuid references public.assessments (id) on delete set null,
  message text not null check (char_length(message) between 1 and 500),
  due_date date,
  created_at timestamptz not null default now()
);

create table public.reminder_recipients (
  reminder_id uuid not null references public.reminders (id) on delete cascade,
  student_profile_id uuid not null references public.student_profiles (id) on delete cascade,
  primary key (reminder_id, student_profile_id)
);

alter table public.reminders enable row level security;
alter table public.reminder_recipients enable row level security;
revoke all on public.reminders, public.reminder_recipients from anon;
revoke insert, update, delete on public.reminders, public.reminder_recipients from authenticated;
grant select on public.reminders, public.reminder_recipients to authenticated;

create policy "Recipients read their reminder links"
  on public.reminder_recipients for select to authenticated
  using (public.can_act_for_student(student_profile_id) or public.teaches_student_profile(student_profile_id));

create or replace function public.is_reminder_recipient(p_reminder_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.reminder_recipients r
    where r.reminder_id = p_reminder_id and public.can_act_for_student(r.student_profile_id)
  );
$$;

revoke execute on function public.is_reminder_recipient(uuid) from public, anon;
grant execute on function public.is_reminder_recipient(uuid) to authenticated;

create policy "Section teachers and recipients read reminders"
  on public.reminders for select to authenticated
  using (public.teaches_class(class_id) or public.is_reminder_recipient(id));

-- p_student_profile_ids null = every active student in the section.
create or replace function public.send_reminder(
  p_class_id uuid,
  p_message text,
  p_student_profile_ids uuid[] default null,
  p_subject_id uuid default null,
  p_assessment_id uuid default null,
  p_due_date date default null
)
returns table (id uuid, recipients integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_section_teacher(p_class_id);
  v_message text := btrim(coalesce(p_message, ''));
  v_reminder public.reminders;
  v_students uuid[];
  v_student uuid;
  v_member record;
  v_title text := 'Reminder from ' || public.my_name();
begin
  if char_length(v_message) not between 1 and 500 then
    raise exception 'Write a reminder of 1 to 500 characters.' using errcode = '22023';
  end if;
  if p_subject_id is not null and not exists (select 1 from public.subjects s where s.id = p_subject_id and s.class_id = p_class_id) then
    raise exception 'That subject is not in this section.' using errcode = '22023';
  end if;
  if p_assessment_id is not null and public.assessment_class(p_assessment_id) is distinct from p_class_id then
    raise exception 'That assessment is not in this section.' using errcode = '22023';
  end if;

  if p_student_profile_ids is null then
    select coalesce(array_agg(s.id), '{}') into v_students
    from public.class_members m join public.student_profiles s on s.owner_user_id = m.user_id
    where m.class_id = p_class_id and m.member_role = 'STUDENT' and m.status = 'ACTIVE';
  else
    v_students := array(select distinct unnest(p_student_profile_ids));
    foreach v_student in array v_students loop
      if not public.student_in_class(v_student, p_class_id) then
        raise exception 'This student is not in that section.' using errcode = '42501';
      end if;
    end loop;
  end if;

  insert into public.reminders (teacher_user_id, class_id, subject_id, assessment_id, message, due_date)
  values (v_uid, p_class_id, p_subject_id, p_assessment_id, v_message, p_due_date)
  returning * into v_reminder;

  foreach v_student in array v_students loop
    insert into public.reminder_recipients (reminder_id, student_profile_id) values (v_reminder.id, v_student);
    for v_member in select f.user_id from public.student_family(v_student) f loop
      perform public.notify(v_member.user_id, 'TEACHER_REMINDER', v_title, v_message, p_class_id, p_subject_id, p_assessment_id, null, v_student);
    end loop;
  end loop;

  perform public.write_audit('REMINDER_SENT', 'reminder', v_reminder.id, p_class_id, p_assessment_id,
    jsonb_build_object('recipients', cardinality(v_students)));
  return query select v_reminder.id, cardinality(v_students);
end;
$$;

revoke execute on function public.send_reminder(uuid, text, uuid[], uuid, uuid, date) from public, anon;
grant execute on function public.send_reminder(uuid, text, uuid[], uuid, uuid, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Teacher reports
-- ---------------------------------------------------------------------------

create table public.teacher_reports (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid references auth.users (id) on delete set null,
  class_id uuid not null references public.classes (id) on delete cascade,
  student_profile_id uuid not null references public.student_profiles (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  category text not null check (category in ('GOOD_PROGRESS', 'NEEDS_IMPROVEMENT', 'MISSING_REQUIREMENTS', 'PARTICIPATION', 'GENERAL_NOTE')),
  message text not null check (char_length(message) between 1 and 2000),
  visible_to_student boolean not null default false,
  created_at timestamptz not null default now()
);

create index teacher_reports_student_idx on public.teacher_reports (student_profile_id, created_at desc);

alter table public.teacher_reports enable row level security;
revoke all on public.teacher_reports from anon;
revoke insert, update, delete on public.teacher_reports from authenticated;
grant select on public.teacher_reports to authenticated;

create or replace function public.is_guardian_of(p_student_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.guardian_links g
    where g.student_profile_id = p_student_profile_id and g.guardian_user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_guardian_of(uuid) from public, anon;
grant execute on function public.is_guardian_of(uuid) to authenticated;

create policy "Teachers, parents and shared students read reports"
  on public.teacher_reports for select to authenticated
  using (
    public.teaches_class(class_id)
    or public.is_guardian_of(student_profile_id)
    or (visible_to_student and exists (
      select 1 from public.student_profiles s where s.id = student_profile_id and s.owner_user_id = (select auth.uid())
    ))
  );

create or replace function public.send_report(
  p_class_id uuid,
  p_student_profile_id uuid,
  p_category text,
  p_message text,
  p_subject_id uuid default null,
  p_visible_to_student boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_section_teacher(p_class_id);
  v_message text := btrim(coalesce(p_message, ''));
  v_report public.teacher_reports;
  v_member record;
  v_label text;
begin
  if not public.student_in_class(p_student_profile_id, p_class_id) then
    raise exception 'This student is not in that section.' using errcode = '42501';
  end if;
  if char_length(v_message) not between 1 and 2000 then
    raise exception 'Write a report of 1 to 2000 characters.' using errcode = '22023';
  end if;
  if p_subject_id is not null and not exists (select 1 from public.subjects s where s.id = p_subject_id and s.class_id = p_class_id) then
    raise exception 'That subject is not in this section.' using errcode = '22023';
  end if;

  insert into public.teacher_reports (teacher_user_id, class_id, student_profile_id, subject_id, category, message, visible_to_student)
  values (v_uid, p_class_id, p_student_profile_id, p_subject_id, p_category, v_message, coalesce(p_visible_to_student, false))
  returning * into v_report;

  v_label := case p_category
    when 'GOOD_PROGRESS' then 'Good progress'
    when 'NEEDS_IMPROVEMENT' then 'Needs improvement'
    when 'MISSING_REQUIREMENTS' then 'Missing requirements'
    when 'PARTICIPATION' then 'Participation'
    else 'Note' end;
  for v_member in select f.user_id, f.is_student from public.student_family(p_student_profile_id) f loop
    if not v_member.is_student or v_report.visible_to_student then
      perform public.notify(v_member.user_id, 'TEACHER_REPORT', v_label || ' report from ' || public.my_name(), v_message,
        p_class_id, p_subject_id, null, null, p_student_profile_id);
    end if;
  end loop;

  perform public.write_audit('REPORT_SENT', 'teacher_report', v_report.id, p_class_id, null,
    jsonb_build_object('category', p_category, 'student_profile_id', p_student_profile_id));
  return v_report.id;
end;
$$;

revoke execute on function public.send_report(uuid, uuid, text, text, uuid, boolean) from public, anon;
grant execute on function public.send_report(uuid, uuid, text, text, uuid, boolean) to authenticated;
