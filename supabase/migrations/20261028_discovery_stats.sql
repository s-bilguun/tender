-- Live figures for the "Buyers and sectors" table on the dashboard.
-- For each buyer name pattern and each sector id: tenders open now, tenders in
-- the last 12 months, and the summed budget of those with a published budget.
create or replace function public.get_discovery_stats(p_buyers text[], p_sectors text[])
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with recent as (
    select
      budget_entity_name,
      lower(coalesce(raw_data ->> 'industry', '')) as industry,
      total_budget,
      (
        receive_date >= now()
        or (receive_date is null and coalesce(is_receiving, 0) = 1 and publish_date >= now() - interval '21 days')
      ) as is_open
    from public.tenders
    where publish_date >= now() - interval '365 days'
  ),
  buyers as (
    select coalesce(jsonb_object_agg(b.pattern, jsonb_build_object(
      'openCount', (select count(*) from recent r where r.is_open and r.budget_entity_name ilike '%' || b.pattern || '%'),
      'yearCount', (select count(*) from recent r where r.budget_entity_name ilike '%' || b.pattern || '%'),
      'yearBudget', (select coalesce(sum(r.total_budget), 0) from recent r where r.budget_entity_name ilike '%' || b.pattern || '%' and r.total_budget > 0)
    )), '{}'::jsonb) as value
    from unnest(p_buyers) as b(pattern)
  ),
  sectors as (
    select coalesce(jsonb_object_agg(s.id, jsonb_build_object(
      'openCount', (select count(*) from recent r where r.is_open and r.industry = s.id),
      'yearCount', (select count(*) from recent r where r.industry = s.id),
      'yearBudget', (select coalesce(sum(r.total_budget), 0) from recent r where r.industry = s.id and r.total_budget > 0)
    )), '{}'::jsonb) as value
    from unnest(p_sectors) as s(id)
  )
  select jsonb_build_object('buyers', buyers.value, 'sectors', sectors.value, 'generatedAt', now())
  from buyers, sectors;
$$;

grant execute on function public.get_discovery_stats(text[], text[]) to anon, authenticated;
