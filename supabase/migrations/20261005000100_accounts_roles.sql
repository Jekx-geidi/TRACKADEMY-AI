-- Trackademic — accounts, roles and the first step after choosing a role.
--
-- Adds real email/Google accounts on top of the Phase 0 scanner prototype:
--   * profiles: one row per auth user (full name + chosen role).
--   * classes / class_members: a teacher creates a class (6-character join code), students
--     and co-teachers join with that code.
--   * student_profiles gains an owner (the student's account) and a link code so a parent
--     can link to their child; guardian_links records parent ↔ student.
--
-- Same security model as Phase 0: RLS on, clients only SELECT their own rows, and every
-- write goes through a SECURITY DEFINER function that validates the caller's role.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (full_name is null or char_length(btrim(full_name)) between 1 and 120),
  role text check (role in ('STUDENT', 'PARENT', 'TEACHER')),
  setup_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_profiles
  add column owner_user_id uuid unique references auth.users (id) on delete set null,
  add column link_code text unique check (link_code ~ '^[A-Z2-9]{6}$');

create table public.guardian_links (
  guardian_user_id uuid not null references auth.users (id) on delete cascade,
  student_profile_id uuid not null references public.student_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (guardian_user_id, student_profile_id)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  join_code text not null unique check (join_code ~ '^[A-Z2-9]{6}$'),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.class_members (
  class_id uuid not null references public.classes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  member_role text not null check (member_role in ('TEACHER', 'STUDENT')),
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id)
);

create index class_members_user_idx on public.class_members (user_id);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.guardian_links enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;

revoke all on public.profiles, public.guardian_links, public.classes, public.class_members from anon;
revoke insert, update, delete on public.profiles, public.guardian_links, public.classes, public.class_members from authenticated;
grant select on public.profiles, public.guardian_links, public.classes, public.class_members to authenticated;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Guardians can read their own links"
  on public.guardian_links for select to authenticated
  using (guardian_user_id = (select auth.uid()));

create policy "Members can read their own memberships"
  on public.class_members for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Members can read classes they belong to"
  on public.classes for select to authenticated
  using (exists (
    select 1 from public.class_members m
    where m.class_id = classes.id and m.user_id = (select auth.uid())
  ));

create policy "Students and guardians can read their student profile"
  on public.student_profiles for select to authenticated
  using (
    owner_user_id = (select auth.uid())
    or exists (
      select 1 from public.guardian_links g
      where g.student_profile_id = student_profiles.id and g.guardian_user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Profile row for every new account
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), 120), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Accounts that existed before this migration.
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- 6 characters without look-alikes (no 0/O, 1/I/L).
create or replace function public.generate_join_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_bytes bytea := extensions.gen_random_bytes(6);
  v_code text := '';
begin
  for i in 0..5 loop
    v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % length(v_alphabet)) + 1, 1);
  end loop;
  return v_code;
end;
$$;

revoke execute on function public.generate_join_code() from public, anon, authenticated;

