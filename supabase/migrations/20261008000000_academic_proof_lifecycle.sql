-- Trackademic: academic-proof lifecycle additions. All writes stay server-authorized.

create table public.evidence_timeline (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.evidence(id) on delete cascade,
  event_type text not null check (event_type in ('UPLOADED', 'VERIFIED', 'REJECTED', 'SCORE_CORRECTED', 'CORRECTION_REQUESTED')),
  detail text,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.evidence_timeline enable row level security;
revoke all on public.evidence_timeline from public, anon;
grant select on public.evidence_timeline to authenticated;
create policy "evidence timeline is visible to involved users" on public.evidence_timeline for select to authenticated using (
  exists (select 1 from public.evidence e where e.id = evidence_id and public.can_act_for_student(e.student_profile_id))
  or exists (select 1 from public.evidence e join public.assessments a on a.id = e.assessment_id where e.id = evidence_id and a.teacher_user_id = auth.uid())
);

create table public.correction_requests (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.evidence(id) on delete cascade,
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  message text not null check (char_length(btrim(message)) between 1 and 500),
  status text not null default 'OPEN' check (status in ('OPEN', 'RESOLVED', 'DISMISSED')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);
create unique index correction_requests_one_open_per_evidence on public.correction_requests(evidence_id) where status = 'OPEN';
alter table public.correction_requests enable row level security;
revoke all on public.correction_requests from public, anon;
grant select on public.correction_requests to authenticated;
create policy "correction request is visible to involved users" on public.correction_requests for select to authenticated using (
  public.can_act_for_student(student_profile_id)
  or exists (select 1 from public.evidence e join public.assessments a on a.id=e.assessment_id where e.id=evidence_id and a.teacher_user_id=auth.uid())
);

create or replace function public.request_score_correction(p_evidence_id uuid, p_message text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_student uuid;
begin
  select student_profile_id into v_student from public.evidence where id=p_evidence_id;
  if v_student is null or not public.can_act_for_student(v_student) then raise exception 'You cannot request a correction for this record.' using errcode='42501'; end if;
  insert into public.correction_requests(evidence_id, student_profile_id, message) values (p_evidence_id, v_student, btrim(p_message));
  insert into public.evidence_timeline(evidence_id,event_type,detail,actor_user_id) values (p_evidence_id,'CORRECTION_REQUESTED','Score review requested',auth.uid());
end; $$;

create or replace function public.evidence_history(p_evidence_id uuid)
returns table(event_type text, detail text, created_at timestamptz, actor_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.evidence e where e.id=p_evidence_id and (public.can_act_for_student(e.student_profile_id) or exists (select 1 from public.assessments a where a.id=e.assessment_id and a.teacher_user_id=auth.uid()))) then raise exception 'You cannot see this record.' using errcode='42501'; end if;
  return query select t.event_type,t.detail,t.created_at,p.full_name from public.evidence_timeline t left join public.profiles p on p.id=t.actor_user_id where t.evidence_id=p_evidence_id order by t.created_at;
end; $$;

create or replace function public.bulk_verify_evidence(p_evidence_ids uuid[])
returns integer language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_count integer:=0;
begin
  foreach v_id in array p_evidence_ids loop
    perform public.verify_evidence(v_id); v_count:=v_count+1;
    insert into public.evidence_timeline(evidence_id,event_type,detail,actor_user_id) values(v_id,'VERIFIED','Verified by teacher',auth.uid());
  end loop;
  return v_count;
end; $$;

revoke all on function public.request_score_correction(uuid,text), public.evidence_history(uuid), public.bulk_verify_evidence(uuid[]) from public, anon;
grant execute on function public.request_score_correction(uuid,text), public.evidence_history(uuid), public.bulk_verify_evidence(uuid[]) to authenticated;

insert into public.evidence_timeline(evidence_id,event_type,detail,actor_user_id,created_at)
select id,'UPLOADED','Paper uploaded',null,uploaded_at from public.evidence where not exists (select 1 from public.evidence_timeline t where t.evidence_id=evidence.id and t.event_type='UPLOADED');

create or replace function public.log_evidence_lifecycle() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='INSERT' then insert into public.evidence_timeline(evidence_id,event_type,detail,actor_user_id) values(new.id,'UPLOADED','Paper uploaded',auth.uid());
  elsif new.status='TEACHER_VERIFIED' and old.status is distinct from new.status then insert into public.evidence_timeline(evidence_id,event_type,detail,actor_user_id) values(new.id,'VERIFIED','Verified by teacher',auth.uid());
  elsif new.status='REJECTED' and old.status is distinct from new.status then insert into public.evidence_timeline(evidence_id,event_type,detail,actor_user_id) values(new.id,'REJECTED',new.rejection_reason,auth.uid());
  elsif new.score is distinct from old.score then insert into public.evidence_timeline(evidence_id,event_type,detail,actor_user_id) values(new.id,'SCORE_CORRECTED','Score updated',auth.uid()); end if;
  return new;
end; $$;
create trigger evidence_lifecycle_log after insert or update on public.evidence for each row execute function public.log_evidence_lifecycle();
