-- Teacher lists, analytics and student management (PRD v0.5 §3–§16, §23–§30, §35–§40, §45).
--
-- Completion (v0.5 §38):
--   - The required students for an assessment are its section's ACTIVE students, minus
--     exempt ones.
--   - A student has submitted when they have any evidence that isn't REJECTED.
--   - Verified means TEACHER_VERIFIED; pending means submitted but not verified.
--   - Missing means required but not submitted. It counts as overdue once the due date has passed.
--   - percent = submitted / required, and the status bands are (§39):
--       0% Not Started, 1–79% Needs Attention, 80–99% Almost Complete, 100% Complete.
-- Every function checks the caller teaches the section; lists page with limit/offset and
-- return total_count on each row.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.my_taught_class_ids()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(m.class_id), '{}') from public.class_members m
  where m.user_id = (select auth.uid()) and m.member_role = 'TEACHER' and m.status = 'ACTIVE';
$$;

revoke execute on function public.my_taught_class_ids() from public, anon, authenticated;

create or replace function public.completion_percent(p_done integer, p_required integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(p_required, 0) <= 0 then 0
    when p_done >= p_required then 100
    -- Never round a partial result up to 100% or down to 0%.
    else least(99, greatest(case when p_done > 0 then 1 else 0 end, round(p_done * 100.0 / p_required)::int))
  end;
$$;

create or replace function public.completion_status(p_done integer, p_required integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(p_required, 0) > 0 and p_done >= p_required then 'COMPLETE'
    when coalesce(p_done, 0) <= 0 then 'NOT_STARTED'
    when p_done * 100.0 / p_required >= 80 then 'ALMOST_COMPLETE'
    else 'NEEDS_ATTENTION'
  end;
$$;

-- Per-assessment counts for the given sections. Internal: callers check access first.
create or replace function public.progress_for_classes(p_class_ids uuid[])
returns table (
  assessment_id uuid,
  class_id uuid,
  subject_id uuid,
  subject_name text,
  title text,
  assessment_type text,
  quarter text,
  assessment_code text,
  total_score integer,
  assessment_date date,
  due_date date,
  created_at timestamptz,
  required integer,
  submitted integer,
  verified integer,
  pending integer,
  missing integer,
  overdue integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with roster as (
    select m.class_id, s.id as student_profile_id
    from public.class_members m
    join public.student_profiles s on s.owner_user_id = m.user_id
    where m.class_id = any (p_class_ids) and m.member_role = 'STUDENT' and m.status = 'ACTIVE'
  ),
  section_assessments as (
    select a.id, a.subject_id, a.title, a.assessment_type, a.quarter, a.assessment_code, a.total_score,
      a.assessment_date, a.due_date, a.created_at, sub.class_id, sub.name as subject_name
    from public.assessments a
    join public.subjects sub on sub.id = a.subject_id
    where sub.class_id = any (p_class_ids) and a.status = 'ACTIVE'
  ),
  required as (
    select sa.id as assessment_id, r.student_profile_id
    from section_assessments sa
    join roster r on r.class_id = sa.class_id
    where not exists (
      select 1 from public.assessment_exemptions x
      where x.assessment_id = sa.id and x.student_profile_id = r.student_profile_id
    )
  ),
  per_student as (
    select rq.assessment_id, rq.student_profile_id,
      coalesce(bool_or(e.status = 'TEACHER_VERIFIED'), false) as is_verified,
      coalesce(bool_or(e.status <> 'REJECTED'), false) as is_submitted
    from required rq
    left join public.evidence e on e.assessment_id = rq.assessment_id and e.student_profile_id = rq.student_profile_id
    group by rq.assessment_id, rq.student_profile_id
  )
  select sa.id, sa.class_id, sa.subject_id, sa.subject_name, sa.title, sa.assessment_type, sa.quarter,
    sa.assessment_code, sa.total_score, sa.assessment_date, sa.due_date, sa.created_at,
    count(ps.student_profile_id)::int,
    count(*) filter (where ps.is_submitted)::int,
    count(*) filter (where ps.is_verified)::int,
    count(*) filter (where ps.is_submitted and not ps.is_verified)::int,
    count(*) filter (where ps.student_profile_id is not null and not ps.is_submitted)::int,
    case when sa.due_date < current_date
      then count(*) filter (where ps.student_profile_id is not null and not ps.is_submitted)
      else 0 end::int
  from section_assessments sa
  left join per_student ps on ps.assessment_id = sa.id
  group by sa.id, sa.class_id, sa.subject_id, sa.subject_name, sa.title, sa.assessment_type, sa.quarter,
    sa.assessment_code, sa.total_score, sa.assessment_date, sa.due_date, sa.created_at;
$$;

revoke execute on function public.progress_for_classes(uuid[]) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Sections
-- ---------------------------------------------------------------------------

create or replace function public.teacher_sections(
  p_search text default null,
  p_grade_level integer default null,
  p_school_year text default null,
  p_sort text default 'newest',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  name text,
  grade_level smallint,
  section text,
  school_year text,
  school_name text,
  join_code text,
  student_count integer,
  subject_count integer,
  created_at timestamptz,
  total_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select c.*,
      (select count(*)::int from public.class_members m where m.class_id = c.id and m.member_role = 'STUDENT' and m.status = 'ACTIVE') as students,
      (select count(*)::int from public.subjects s where s.class_id = c.id) as subjects
    from public.classes c
    where c.id = any (public.my_taught_class_ids())
      and (p_search is null or c.name ilike '%' || p_search || '%' or c.school_name ilike '%' || p_search || '%')
      and (p_grade_level is null or c.grade_level = p_grade_level)
      and (p_school_year is null or c.school_year = p_school_year)
  )
  select m.id, m.name, m.grade_level, m.section, m.school_year, m.school_name, m.join_code, m.students, m.subjects,
    m.created_at, (count(*) over ())::int
  from mine m
  order by
    case when p_sort = 'name' then m.name end asc,
    case when p_sort = 'students' then m.students end desc,
    m.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100) offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.section_overview(p_class_id uuid)
returns table (
  id uuid,
  name text,
  grade_level smallint,
  section text,
  school_year text,
  school_name text,
  adviser_name text,
  description text,
  join_code text,
  student_count integer,
  subject_count integer,
  active_assessments integer,
  expected integer,
  submitted integer,
  verified integer,
  pending integer,
  missing integer,
  overdue integer,
  percent integer,
  status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_section_teacher(p_class_id);
  return query
    with p as (select * from public.progress_for_classes(array[p_class_id]))
    select c.id, c.name, c.grade_level, c.section, c.school_year, c.school_name, c.adviser_name, c.description, c.join_code,
      (select count(*)::int from public.class_members m where m.class_id = c.id and m.member_role = 'STUDENT' and m.status = 'ACTIVE'),
      (select count(*)::int from public.subjects s where s.class_id = c.id),
      (select count(*)::int from p),
      coalesce((select sum(p.required) from p), 0)::int,
      coalesce((select sum(p.submitted) from p), 0)::int,
      coalesce((select sum(p.verified) from p), 0)::int,
      coalesce((select sum(p.pending) from p), 0)::int,
      coalesce((select sum(p.missing) from p), 0)::int,
      coalesce((select sum(p.overdue) from p), 0)::int,
      public.completion_percent(coalesce((select sum(p.submitted) from p), 0)::int, coalesce((select sum(p.required) from p), 0)::int),
      public.completion_status(coalesce((select sum(p.submitted) from p), 0)::int, coalesce((select sum(p.required) from p), 0)::int)
    from public.classes c where c.id = p_class_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Assessments with completion
-- ---------------------------------------------------------------------------

create or replace function public.list_assessment_progress(
  p_class_id uuid default null,
  p_subject_id uuid default null,
  p_search text default null,
  p_quarter text default null,
  p_type text default null,
  p_status text default null,
  p_sort text default 'newest',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  assessment_id uuid,
  class_id uuid,
  subject_id uuid,
  subject_name text,
  title text,
  assessment_type text,
  quarter text,
  assessment_code text,
  total_score integer,
  assessment_date date,
  due_date date,
  created_at timestamptz,
  required integer,
  submitted integer,
  verified integer,
  pending integer,
  missing integer,
  overdue integer,
  percent integer,
  status text,
  total_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_class uuid := coalesce(p_class_id, (select s.class_id from public.subjects s where s.id = p_subject_id));
begin
  perform public.require_section_teacher(v_class);
  return query
    with rows as (
      select p.*, public.completion_percent(p.submitted, p.required) as pct, public.completion_status(p.submitted, p.required) as st
      from public.progress_for_classes(array[v_class]) p
      where (p_subject_id is null or p.subject_id = p_subject_id)
        and (p_search is null or p.title ilike '%' || p_search || '%' or p.assessment_code = btrim(p_search))
        and (p_quarter is null or p.quarter = p_quarter)
        and (p_type is null or p.assessment_type = p_type)
    ),
    filtered as (select * from rows r where p_status is null or r.st = p_status)
    select f.assessment_id, f.class_id, f.subject_id, f.subject_name, f.title, f.assessment_type, f.quarter, f.assessment_code,
      f.total_score, f.assessment_date, f.due_date, f.created_at, f.required, f.submitted, f.verified, f.pending,
      f.missing, f.overdue, f.pct, f.st, (count(*) over ())::int
    from filtered f
    order by
      case when p_sort = 'title' then f.title end asc,
      case when p_sort = 'due' then f.due_date end asc nulls last,
      case when p_sort = 'completion' then f.pct end asc,
      f.created_at desc
    limit least(greatest(coalesce(p_limit, 20), 1), 100) offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- Every required student for one assessment, with their latest paper.
create or replace function public.assessment_students(
  p_assessment_id uuid,
  p_search text default null,
  p_status text default null,
  p_sort text default 'name',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  student_profile_id uuid,
  display_name text,
  exempt boolean,
  evidence_id uuid,
  evidence_status text,
  score numeric,
  uploaded_at timestamptz,
  image_path text,
  rejection_reason text,
  row_status text,
  total_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_class uuid := public.assessment_class(p_assessment_id);
begin
  if auth.uid() is null or not public.teaches_assessment(p_assessment_id) then
    raise exception 'Only teachers of this section can do that.' using errcode = '42501';
  end if;
  return query
    with students as (
      -- A section assessment lists the section's active students; an older one, whoever submitted.
      select s.id, s.display_name from public.class_members m
      join public.student_profiles s on s.owner_user_id = m.user_id
      where v_class is not null and m.class_id = v_class and m.member_role = 'STUDENT' and m.status = 'ACTIVE'
      union
      select s.id, s.display_name from public.evidence e
      join public.student_profiles s on s.id = e.student_profile_id
      where e.assessment_id = p_assessment_id
        and (v_class is null or public.student_in_class(s.id, v_class))
    ),
    latest as (
      -- A verified paper wins; otherwise the newest one.
      select distinct on (e.student_profile_id) e.*
      from public.evidence e
      where e.assessment_id = p_assessment_id
      order by e.student_profile_id, (e.status = 'TEACHER_VERIFIED') desc, e.uploaded_at desc
    ),
    rows as (
      select st.id, st.display_name,
        exists (select 1 from public.assessment_exemptions x where x.assessment_id = p_assessment_id and x.student_profile_id = st.id) as is_exempt,
        l.id as ev_id, l.status as ev_status, l.score as ev_score, l.uploaded_at as ev_at, l.image_path as ev_path, l.rejection_reason as ev_reason
      from students st left join latest l on l.student_profile_id = st.id
    ),
    labelled as (
      select r.*, case
        when r.is_exempt then 'EXEMPT'
        when r.ev_status = 'TEACHER_VERIFIED' then 'VERIFIED'
        when r.ev_status = 'REJECTED' then 'REJECTED'
        when r.ev_status is not null then 'PENDING'
        else 'MISSING' end as label
      from rows r
      where p_search is null or r.display_name ilike '%' || p_search || '%'
    ),
    filtered as (select * from labelled l where p_status is null or l.label = p_status)
    select f.id, f.display_name, f.is_exempt, f.ev_id, f.ev_status, f.ev_score, f.ev_at, f.ev_path, f.ev_reason, f.label,
      (count(*) over ())::int
    from filtered f
    order by
      case when p_sort = 'score' then f.ev_score end desc nulls last,
      case when p_sort = 'status' then f.label end asc,
      case when p_sort = 'newest' then f.ev_at end desc nulls last,
      f.display_name asc
    limit least(greatest(coalesce(p_limit, 20), 1), 100) offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- Students
-- ---------------------------------------------------------------------------

create or replace function public.teacher_students(
  p_search text default null,
  p_class_id uuid default null,
  p_status text default null,
  p_sort text default 'name',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  student_profile_id uuid,
  user_id uuid,
  display_name text,
  class_id uuid,
  class_name text,
  status text,
  joined_at timestamptz,
  subject_count integer,
  missing_count integer,
  total_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with taught as (select unnest(public.my_taught_class_ids()) as class_id),
  missing as (
    select p.class_id, x.student_profile_id, count(*)::int as n
    from public.progress_for_classes(public.my_taught_class_ids()) p
    cross join lateral (
      select s.id as student_profile_id from public.class_members m
      join public.student_profiles s on s.owner_user_id = m.user_id
      where m.class_id = p.class_id and m.member_role = 'STUDENT' and m.status = 'ACTIVE'
        and not exists (select 1 from public.assessment_exemptions e where e.assessment_id = p.assessment_id and e.student_profile_id = s.id)
        and not exists (select 1 from public.evidence ev where ev.assessment_id = p.assessment_id and ev.student_profile_id = s.id and ev.status <> 'REJECTED')
    ) x
    group by p.class_id, x.student_profile_id
  ),
  rows as (
    select s.id as spid, m.user_id as uid, s.display_name as dname, c.id as cid, c.name as cname, m.status as st, m.joined_at as jat,
      (select count(*)::int from public.subjects sub where sub.class_id = c.id) as subjects,
      coalesce((select mi.n from missing mi where mi.class_id = c.id and mi.student_profile_id = s.id), 0) as miss
    from taught t
    join public.classes c on c.id = t.class_id
    join public.class_members m on m.class_id = c.id and m.member_role = 'STUDENT'
    join public.student_profiles s on s.owner_user_id = m.user_id
    where (p_search is null or s.display_name ilike '%' || p_search || '%')
      and (p_class_id is null or c.id = p_class_id)
      and (p_status is null or m.status = p_status)
  )
  select r.spid, r.uid, r.dname, r.cid, r.cname, r.st, r.jat, r.subjects, r.miss, (count(*) over ())::int
  from rows r
  order by
    case when p_sort = 'section' then r.cname end asc,
    case when p_sort = 'newest' then r.jat end desc,
    case when p_sort = 'missing' then r.miss end desc,
    r.dname asc, r.cname asc
  limit least(greatest(coalesce(p_limit, 20), 1), 100) offset greatest(coalesce(p_offset, 0), 0);
$$;

-- ACTIVE, INACTIVE or REMOVED. Never deletes the membership or any evidence (v0.5 §26).
create or replace function public.set_member_status(p_class_id uuid, p_student_profile_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  perform public.require_section_teacher(p_class_id);
  if p_status not in ('ACTIVE', 'INACTIVE', 'REMOVED') then
    raise exception 'Status must be Active, Inactive or Removed.' using errcode = '22023';
  end if;
  select s.owner_user_id into v_user from public.student_profiles s where s.id = p_student_profile_id;
  update public.class_members m set status = p_status, status_changed_at = now()
  where m.class_id = p_class_id and m.user_id = v_user and m.member_role = 'STUDENT';
  if not found then
    raise exception 'This student is not in that section.' using errcode = '42501';
  end if;
  perform public.write_audit('MEMBER_STATUS_' || p_status, 'student_profile', p_student_profile_id, p_class_id, null, '{}'::jsonb);
end;
$$;

-- Moves a student between two sections the caller teaches. History stays with the old section.
create or replace function public.move_student(p_student_profile_id uuid, p_from_class_id uuid, p_to_class_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  perform public.require_section_teacher(p_from_class_id);
  perform public.require_section_teacher(p_to_class_id);
  if p_from_class_id = p_to_class_id then
    raise exception 'Choose a different section.' using errcode = '22023';
  end if;
  if not public.student_in_class(p_student_profile_id, p_from_class_id) then
    raise exception 'This student is not in that section.' using errcode = '42501';
  end if;
  select s.owner_user_id into v_user from public.student_profiles s where s.id = p_student_profile_id;

  update public.class_members m set status = 'REMOVED', status_changed_at = now()
  where m.class_id = p_from_class_id and m.user_id = v_user and m.member_role = 'STUDENT';
  insert into public.class_members (class_id, user_id, member_role)
  values (p_to_class_id, v_user, 'STUDENT')
  on conflict (class_id, user_id) do update set status = 'ACTIVE', status_changed_at = now();

  perform public.write_audit('STUDENT_MOVED', 'student_profile', p_student_profile_id, p_from_class_id, null,
    jsonb_build_object('to_class_id', p_to_class_id));
  perform public.write_audit('STUDENT_MOVED', 'student_profile', p_student_profile_id, p_to_class_id, null,
    jsonb_build_object('from_class_id', p_from_class_id));
end;
$$;

-- What a student hasn't submitted yet. The student, their parents, and their teachers (for
-- their own sections) may ask.
create or replace function public.student_missing_work(p_student_profile_id uuid)
returns table (
  assessment_id uuid,
  title text,
  assessment_type text,
  quarter text,
  subject_id uuid,
  subject_name text,
  class_id uuid,
  class_name text,
  due_date date,
  overdue boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_family boolean := public.can_act_for_student(p_student_profile_id);
  v_classes uuid[];
begin
  if auth.uid() is null or not (v_family or public.teaches_student_profile(p_student_profile_id)) then
    raise exception 'You cannot see this student’s records.' using errcode = '42501';
  end if;
  select coalesce(array_agg(m.class_id), '{}') into v_classes
  from public.class_members m join public.student_profiles s on s.owner_user_id = m.user_id
  where s.id = p_student_profile_id and m.member_role = 'STUDENT' and m.status = 'ACTIVE'
    and (v_family or public.teaches_class(m.class_id));

  return query
    select a.id, a.title, a.assessment_type, a.quarter, sub.id, sub.name, c.id, c.name, a.due_date,
      coalesce(a.due_date < current_date, false)
    from public.assessments a
    join public.subjects sub on sub.id = a.subject_id
    join public.classes c on c.id = sub.class_id
    where c.id = any (v_classes) and a.status = 'ACTIVE'
      and not exists (select 1 from public.assessment_exemptions x where x.assessment_id = a.id and x.student_profile_id = p_student_profile_id)
      and not exists (select 1 from public.evidence e where e.assessment_id = a.id and e.student_profile_id = p_student_profile_id and e.status <> 'REJECTED')
    order by a.due_date asc nulls last, a.created_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- Dashboard
-- ---------------------------------------------------------------------------

create or replace function public.teacher_dashboard()
returns table (
  teacher_name text,
  school_year text,
  section_count integer,
  student_count integer,
  active_assessments integer,
  missing integer,
  pending integer,
  overdue integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with ids as (select public.my_taught_class_ids() as v),
  p as (select * from public.progress_for_classes((select v from ids)))
  select public.my_name(),
    (select max(c.school_year) from public.classes c where c.id = any ((select v from ids)::uuid[])),
    cardinality((select v from ids)),
    (select count(distinct m.user_id)::int from public.class_members m
      where m.class_id = any ((select v from ids)::uuid[]) and m.member_role = 'STUDENT' and m.status = 'ACTIVE'),
    (select count(*)::int from p),
    coalesce((select sum(p.missing) from p), 0)::int,
    coalesce((select sum(p.pending) from p), 0)::int,
    coalesce((select sum(p.overdue) from p), 0)::int;
$$;

create or replace function public.teacher_needs_attention(p_limit integer default 10)
returns table (
  assessment_id uuid,
  title text,
  subject_name text,
  class_id uuid,
  class_name text,
  due_date date,
  missing integer,
  pending integer,
  overdue integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.assessment_id, p.title, p.subject_name, p.class_id, c.name, p.due_date, p.missing, p.pending, p.overdue
  from public.progress_for_classes(public.my_taught_class_ids()) p
  join public.classes c on c.id = p.class_id
  where p.missing > 0 or p.pending > 0
  order by p.overdue desc, p.pending desc, p.missing desc, p.due_date asc nulls last
  limit least(greatest(coalesce(p_limit, 10), 1), 50);
$$;

create or replace function public.teacher_section_analytics()
returns table (
  class_id uuid,
  class_name text,
  expected integer,
  submitted integer,
  verified integer,
  pending integer,
  missing integer,
  overdue integer,
  percent integer,
  verified_percent integer,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
  with totals as (
    select c.id, c.name,
      coalesce(sum(p.required), 0)::int as req, coalesce(sum(p.submitted), 0)::int as sub,
      coalesce(sum(p.verified), 0)::int as ver, coalesce(sum(p.pending), 0)::int as pen,
      coalesce(sum(p.missing), 0)::int as mis, coalesce(sum(p.overdue), 0)::int as ovd
    from public.classes c
    left join public.progress_for_classes(public.my_taught_class_ids()) p on p.class_id = c.id
    where c.id = any (public.my_taught_class_ids())
    group by c.id, c.name
  )
  select t.id, t.name, t.req, t.sub, t.ver, t.pen, t.mis, t.ovd,
    public.completion_percent(t.sub, t.req), public.completion_percent(t.ver, t.req), public.completion_status(t.sub, t.req)
  from totals t
  order by t.name;
$$;

create or replace function public.section_subject_analytics(p_class_id uuid)
returns table (
  subject_id uuid,
  subject_name text,
  assessments integer,
  expected integer,
  submitted integer,
  verified integer,
  pending integer,
  missing integer,
  overdue integer,
  percent integer,
  verified_percent integer,
  status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_section_teacher(p_class_id);
  return query
    with totals as (
      select s.id, s.name, count(p.assessment_id)::int as n,
        coalesce(sum(p.required), 0)::int as req, coalesce(sum(p.submitted), 0)::int as sub,
        coalesce(sum(p.verified), 0)::int as ver, coalesce(sum(p.pending), 0)::int as pen,
        coalesce(sum(p.missing), 0)::int as mis, coalesce(sum(p.overdue), 0)::int as ovd
      from public.subjects s
      left join public.progress_for_classes(array[p_class_id]) p on p.subject_id = s.id
      where s.class_id = p_class_id
      group by s.id, s.name
    )
    select t.id, t.name, t.n, t.req, t.sub, t.ver, t.pen, t.mis, t.ovd,
      public.completion_percent(t.sub, t.req), public.completion_percent(t.ver, t.req), public.completion_status(t.sub, t.req)
    from totals t
    order by t.name;
end;
$$;

-- ---------------------------------------------------------------------------
-- Teacher information (v0.5 §29–§30)
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column school_name text check (school_name is null or char_length(school_name) between 1 and 120),
  add column department text check (department is null or char_length(department) between 1 and 80),
  add column teaching_subjects text[] not null default '{}' check (cardinality(teaching_subjects) <= 20);

create or replace function public.update_my_teacher_info(p_school_name text, p_department text, p_teaching_subjects text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_role('TEACHER');
  -- Trimmed, blanks dropped, duplicates removed, in the order the teacher typed them.
  v_subjects text[] := array(
    select t.subject from (
      select btrim(s) as subject, min(i) as first_at
      from unnest(coalesce(p_teaching_subjects, '{}')) with ordinality as u(s, i)
      where char_length(btrim(s)) between 1 and 80
      group by btrim(s)
    ) t order by t.first_at
  );
begin
  if char_length(btrim(coalesce(p_school_name, ''))) > 120 or char_length(btrim(coalesce(p_department, ''))) > 80 then
    raise exception 'School must be 120 and department 80 characters or fewer.' using errcode = '22023';
  end if;
  if cardinality(v_subjects) > 20 then
    raise exception 'List up to 20 teaching subjects.' using errcode = '22023';
  end if;
  update public.profiles p
  set school_name = nullif(btrim(coalesce(p_school_name, '')), ''),
      department = nullif(btrim(coalesce(p_department, '')), ''),
      teaching_subjects = v_subjects,
      updated_at = now()
  where p.id = v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on function public.teacher_sections(text, integer, text, text, integer, integer) from public, anon;
revoke execute on function public.section_overview(uuid) from public, anon;
revoke execute on function public.list_assessment_progress(uuid, uuid, text, text, text, text, text, integer, integer) from public, anon;
revoke execute on function public.assessment_students(uuid, text, text, text, integer, integer) from public, anon;
revoke execute on function public.teacher_students(text, uuid, text, text, integer, integer) from public, anon;
revoke execute on function public.set_member_status(uuid, uuid, text) from public, anon;
revoke execute on function public.move_student(uuid, uuid, uuid) from public, anon;
revoke execute on function public.student_missing_work(uuid) from public, anon;
revoke execute on function public.teacher_dashboard() from public, anon;
revoke execute on function public.teacher_needs_attention(integer) from public, anon;
revoke execute on function public.teacher_section_analytics() from public, anon;
revoke execute on function public.section_subject_analytics(uuid) from public, anon;
revoke execute on function public.update_my_teacher_info(text, text, text[]) from public, anon;

grant execute on function public.teacher_sections(text, integer, text, text, integer, integer) to authenticated;
grant execute on function public.section_overview(uuid) to authenticated;
grant execute on function public.list_assessment_progress(uuid, uuid, text, text, text, text, text, integer, integer) to authenticated;
grant execute on function public.assessment_students(uuid, text, text, text, integer, integer) to authenticated;
grant execute on function public.teacher_students(text, uuid, text, text, integer, integer) to authenticated;
grant execute on function public.set_member_status(uuid, uuid, text) to authenticated;
grant execute on function public.move_student(uuid, uuid, uuid) to authenticated;
grant execute on function public.student_missing_work(uuid) to authenticated;
grant execute on function public.teacher_dashboard() to authenticated;
grant execute on function public.teacher_needs_attention(integer) to authenticated;
grant execute on function public.teacher_section_analytics() to authenticated;
grant execute on function public.section_subject_analytics(uuid) to authenticated;
grant execute on function public.update_my_teacher_info(text, text, text[]) to authenticated;
