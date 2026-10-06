-- Student experience (PRD v0.7): Dashboard, Classes, Upload, Notifications, Profile.
--   * student_work(): every assessment in the student's sections with a student-facing status
--     (VERIFIED, PENDING, NEEDS_RESUBMISSION, MISSING, OVERDUE, EXEMPT); powers My Work,
--     My Lacking and My Records.
--   * student_classes(), student_subjects(), student_dashboard(), student_record().
--   * class_classmates(): classmates' names only (never their work), when the teacher allows it.
--   * leave_class(), my_guardians(), new_my_link_code().
--   * Students are told about new assessments and that they joined a class.
--   * Students and parents can open the evidence photos of the student's own records.
-- Every function takes an optional student profile so a linked parent can use it later;
-- by default it is the caller's own student profile.

-- ---------------------------------------------------------------------------
-- Settings and notification types
-- ---------------------------------------------------------------------------

alter table public.classes
  add column show_classmates boolean not null default true;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'SUBMISSION_CREATED', 'SUBMISSION_VERIFIED', 'SUBMISSION_REJECTED', 'SCORE_UPDATED',
  'STUDENT_JOINED', 'STUDENT_LEFT', 'TEACHER_REMINDER', 'TEACHER_REPORT',
  'ASSESSMENT_CREATED', 'CLASS_JOINED'
));

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- The student profile to read: the caller's own by default, or one they may act for.
create or replace function public.resolve_student(p_student_profile_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Please sign in first.' using errcode = '28000';
  end if;
  if p_student_profile_id is null then
    select s.id into v_id from public.student_profiles s where s.owner_user_id = auth.uid();
    if v_id is null then
      raise exception 'Set up your student account first.' using errcode = 'P0001';
    end if;
    return v_id;
  end if;
  if not public.can_act_for_student(p_student_profile_id) then
    raise exception 'You cannot see this student’s records.' using errcode = '42501';
  end if;
  return p_student_profile_id;
end;
$$;

-- Sections the student is an active member of.
create or replace function public.student_class_ids(p_student_profile_id uuid)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(m.class_id), '{}')
  from public.class_members m
  join public.student_profiles s on s.owner_user_id = m.user_id
  where s.id = p_student_profile_id and m.member_role = 'STUDENT' and m.status = 'ACTIVE';
$$;

-- One row per active assessment in the sections, with the student's latest paper for it:
-- a paper that is not rejected wins over a rejected one, then the newest.
create or replace function public.student_work_items(p_student_profile_id uuid, p_class_ids uuid[])
returns table (
  assessment_id uuid,
  title text,
  assessment_type text,
  quarter text,
  assessment_code text,
  total_score integer,
  assessment_date date,
  due_date date,
  created_at timestamptz,
  subject_id uuid,
  subject_name text,
  class_id uuid,
  class_name text,
  evidence_id uuid,
  score numeric,
  evidence_status text,
  uploaded_at timestamptz,
  verified_at timestamptz,
  work_status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.title, a.assessment_type, a.quarter, a.assessment_code, a.total_score, a.assessment_date, a.due_date, a.created_at,
    sub.id, sub.name, c.id, c.name,
    e.id, e.score, e.status, e.uploaded_at, e.verified_at,
    case
      when e.id is not null and e.status = 'TEACHER_VERIFIED' then 'VERIFIED'
      when e.id is not null and e.status <> 'REJECTED' then 'PENDING'
      when x.assessment_id is not null then 'EXEMPT'
      when e.id is not null then 'NEEDS_RESUBMISSION'
      when a.due_date < current_date then 'OVERDUE'
      else 'MISSING'
    end
  from public.assessments a
  join public.subjects sub on sub.id = a.subject_id
  join public.classes c on c.id = sub.class_id
  left join lateral (
    select ev.id, ev.score, ev.status, ev.uploaded_at, ev.verified_at
    from public.evidence ev
    where ev.assessment_id = a.id and ev.student_profile_id = p_student_profile_id
    order by (ev.status <> 'REJECTED') desc, ev.uploaded_at desc
    limit 1
  ) e on true
  left join public.assessment_exemptions x on x.assessment_id = a.id and x.student_profile_id = p_student_profile_id
  where c.id = any (p_class_ids) and a.status = 'ACTIVE';
$$;

-- First active teacher of the section by name, else the adviser typed at creation.
create or replace function public.section_teacher_name(p_class_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select nullif(btrim(p.full_name), '') from public.class_members m join public.profiles p on p.id = m.user_id
     where m.class_id = p_class_id and m.member_role = 'TEACHER' and m.status = 'ACTIVE'
     order by m.joined_at limit 1),
    (select c.adviser_name from public.classes c where c.id = p_class_id)
  );
