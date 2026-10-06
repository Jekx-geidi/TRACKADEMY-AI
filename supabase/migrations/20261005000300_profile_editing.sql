-- Profile editing: users change their own name and profile photo.
--
--   * Names change only through update_my_profile(); clients still cannot write profiles.
--   * Photos live in the private "profile" bucket under the user's own folder
--     ({user id}/avatar/{random id}.jpg). Only the owner can read them, through signed URLs:
--     many users are children, so photos are never public.
--   * Email and password changes go through Supabase Auth and need no tables.

alter table public.profiles
  add column avatar_path text check (avatar_path is null or avatar_path ~ '^[0-9a-f-]{36}/avatar/[0-9a-f-]{36}\.jpg$');

-- ---------------------------------------------------------------------------
-- Name
-- ---------------------------------------------------------------------------

create or replace function public.update_my_profile(p_full_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(coalesce(p_full_name, ''));
begin
  if v_uid is null then
    raise exception 'Please sign in first.' using errcode = '28000';
  end if;
  if char_length(v_name) not between 1 and 120 then
    raise exception 'Enter a name between 1 and 120 characters.' using errcode = '22023';
  end if;

  update public.profiles set full_name = v_name, updated_at = now() where id = v_uid;
  -- A student's own record is what guardians and teachers see, so it follows the new name.
  update public.student_profiles set display_name = v_name where owner_user_id = v_uid;
  return v_name;
end;
$$;

revoke execute on function public.update_my_profile(text) from public, anon;
grant execute on function public.update_my_profile(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Photo
-- ---------------------------------------------------------------------------

-- Points the profile at a photo the caller already uploaded, or clears it with null.
-- Returns the previous path so the client can delete the old file.
create or replace function public.set_my_avatar(p_path text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_previous text;
begin
  if v_uid is null then
    raise exception 'Please sign in first.' using errcode = '28000';
  end if;
  if p_path is not null then
    if p_path !~ ('^' || v_uid::text || '/avatar/[0-9a-f-]{36}\.jpg$') then
      raise exception 'That photo does not belong to your account.' using errcode = '42501';
    end if;
    if not exists (select 1 from storage.objects o where o.bucket_id = 'profile' and o.name = p_path) then
      raise exception 'The photo was not uploaded. Please try again.' using errcode = '22023';
    end if;
  end if;

  select p.avatar_path into v_previous from public.profiles p where p.id = v_uid;
  update public.profiles set avatar_path = p_path, updated_at = now() where id = v_uid;
  return v_previous;
end;
$$;

revoke execute on function public.set_my_avatar(text) from public, anon;
grant execute on function public.set_my_avatar(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile', 'profile', false, 2097152, array['image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can upload a profile photo into their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] = 'avatar'
  );

create policy "Users can read their own profile photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'profile' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Lets the owner remove a replaced photo. Evidence images keep having no delete policy.
create policy "Users can delete their own profile photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'profile' and (storage.foldername(name))[1] = (select auth.uid())::text);
