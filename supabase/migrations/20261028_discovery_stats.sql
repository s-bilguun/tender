-- Live figures for the "Buyers and sectors" table on the dashboard.
-- Buyers: tenders open now, tenders and published budget in the last 12 months.
-- Sectors: tenders open now. raw_data (large) is only read for open rows.
create or replace function public.get_discovery_stats(p_buyers text[], p_sectors text[])
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with recent as materialized (
    select
      invitation_id,
      budget_entity_name,
      total_budget,
      (
        receive_date >= now()
        or (receive_date is null and coalesce(is_receiving, 0) = 1 and publish_date >= now() - interval '21 days')
      ) as is_open
    from public.tenders
    where publish_date >= now() - interval '365 days'
  ),
  buyer_rows as (
    select b.pattern, r.total_budget, r.is_open
    from unnest(p_buyers) as b(pattern)
    join recent r on r.budget_entity_name ilike '%' || b.pattern || '%'
  ),
  buyers as (
    select coalesce(jsonb_object_agg(pattern, jsonb_build_object(
      'openCount', open_count, 'yearCount', year_count, 'yearBudget', year_budget
    )), '{}'::jsonb) as value
    from (
      select pattern,
        count(*) filter (where is_open) as open_count,
        count(*) as year_count,
        coalesce(sum(total_budget) filter (where total_budget > 0), 0) as year_budget
      from buyer_rows
      group by pattern
    ) g
  ),
  open_industry as (
    select lower(coalesce(t.raw_data ->> 'industry', '')) as industry
    from recent r
    join public.tenders t on t.invitation_id = r.invitation_id
    where r.is_open
  ),
  sectors as (
    select coalesce(jsonb_object_agg(s.id, jsonb_build_object(
      'openCount', (select count(*) from open_industry o where o.industry = s.id)
    )), '{}'::jsonb) as value
    from unnest(p_sectors) as s(id)
  )
  select jsonb_build_object('buyers', buyers.value, 'sectors', sectors.value, 'generatedAt', now())
  from buyers, sectors;
$$;

grant execute on function public.get_discovery_stats(text[], text[]) to anon, authenticated;
