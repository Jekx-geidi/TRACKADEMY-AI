-- Class Workspaces (PRD v0.3 §7, §9.1, §16): a class has a grade level, section, school year
-- and optional school and adviser names, and a 6-digit numeric join code.
--
--   * The class name is built by the server as "Grade 7 - St. Mark".
--   * New join codes are 6 digits. Existing 6-letter codes (e.g. DEMO55) stay valid.
--   * Join codes only route a student to a class; they are never a key and never proof of
--     anything. Assessment filing codes (5 digits) are a separate system.

alter table public.classes
  add column grade_level smallint check (grade_level between 1 and 10),
  add column section text check (section is null or char_length(section) between 1 and 60),
  add column school_year text check (school_year is null or school_year ~ '^[0-9]{4}-[0-9]{4}$'),
  add column school_name text check (school_name is null or char_length(school_name) between 1 and 120),
  add column adviser_name text check (adviser_name is null or char_length(adviser_name) between 1 and 120),
  drop constraint classes_join_code_check,
  add constraint classes_join_code_check check (join_code ~ '^[0-9]{6}$' or join_code ~ '^[A-Z2-9]{6}$');

-- 6 random digits. Uniqueness is enforced by the classes.join_code unique constraint.
create or replace function public.generate_class_join_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select lpad((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000)::text, 6, '0');
$$;

revoke execute on function public.generate_class_join_code() from public, anon, authenticated;

create or replace function public.create_class_workspace(
  p_grade_level integer,
  p_section text,
  p_school_year text,
  p_school_name text default null,
  p_adviser_name text default null
)
returns table (
  id uuid,
  name text,
  join_code text,
  grade_level smallint,
  section text,
  school_year text,
  school_name text,
  adviser_name text
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

  for attempt in 1..20 loop
    begin
      insert into public.classes (name, join_code, owner_user_id, grade_level, section, school_year, school_name, adviser_name)
      values ('Grade ' || p_grade_level || ' - ' || v_section, public.generate_class_join_code(), v_uid,
              p_grade_level, v_section, v_year, v_school, v_adviser)
      returning * into v_class;
      exit;
    exception when unique_violation then
      if attempt = 20 then raise; end if;
    end;
  end loop;

  insert into public.class_members (class_id, user_id, member_role) values (v_class.id, v_uid, 'TEACHER');
  return query select v_class.id, v_class.name, v_class.join_code, v_class.grade_level, v_class.section,
    v_class.school_year, v_class.school_name, v_class.adviser_name;
end;
$$;

revoke execute on function public.create_class_workspace(integer, text, text, text, text) from public, anon;
grant execute on function public.create_class_workspace(integer, text, text, text, text) to authenticated;

-- The older name-only create_class() now also hands out numeric codes.
create or replace function public.create_class(p_name text)
returns table (id uuid, name text, join_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_role('TEACHER');
  v_class public.classes;
begin
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 80 then
    raise exception 'Class name must be 1–80 characters.' using errcode = '22023';
  end if;

  for attempt in 1..20 loop
    begin
      insert into public.classes (name, join_code, owner_user_id)
      values (btrim(p_name), public.generate_class_join_code(), v_uid)
      returning * into v_class;
      exit;
    exception when unique_violation then
      if attempt = 20 then raise; end if;
    end;
  end loop;

  insert into public.class_members (class_id, user_id, member_role) values (v_class.id, v_uid, 'TEACHER');
  return query select v_class.id, v_class.name, v_class.join_code;
end;
$$;
