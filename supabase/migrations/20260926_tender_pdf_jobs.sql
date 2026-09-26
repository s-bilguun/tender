create table if not exists public.tender_pdf_jobs (
  invitation_id text primary key,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  priority integer not null default 0,
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tender_pdf_jobs_ready_idx
  on public.tender_pdf_jobs (priority desc, available_at, created_at)
  where status = 'pending';

alter table public.tender_pdf_jobs enable row level security;
revoke all on table public.tender_pdf_jobs from public, anon, authenticated;
grant all on table public.tender_pdf_jobs to service_role;

create or replace function public.enqueue_stale_tender_pdf_jobs()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  queued_rows integer;
  stale_before text := to_char(timezone('UTC', now() - interval '24 hours'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  insert into public.tender_pdf_jobs (invitation_id, status, priority, available_at, locked_at, last_error, updated_at)
  select
    t.invitation_id::text,
    'pending',
    case when coalesce(t.is_receiving::text, '') = '1' then 100 else 0 end,
    now(),
    null,
    null,
    now()
  from public.tenders t
  where t.invitation_id is not null
    and (
      coalesce(t.raw_data #>> '{liveBundle,schemaVersion}', '') <> '2'
      or coalesce(t.raw_data #>> '{liveBundle,fetchedAt}', '') < stale_before
    )
  on conflict (invitation_id) do update
  set status = 'pending',
      priority = excluded.priority,
      available_at = now(),
      locked_at = null,
      last_error = null,
      updated_at = now()
  where public.tender_pdf_jobs.status <> 'processing'
     or public.tender_pdf_jobs.locked_at is null
     or public.tender_pdf_jobs.locked_at < now() - interval '30 minutes';

  get diagnostics queued_rows = row_count;
  return queued_rows;
end;
$$;

create or replace function public.claim_tender_pdf_jobs(p_limit integer default 3)
returns table(invitation_id text)
language sql
security invoker
set search_path = public
as $$
  with candidates as (
    select jobs.invitation_id
    from public.tender_pdf_jobs jobs
    where jobs.status = 'pending'
      and jobs.available_at <= now()
    order by jobs.priority desc, jobs.available_at asc, jobs.created_at asc
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 3), 10))
  ), claimed as (
    update public.tender_pdf_jobs jobs
    set status = 'processing',
        attempt_count = jobs.attempt_count + 1,
        locked_at = now(),
        updated_at = now()
    from candidates
    where jobs.invitation_id = candidates.invitation_id
    returning jobs.invitation_id
  )
  select claimed.invitation_id from claimed;
$$;

create or replace function public.finish_tender_pdf_job(
  p_invitation_id text,
  p_success boolean,
  p_error text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.tender_pdf_jobs jobs
  set status = case
        when p_success then 'completed'
        when jobs.attempt_count >= 5 then 'failed'
        else 'pending'
      end,
      available_at = case
        when p_success then now()
        else now() + make_interval(hours => least(24, greatest(1, power(2, jobs.attempt_count)::integer)))
      end,
      locked_at = null,
      last_error = case when p_success then null else left(coalesce(p_error, 'PDF job failed'), 2000) end,
      updated_at = now()
  where jobs.invitation_id = p_invitation_id;
end;
$$;

revoke all on function public.enqueue_stale_tender_pdf_jobs() from public, anon, authenticated;
revoke all on function public.claim_tender_pdf_jobs(integer) from public, anon, authenticated;
revoke all on function public.finish_tender_pdf_job(text, boolean, text) from public, anon, authenticated;
grant execute on function public.enqueue_stale_tender_pdf_jobs() to service_role;
grant execute on function public.claim_tender_pdf_jobs(integer) to service_role;
grant execute on function public.finish_tender_pdf_job(text, boolean, text) to service_role;
