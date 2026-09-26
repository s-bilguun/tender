-- Listing refreshes must not erase document extraction results stored in raw_data.
create or replace function public.preserve_tender_live_bundle()
returns trigger
language plpgsql
as $$
declare
  preserved_keys text[] := array['tenderDocumentId', 'tenderId'];
  preserved_key text;
  old_fetched_at text;
  new_fetched_at text;
begin
  new.raw_data := coalesce(new.raw_data, '{}'::jsonb);
  old_fetched_at := old.raw_data #>> '{liveBundle,fetchedAt}';
  new_fetched_at := new.raw_data #>> '{liveBundle,fetchedAt}';
  foreach preserved_key in array preserved_keys loop
    if (not (new.raw_data ? preserved_key) or new.raw_data -> preserved_key = 'null'::jsonb)
       and (coalesce(old.raw_data, '{}'::jsonb) ? preserved_key) then
      new.raw_data := new.raw_data || jsonb_build_object(preserved_key, old.raw_data -> preserved_key);
    end if;
  end loop;

  -- A listing upsert can carry a stale client-side snapshot. Keep whichever
  -- extraction has the newer canonical ISO timestamp.
  if (not (new.raw_data ? 'liveBundle')
      or new.raw_data -> 'liveBundle' = 'null'::jsonb
      or new_fetched_at is null
      or (old_fetched_at is not null and old_fetched_at > new_fetched_at))
     and (coalesce(old.raw_data, '{}'::jsonb) ? 'liveBundle') then
    new.raw_data := new.raw_data || jsonb_build_object('liveBundle', old.raw_data -> 'liveBundle');
  end if;

  return new;
end;
$$;

drop trigger if exists preserve_tender_live_bundle_before_update on public.tenders;
create trigger preserve_tender_live_bundle_before_update
before update on public.tenders
for each row execute function public.preserve_tender_live_bundle();

-- Bundle writes are performed with one Postgres-side JSON merge so a concurrent
-- metadata sync cannot replace the entire raw_data object from a stale snapshot.
create or replace function public.merge_tender_live_bundle(
  p_invitation_id text,
  p_live_bundle jsonb,
  p_tender_document_id bigint default null,
  p_tender_id bigint default null
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  affected_rows integer;
  extra_fields jsonb := '{}'::jsonb;
begin
  if p_tender_document_id is not null then
    extra_fields := extra_fields || jsonb_build_object('tenderDocumentId', p_tender_document_id);
  end if;
  if p_tender_id is not null then
    extra_fields := extra_fields || jsonb_build_object('tenderId', p_tender_id);
  end if;

  update public.tenders
  set raw_data = coalesce(raw_data, '{}'::jsonb)
      || jsonb_build_object('liveBundle', p_live_bundle)
      || extra_fields,
      updated_at = now()
  where invitation_id::text = p_invitation_id;

  get diagnostics affected_rows = row_count;
  return affected_rows;
end;
$$;

revoke all on function public.merge_tender_live_bundle(text, jsonb, bigint, bigint) from public, anon, authenticated;
grant execute on function public.merge_tender_live_bundle(text, jsonb, bigint, bigint) to service_role;
