-- Keep PDF text and stored PDFs only for live tenders (deadline not yet passed).
-- Closed tenders keep their listing data and structured summary, but lose the
-- full PDF text, the announcement HTML and any copy of the PDF in Storage.
--
-- Run this whole file once in the Supabase SQL editor. It is safe to re-run.

-- 1. One definition of "live", used everywhere below.
create or replace function public.tender_is_live(p_receive_date timestamptz, p_is_receiving integer)
returns boolean
language sql
stable
as $$
  select case
    when p_receive_date is not null then p_receive_date >= now() - interval '1 day'
    else coalesce(p_is_receiving, 0) = 1
  end;
$$;

-- 2. Queue PDF extraction for live tenders only, and drop queued jobs for
--    tenders that have closed since they were queued.
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
  delete from public.tender_pdf_jobs jobs
  using public.tenders t
  where t.invitation_id::text = jobs.invitation_id
    and jobs.status <> 'processing'
    and not public.tender_is_live(t.receive_date, t.is_receiving);

  insert into public.tender_pdf_jobs (invitation_id, status, priority, available_at, locked_at, last_error, updated_at)
  select
    t.invitation_id::text,
    'pending',
    100,
    now(),
    null,
    null,
    now()
  from public.tenders t
  where t.invitation_id is not null
    and public.tender_is_live(t.receive_date, t.is_receiving)
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

-- 3. Strip heavy document data from closed tenders, in batches.
--    p_apply = false only reports what would change.
--    Stored-PDF links are pointed back at the official download proxy.
create or replace function public.prune_closed_tender_documents(p_apply boolean default false, p_batch integer default 500)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  candidates integer;
  candidate_bytes bigint;
  updated_rows integer := 0;
begin
  select count(*), coalesce(sum(pg_column_size(t.raw_data)), 0)
    into candidates, candidate_bytes
  from public.tenders t
  where not public.tender_is_live(t.receive_date, t.is_receiving)
    and (
      t.raw_data #> '{liveBundle,pdfText}' is not null
      or t.raw_data #> '{liveBundle,announcementHtml}' is not null
      or coalesce(t.raw_data ->> 'pdfUrl', '') like '%supabase.co%'
    );

  if p_apply then
    with batch as (
      select t.id
      from public.tenders t
      where not public.tender_is_live(t.receive_date, t.is_receiving)
        and (
          t.raw_data #> '{liveBundle,pdfText}' is not null
          or t.raw_data #> '{liveBundle,announcementHtml}' is not null
          or coalesce(t.raw_data ->> 'pdfUrl', '') like '%supabase.co%'
        )
      limit greatest(1, least(coalesce(p_batch, 500), 2000))
    )
    update public.tenders t
    set raw_data = (
      case
        when jsonb_typeof(t.raw_data #> '{liveBundle,documents}') = 'array' then
          jsonb_set(
            (t.raw_data #- '{liveBundle,pdfText}' #- '{liveBundle,announcementHtml}') - 'pdfUrl',
            '{liveBundle,documents}',
            coalesce((
              select jsonb_agg(
                case
                  when coalesce(doc ->> 'downloadUrl', '') like '%supabase.co%' and doc ? 'fileId' then
                    (doc - 'storagePath' - 'isStored')
                      || jsonb_build_object('downloadUrl', '/api/download?fileId=' || (doc ->> 'fileId'))
                  when coalesce(doc ->> 'downloadUrl', '') like '%supabase.co%' then
                    (doc - 'storagePath' - 'isStored' - 'downloadUrl')
                  else doc - 'storagePath' - 'isStored'
                end
              )
              from jsonb_array_elements(t.raw_data #> '{liveBundle,documents}') doc
            ), '[]'::jsonb)
          )
        else (t.raw_data #- '{liveBundle,pdfText}' #- '{liveBundle,announcementHtml}') - 'pdfUrl'
      end
    ) || jsonb_build_object('documentsPrunedAt', now()),
    updated_at = now()
    from batch
    where t.id = batch.id;

    get diagnostics updated_rows = row_count;
  end if;

  return jsonb_build_object(
    'closedTendersWithDocuments', candidates,
    'approxBytes', candidate_bytes,
    'updatedThisBatch', updated_rows,
    'remaining', greatest(candidates - updated_rows, 0)
  );
end;
$$;

revoke all on function public.prune_closed_tender_documents(boolean, integer) from public, anon, authenticated;
grant execute on function public.prune_closed_tender_documents(boolean, integer) to service_role;

-- 4. Lightweight read model for the tender list: same columns, but raw_data
--    without the full PDF text and announcement HTML. Respects table RLS.
create or replace view public.tenders_list
with (security_invoker = true)
as
select
  t.id,
  t.invitation_id,
  t.invitation_number,
  t.tender_code,
  t.tender_name,
  t.budget_entity_name,
  t.position_name,
  t.client_code,
  t.registration_number,
  t.total_budget,
  t.year_budget,
  t.tender_type_code,
  t.tender_type_name,
  t.rule_name,
  t.fund_name,
  t.publish_date,
  t.receive_date,
  t.open_date,
  t.doc_status_code,
  t.doc_status_name,
  t.doc_status_color,
  t.is_receiving,
  t.full_scope_of_work,
  t.eligibility_requirements,
  t.historical_flags,
  (t.raw_data #- '{liveBundle,pdfText}' #- '{liveBundle,announcementHtml}') as raw_data,
  t.created_at,
  t.updated_at
from public.tenders t;

grant select on public.tenders_list to anon, authenticated, service_role;