create or replace function public.require_role(p_role text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Please sign in first.' using errcode = '28000';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_uid and p.role = p_role) then
    raise exception 'This step is only for % accounts.', lower(p_role) using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

revoke execute on function public.require_role(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Role selection
-- ---------------------------------------------------------------------------

-- The role can be changed until the role's first step is finished.
create or replace function public.set_my_role(p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Please sign in first.' using errcode = '28000';
  end if;
  if p_role not in ('STUDENT', 'PARENT', 'TEACHER') then
    raise exception 'Choose Student, Parent / Guardian or Teacher.' using errcode = '22023';
  end if;

  insert into public.profiles (id, role) values (v_uid, p_role)
  on conflict (id) do update
    set role = excluded.role, updated_at = now()
    where public.profiles.setup_completed_at is null;

  if exists (select 1 from public.profiles p where p.id = v_uid and p.role is distinct from p_role) then
    raise exception 'Your role is already set.' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.set_my_role(text) from public, anon;
grant execute on function public.set_my_role(text) to authenticated;

create or replace function public.mark_setup_complete()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set setup_completed_at = coalesce(setup_completed_at, now()), updated_at = now()
  where id = auth.uid() and role is not null;
$$;

revoke execute on function public.mark_setup_complete() from public, anon;
grant execute on function public.mark_setup_complete() to authenticated;

-- ---------------------------------------------------------------------------
-- Teacher: create or join a class
-- ---------------------------------------------------------------------------

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

  for attempt in 1..10 loop
    begin
      insert into public.classes (name, join_code, owner_user_id)
      values (btrim(p_name), public.generate_join_code(), v_uid)
      returning * into v_class;
      exit;
    exception when unique_violation then
      if attempt = 10 then raise; end if;
    end;
  end loop;

  insert into public.class_members (class_id, user_id, member_role) values (v_class.id, v_uid, 'TEACHER');
  return query select v_class.id, v_class.name, v_class.join_code;
end;
$$;

revoke execute on function public.create_class(text) from public, anon;
grant execute on function public.create_class(text) to authenticated;

-- Teachers join as co-teachers, students as students.
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

  select * into v_class from public.classes c where c.join_code = upper(btrim(coalesce(p_join_code, '')));
  if not found then
    raise exception 'No class has that code. Check it with your teacher.' using errcode = 'P0001';
  end if;

  insert into public.class_members (class_id, user_id, member_role)
  values (v_class.id, v_uid, v_role)
  on conflict (class_id, user_id) do nothing;

  return query select v_class.id, v_class.name;
end;
$$;

revoke execute on function public.join_class(text) from public, anon;
grant execute on function public.join_class(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Student: own student profile with a code to share with a parent
-- ---------------------------------------------------------------------------

create or replace function public.ensure_my_student_profile()
returns table (id uuid, display_name text, link_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_role('STUDENT');
  v_profile public.student_profiles;
  v_name text;
begin
  select * into v_profile from public.student_profiles s where s.owner_user_id = v_uid;
  if not found then
    select coalesce(p.full_name, 'Student') into v_name from public.profiles p where p.id = v_uid;
    for attempt in 1..10 loop
      begin
        insert into public.student_profiles (display_name, owner_user_id, link_code)
        values (v_name, v_uid, public.generate_join_code())
        returning * into v_profile;
        exit;
      exception when unique_violation then
        if attempt = 10 then raise; end if;
      end;
    end loop;
  end if;
  return query select v_profile.id, v_profile.display_name, v_profile.link_code;
end;
$$;

revoke execute on function public.ensure_my_student_profile() from public, anon;
grant execute on function public.ensure_my_student_profile() to authenticated;

-- ---------------------------------------------------------------------------
-- Parent / guardian: link a child's account or add a child without one
-- ---------------------------------------------------------------------------

create or replace function public.link_student_by_code(p_link_code text)
returns table (id uuid, display_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_role('PARENT');
  v_student public.student_profiles;
begin
  select * into v_student from public.student_profiles s where s.link_code = upper(btrim(coalesce(p_link_code, '')));
  if not found then
    raise exception 'No student has that code. Ask your child to check it in their app.' using errcode = 'P0001';
  end if;
  insert into public.guardian_links (guardian_user_id, student_profile_id)
  values (v_uid, v_student.id)
  on conflict do nothing;
  return query select v_student.id, v_student.display_name;
end;
$$;

revoke execute on function public.link_student_by_code(text) from public, anon;
grant execute on function public.link_student_by_code(text) to authenticated;

create or replace function public.create_child_profile(p_display_name text)
returns table (id uuid, display_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_role('PARENT');
  v_student public.student_profiles;
begin
  if char_length(btrim(coalesce(p_display_name, ''))) not between 1 and 100 then
    raise exception 'Name must be 1–100 characters.' using errcode = '22023';
  end if;
  for attempt in 1..10 loop
    begin
      insert into public.student_profiles (display_name, link_code)
      values (btrim(p_display_name), public.generate_join_code())
      returning * into v_student;
      exit;
    exception when unique_violation then
      if attempt = 10 then raise; end if;
    end;
  end loop;
  insert into public.guardian_links (guardian_user_id, student_profile_id) values (v_uid, v_student.id);
  return query select v_student.id, v_student.display_name;
end;
$$;

revoke execute on function public.create_child_profile(text) from public, anon;
grant execute on function public.create_child_profile(text) to authenticated;
