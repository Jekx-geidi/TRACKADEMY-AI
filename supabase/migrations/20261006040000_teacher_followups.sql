-- Follow-ups for the teacher screens (PRD v0.5):
--   * STUDENT_JOINED notifications name the student profile, so the teacher can open or
--     message the student from the notification.
--   * assessment_progress(): one assessment's counts, so the detail page needn't scan its section.
--   * teacher_student_memberships(): one student's memberships in the caller's sections,
--     with no paging limit.

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
  v_student_profile uuid;
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
    select e.id into v_student_profile from public.ensure_my_student_profile() e;
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
      perform public.notify(v_teacher.user_id, 'STUDENT_JOINED', coalesce(public.my_name(), 'A student') || ' joined ' || v_class.name, null,
        v_class.id, null, null, null, v_student_profile);
    end loop;
  end if;

  return query select v_class.id, v_class.name;
end;
$$;

create or replace function public.assessment_progress(p_assessment_id uuid)
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
  v_class uuid := public.assessment_class(p_assessment_id);
begin
  perform public.require_section_teacher(v_class);
  return query
    select p.assessment_id, p.class_id, p.subject_id, p.subject_name, p.title, p.assessment_type, p.quarter, p.assessment_code,
      p.total_score, p.assessment_date, p.due_date, p.created_at, p.required, p.submitted, p.verified, p.pending, p.missing,
      p.overdue, public.completion_percent(p.submitted, p.required), public.completion_status(p.submitted, p.required), 1
    from public.progress_for_classes(array[v_class]) p
    where p.assessment_id = p_assessment_id;
end;
$$;

create or replace function public.teacher_student_memberships(p_student_profile_id uuid)
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
  with mine as (
    select s.id as spid, m.user_id as uid, s.display_name as dname, c.id as cid, c.name as cname, m.status as st, m.joined_at as jat
    from public.student_profiles s
    join public.class_members m on m.user_id = s.owner_user_id and m.member_role = 'STUDENT'
    join public.classes c on c.id = m.class_id
    where s.id = p_student_profile_id and c.id = any (public.my_taught_class_ids())
  )
  select r.spid, r.uid, r.dname, r.cid, r.cname, r.st, r.jat,
    (select count(*)::int from public.subjects sub where sub.class_id = r.cid),
    (select count(*)::int from public.progress_for_classes(array[r.cid]) p
      where r.st = 'ACTIVE'
        and not exists (select 1 from public.assessment_exemptions x where x.assessment_id = p.assessment_id and x.student_profile_id = r.spid)
        and not exists (select 1 from public.evidence e where e.assessment_id = p.assessment_id and e.student_profile_id = r.spid and e.status <> 'REJECTED')),
    (count(*) over ())::int
  from mine r
  order by r.st = 'ACTIVE' desc, r.cname;
$$;

revoke execute on function public.assessment_progress(uuid) from public, anon;
revoke execute on function public.teacher_student_memberships(uuid) from public, anon;
grant execute on function public.assessment_progress(uuid) to authenticated;
grant execute on function public.teacher_student_memberships(uuid) to authenticated;
