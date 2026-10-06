create or replace function public.assessment_correction_requests(p_assessment_id uuid)
returns table(id uuid, evidence_id uuid, student_name text, message text, status text, created_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if not exists (select 1 from public.assessments a where a.id=p_assessment_id and a.teacher_user_id=auth.uid()) then raise exception 'You cannot view these correction requests.' using errcode='42501'; end if;
  return query select r.id,r.evidence_id,s.display_name,r.message,r.status,r.created_at from public.correction_requests r join public.evidence e on e.id=r.evidence_id join public.student_profiles s on s.id=r.student_profile_id where e.assessment_id=p_assessment_id order by r.created_at desc;
end; $$;
create or replace function public.resolve_correction_request(p_request_id uuid, p_status text default 'RESOLVED')
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.correction_requests r set status=p_status,resolved_at=now(),resolved_by=auth.uid() where r.id=p_request_id and exists(select 1 from public.evidence e join public.assessments a on a.id=e.assessment_id where e.id=r.evidence_id and a.teacher_user_id=auth.uid());
  if not found then raise exception 'Correction request not found.' using errcode='42501'; end if;
end; $$;
revoke all on function public.assessment_correction_requests(uuid), public.resolve_correction_request(uuid,text) from public,anon;
grant execute on function public.assessment_correction_requests(uuid), public.resolve_correction_request(uuid,text) to authenticated;