$$;

revoke execute on function public.resolve_student(uuid) from public, anon, authenticated;
revoke execute on function public.student_class_ids(uuid) from public, anon, authenticated;
revoke execute on function public.student_work_items(uuid, uuid[]) from public, anon, authenticated;
revoke execute on function public.section_teacher_name(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- My Work / My Lacking / My Records
-- ---------------------------------------------------------------------------

-- p_status: '' (all), SUBMITTED (verified + pending), LACKING (missing + overdue + resubmit),
-- or one work status. Lacking work is listed soonest-due first; everything else newest first.
create or replace function public.student_work(
  p_student_profile_id uuid default null,
  p_class_id uuid default null,
  p_subject_id uuid default null,
  p_search text default null,
  p_quarter text default null,
  p_type text default null,
  p_status text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  assessment_id uuid,
  title text,
  assessment_type text,
  quarter text,
  assessment_code text,
  total_score integer,
  assessment_date date,
  due_date date,
  subject_id uuid,
  subject_name text,
  class_id uuid,
  class_name text,
  evidence_id uuid,
  score numeric,
  evidence_status text,
  uploaded_at timestamptz,
  verified_at timestamptz,
  work_status text,
  total_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_student uuid := public.resolve_student(p_student_profile_id);
  v_status text := nullif(btrim(coalesce(p_status, '')), '');
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
begin
  return query
    with items as (
      select w.* from public.student_work_items(v_student, public.student_class_ids(v_student)) w
      where (p_class_id is null or w.class_id = p_class_id)
        and (p_subject_id is null or w.subject_id = p_subject_id)
        and (nullif(p_quarter, '') is null or w.quarter = p_quarter)
        and (nullif(p_type, '') is null or w.assessment_type = p_type)
        and (v_search is null or w.title ilike '%' || v_search || '%' or w.subject_name ilike '%' || v_search || '%' or w.assessment_code = v_search)
        and (v_status is null
          or (v_status = 'SUBMITTED' and w.work_status in ('VERIFIED', 'PENDING'))
          or (v_status = 'LACKING' and w.work_status in ('MISSING', 'OVERDUE', 'NEEDS_RESUBMISSION'))
          or w.work_status = v_status)
    )
    select i.assessment_id, i.title, i.assessment_type, i.quarter, i.assessment_code, i.total_score, i.assessment_date, i.due_date,
      i.subject_id, i.subject_name, i.class_id, i.class_name, i.evidence_id, i.score, i.evidence_status, i.uploaded_at, i.verified_at,
      i.work_status, (count(*) over ())::int
    from items i
    order by
      case when v_status = 'LACKING' then i.due_date end asc nulls last,
      case when v_status = 'LACKING' then i.created_at end asc,
      coalesce(i.uploaded_at, i.created_at) desc,
      i.title
    limit least(greatest(coalesce(p_limit, 20), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- Classes and subjects
-- ---------------------------------------------------------------------------

create or replace function public.student_classes(p_student_profile_id uuid default null)
returns table (
  class_id uuid,
  name text,
  grade_level integer,
  section text,
  school_year text,
  school_name text,
  teacher_name text,
  subject_count integer,
  lacking_count integer,
  pending_count integer,
  joined_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_student uuid := public.resolve_student(p_student_profile_id);
  v_classes uuid[] := public.student_class_ids(v_student);
begin
  return query
    with items as (select * from public.student_work_items(v_student, v_classes))
    select c.id, c.name, c.grade_level::int, c.section, c.school_year, c.school_name, public.section_teacher_name(c.id),
      (select count(*)::int from public.subjects sub where sub.class_id = c.id),
      (select count(*)::int from items i where i.class_id = c.id and i.work_status in ('MISSING', 'OVERDUE', 'NEEDS_RESUBMISSION')),
      (select count(*)::int from items i where i.class_id = c.id and i.work_status = 'PENDING'),
      m.joined_at
    from public.classes c
    join public.class_members m on m.class_id = c.id
    join public.student_profiles s on s.owner_user_id = m.user_id and s.id = v_student
    where c.id = any (v_classes) and m.member_role = 'STUDENT'
    order by m.joined_at, c.name;
end;
$$;

-- p_status: LACKING, PENDING, COMPLETE or NO_WORK.
create or replace function public.student_subjects(
  p_class_id uuid,
  p_student_profile_id uuid default null,
  p_search text default null,
  p_quarter text default null,
  p_status text default null
)
returns table (
  subject_id uuid,
  name text,
  assessment_count integer,
  record_count integer,
  verified_count integer,
  pending_count integer,
  lacking_count integer,
  status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_student uuid := public.resolve_student(p_student_profile_id);
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not (p_class_id = any (public.student_class_ids(v_student))) then
    raise exception 'You are not in that class.' using errcode = '42501';
  end if;
  return query
    with items as (
      select * from public.student_work_items(v_student, array[p_class_id]) w
      where nullif(p_quarter, '') is null or w.quarter = p_quarter
    ),
    counts as (
      select sub.id, sub.name,
        count(i.assessment_id) filter (where i.work_status <> 'EXEMPT')::int as assessments,
        count(i.assessment_id) filter (where i.work_status in ('VERIFIED', 'PENDING'))::int as records,
        count(i.assessment_id) filter (where i.work_status = 'VERIFIED')::int as verified,
        count(i.assessment_id) filter (where i.work_status = 'PENDING')::int as pending,
        count(i.assessment_id) filter (where i.work_status in ('MISSING', 'OVERDUE', 'NEEDS_RESUBMISSION'))::int as lacking
      from public.subjects sub
      left join items i on i.subject_id = sub.id
      where sub.class_id = p_class_id and (v_search is null or sub.name ilike '%' || v_search || '%')
      group by sub.id, sub.name
    ),
    labelled as (
      select k.*, case
        when k.lacking > 0 then 'LACKING'
        when k.pending > 0 then 'PENDING'
        when k.assessments > 0 then 'COMPLETE'
        else 'NO_WORK' end as st
      from counts k
    )
    select l.id, l.name, l.assessments, l.records, l.verified, l.pending, l.lacking, l.st
    from labelled l
    where nullif(p_status, '') is null or l.st = p_status
    order by l.name;
end;
$$;

-- ---------------------------------------------------------------------------
-- Dashboard
-- ---------------------------------------------------------------------------

-- The header shows the most recently joined section; counts cover every section.
create or replace function public.student_dashboard(p_student_profile_id uuid default null)
returns table (
  display_name text,
  class_id uuid,
  class_name text,
  grade_level integer,
  section text,
  school_year text,
  class_count integer,
  new_scores integer,
  missing integer,
  overdue integer,
  needs_resubmission integer,
  pending integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_student uuid := public.resolve_student(p_student_profile_id);
  v_classes uuid[] := public.student_class_ids(v_student);
begin
  return query
    with items as (select * from public.student_work_items(v_student, v_classes)),
    latest as (
      select c.id, c.name, c.grade_level::int as grade_level, c.section, c.school_year
      from public.classes c
      join public.class_members m on m.class_id = c.id
      join public.student_profiles s on s.owner_user_id = m.user_id and s.id = v_student
      where c.id = any (v_classes) and m.member_role = 'STUDENT'
      order by m.joined_at desc
      limit 1
    )
    select s.display_name, l.id, l.name, l.grade_level, l.section, l.school_year,
      coalesce(array_length(v_classes, 1), 0),
      (select count(*)::int from items i where i.work_status = 'VERIFIED' and i.verified_at > now() - interval '7 days'),
      (select count(*)::int from items i where i.work_status = 'MISSING'),
      (select count(*)::int from items i where i.work_status = 'OVERDUE'),
      (select count(*)::int from items i where i.work_status = 'NEEDS_RESUBMISSION'),
      (select count(*)::int from items i where i.work_status = 'PENDING')
    from public.student_profiles s
    left join latest l on true
    where s.id = v_student;
end;
$$;

-- ---------------------------------------------------------------------------
-- One record
-- ---------------------------------------------------------------------------

create or replace function public.student_record(p_evidence_id uuid)
returns table (
  evidence_id uuid,
  assessment_id uuid,
  title text,
  assessment_type text,
  quarter text,
  assessment_code text,
  total_score integer,
  due_date date,
  subject_id uuid,
  subject_name text,
  class_id uuid,
  class_name text,
  student_profile_id uuid,
  score numeric,
  evidence_status text,
  work_status text,
  code_source text,
  image_path text,
  uploaded_at timestamptz,
  verified_at timestamptz,
  teacher_name text,
  teacher_note text,
  replaced boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_row public.evidence;
begin
  select * into v_row from public.evidence e where e.id = p_evidence_id;
  if auth.uid() is null or v_row.id is null or not public.can_act_for_student(v_row.student_profile_id) then
    raise exception 'You cannot see this student’s records.' using errcode = '42501';
  end if;
  return query
    select v_row.id, a.id, a.title, a.assessment_type, a.quarter, a.assessment_code, a.total_score, a.due_date,
      sub.id, coalesce(sub.name, a.subject), c.id, c.name, v_row.student_profile_id,
      v_row.score, v_row.status,
      case v_row.status when 'TEACHER_VERIFIED' then 'VERIFIED' when 'REJECTED' then 'NEEDS_RESUBMISSION' else 'PENDING' end,
      v_row.code_source, v_row.image_path, v_row.uploaded_at, v_row.verified_at,
      coalesce(
        (select nullif(btrim(p.full_name), '') from public.profiles p where p.id = coalesce(v_row.verified_by, v_row.rejected_by)),
        case when c.id is not null then public.section_teacher_name(c.id) end,
        (select nullif(btrim(p.full_name), '') from public.profiles p where p.id = a.teacher_user_id)
      ),
      v_row.rejection_reason,
      exists (
        select 1 from public.evidence n
        where n.assessment_id = v_row.assessment_id and n.student_profile_id = v_row.student_profile_id
          and n.id <> v_row.id and n.status <> 'REJECTED' and n.uploaded_at > v_row.uploaded_at
      )
    from public.assessments a
    left join public.subjects sub on sub.id = a.subject_id
    left join public.classes c on c.id = sub.class_id
    where a.id = v_row.assessment_id;
end;
$$;

-- Students and parents can open the photos of the student's own papers, whoever uploaded them.
create or replace function public.can_view_evidence_path(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.evidence e
    where e.image_path = p_name and public.can_act_for_student(e.student_profile_id)
  );
$$;

revoke execute on function public.can_view_evidence_path(text) from public, anon;
grant execute on function public.can_view_evidence_path(text) to authenticated;

create policy "Students and parents can read the student's evidence photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and public.can_view_evidence_path(name));

-- ---------------------------------------------------------------------------
-- Classmates (names only)
-- ---------------------------------------------------------------------------

create or replace function public.class_classmates(p_class_id uuid)
returns table (display_name text, is_me boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_class_member(p_class_id) then
    raise exception 'You are not in that class.' using errcode = '42501';
  end if;
  return query
    select s.display_name, m.user_id = auth.uid()
    from public.class_members m
    join public.student_profiles s on s.owner_user_id = m.user_id
    join public.classes c on c.id = m.class_id
    where m.class_id = p_class_id and m.member_role = 'STUDENT' and m.status = 'ACTIVE' and c.show_classmates
    order by m.user_id = auth.uid() desc, s.display_name;
end;
$$;

create or replace function public.set_classmates_visible(p_class_id uuid, p_visible boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_section_teacher(p_class_id);
  update public.classes c set show_classmates = coalesce(p_visible, true) where c.id = p_class_id;
  perform public.write_audit('CLASSMATES_VISIBILITY_CHANGED', 'class', p_class_id, p_class_id, null,
    jsonb_build_object('visible', coalesce(p_visible, true)));
end;
$$;

-- ---------------------------------------------------------------------------
-- Leaving a class (history is kept; joining again restores it)
-- ---------------------------------------------------------------------------

create or replace function public.leave_class(p_class_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_class public.classes;
  v_student uuid;
  v_teacher record;
begin
  update public.class_members m
  set status = 'REMOVED', status_changed_at = now()
  where m.class_id = p_class_id and m.user_id = v_uid and m.member_role = 'STUDENT' and m.status = 'ACTIVE';
  if v_uid is null or not found then
    raise exception 'You are not in that class.' using errcode = '42501';
  end if;

  select * into v_class from public.classes c where c.id = p_class_id;
  select s.id into v_student from public.student_profiles s where s.owner_user_id = v_uid;
  perform public.write_audit('STUDENT_LEFT', 'class', p_class_id, p_class_id, null, jsonb_build_object('student_profile_id', v_student));
  for v_teacher in
    select m.user_id from public.class_members m
    where m.class_id = p_class_id and m.member_role = 'TEACHER' and m.status = 'ACTIVE'
  loop
    perform public.notify(v_teacher.user_id, 'STUDENT_LEFT', coalesce(public.my_name(), 'A student') || ' left ' || v_class.name, null,
      p_class_id, null, null, null, v_student);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Guardians
-- ---------------------------------------------------------------------------

create or replace function public.my_guardians()
returns table (display_name text, linked_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(btrim(p.full_name), ''), 'Parent or guardian'), g.created_at
  from public.student_profiles s
  join public.guardian_links g on g.student_profile_id = s.id
  left join public.profiles p on p.id = g.guardian_user_id
  where s.owner_user_id = auth.uid()
  order by g.created_at;
$$;

-- A new parent link code; the old one stops working. Existing links stay.
create or replace function public.new_my_link_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  if auth.uid() is null or not exists (select 1 from public.student_profiles s where s.owner_user_id = auth.uid()) then
    raise exception 'Set up your student account first.' using errcode = 'P0001';
  end if;
  for attempt in 1..10 loop
    begin
      update public.student_profiles s set link_code = public.generate_join_code()
      where s.owner_user_id = auth.uid()
      returning s.link_code into v_code;
      return v_code;
    exception when unique_violation then
      if attempt = 10 then raise; end if;
    end;
  end loop;
  return v_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- Student notifications
-- ---------------------------------------------------------------------------

-- "New quiz: Math Quiz 5" / "Mathematics · Due Dec 4 · Code 51819" to every active student.
create or replace function public.notify_assessment_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject public.subjects;
  v_member record;
begin
  if new.subject_id is null or new.status <> 'ACTIVE' then
    return new;
  end if;
  select * into v_subject from public.subjects s where s.id = new.subject_id;
  for v_member in
    select m.user_id from public.class_members m
    where m.class_id = v_subject.class_id and m.member_role = 'STUDENT' and m.status = 'ACTIVE'
  loop
    perform public.notify(v_member.user_id, 'ASSESSMENT_CREATED',
      'New ' || lower(replace(new.assessment_type, '_', ' ')) || ': ' || new.title,
      concat_ws(' · ', v_subject.name, 'Due ' || to_char(new.due_date, 'Mon FMDD'), 'Code ' || new.assessment_code),
      v_subject.class_id, new.subject_id, new.id);
  end loop;
  return new;
end;
$$;

create trigger assessments_notify_students
  after insert on public.assessments
  for each row execute function public.notify_assessment_created();

create or replace function public.notify_class_joined()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.member_role = 'STUDENT' and new.status = 'ACTIVE' and (tg_op = 'INSERT' or old.status <> 'ACTIVE') then
    perform public.notify(new.user_id, 'CLASS_JOINED',
      'You joined ' || (select c.name from public.classes c where c.id = new.class_id), null, new.class_id);
  end if;
  return new;
end;
$$;

create trigger class_members_notify_joined
  after insert or update of status on public.class_members
  for each row execute function public.notify_class_joined();

revoke execute on function public.notify_assessment_created() from public, anon, authenticated;
revoke execute on function public.notify_class_joined() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on function public.student_work(uuid, uuid, uuid, text, text, text, text, integer, integer) from public, anon;
revoke execute on function public.student_classes(uuid) from public, anon;
revoke execute on function public.student_subjects(uuid, uuid, text, text, text) from public, anon;
revoke execute on function public.student_dashboard(uuid) from public, anon;
revoke execute on function public.student_record(uuid) from public, anon;
revoke execute on function public.class_classmates(uuid) from public, anon;
revoke execute on function public.set_classmates_visible(uuid, boolean) from public, anon;
revoke execute on function public.leave_class(uuid) from public, anon;
revoke execute on function public.my_guardians() from public, anon;
revoke execute on function public.new_my_link_code() from public, anon;
grant execute on function public.student_work(uuid, uuid, uuid, text, text, text, text, integer, integer) to authenticated;
grant execute on function public.student_classes(uuid) to authenticated;
grant execute on function public.student_subjects(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.student_dashboard(uuid) to authenticated;
grant execute on function public.student_record(uuid) to authenticated;
grant execute on function public.class_classmates(uuid) to authenticated;
grant execute on function public.set_classmates_visible(uuid, boolean) to authenticated;
grant execute on function public.leave_class(uuid) to authenticated;
grant execute on function public.my_guardians() to authenticated;
grant execute on function public.new_my_link_code() to authenticated;
