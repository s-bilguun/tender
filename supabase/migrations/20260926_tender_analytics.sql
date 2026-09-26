-- Exact dashboard aggregates come from the stored tender rows, not UI constants.
create or replace function public.get_tender_analytics()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with normalized as (
    select
      invitation_id,
      coalesce(total_budget, 0) as budget,
      total_budget is not null and total_budget > 0 as budget_known,
      tender_type_code,
      coalesce(position_name, budget_entity_name, 'Бусад захиалагч') as agency,
      lower(coalesce(doc_status_name, '')) as status_name,
      coalesce(doc_status_code, '') as status_code,
      coalesce(is_receiving, 0) = 1 or lower(coalesce(doc_status_name, '')) like '%хүлээн авч%' as is_receiving,
      coalesce(raw_data #>> '{liveBundle,schemaVersion}', '') = '2'
        and lower(coalesce(raw_data #>> '{liveBundle,structuredSpecs,bidSecurityReq}', '')) like '%шаардахгүй%' as pdf_confirms_no_bid_security,
      receive_date,
      publish_date,
      lower(coalesce(raw_data ->> 'industry', '')) as industry,
      updated_at
    from public.tenders
  ),
  aggregate_stats as (
    select
      count(*)::integer as total_count,
      case when count(*) filter (where not budget_known) > 0 then null else coalesce(sum(budget), 0)::numeric end as total_budget_sum,
      count(*) filter (where is_receiving)::integer as active_count,
      case when count(*) filter (where is_receiving and not budget_known) > 0 then null
        else coalesce(sum(budget) filter (where is_receiving), 0)::numeric end as active_budget_sum,
      count(*) filter (where is_receiving and receive_date between now() and now() + interval '48 hours')::integer as closing_soon_count,
      count(*) filter (where is_receiving and pdf_confirms_no_bid_security)::integer as no_guarantee_count,
      count(*) filter (where status_name like '%үр дүн%' or status_name like '%дууссан%' or status_code = 'CLOSED')::integer as result_count,
      count(*) filter (where publish_date between now() - interval '96 hours' and now())::integer as new_count,
      count(*) filter (where tender_type_code = 'PRODUCT')::integer as product_count,
      count(*) filter (where tender_type_code = 'JOB')::integer as job_count,
      count(*) filter (where tender_type_code = 'SERVICE')::integer as service_count,
      max(updated_at) as last_updated_at
    from normalized
  ),
  top_agencies as (
    select coalesce(jsonb_agg(jsonb_build_object('name', name, 'count', agency_count, 'budget', budget) order by budget desc), '[]'::jsonb) as value
    from (
      select agency as name,
        count(*)::integer as agency_count,
        case when count(*) filter (where not budget_known) > 0 then null else sum(budget)::numeric end as budget
      from normalized
      group by agency
      order by sum(budget) desc
      limit 5
    ) ranked
  ),
  industry_stats as (
    select
      coalesce(jsonb_object_agg(industry, jsonb_build_object(
        'totalCount', total_count,
        'totalBudgetSum', total_budget_sum,
        'activeCount', active_count,
        'activeBudgetSum', active_budget_sum,
        'resultCount', result_count,
        'closingSoonCount', closing_soon_count
      )), '{}'::jsonb) as by_industry,
      coalesce(jsonb_object_agg(industry, active_count), '{}'::jsonb) as industry_counts
    from (
      select
        industry,
        count(*)::integer as total_count,
        case when count(*) filter (where not budget_known) > 0 then null else sum(budget)::numeric end as total_budget_sum,
        count(*) filter (where is_receiving)::integer as active_count,
        case when count(*) filter (where is_receiving and not budget_known) > 0 then null
          else coalesce(sum(budget) filter (where is_receiving), 0)::numeric end as active_budget_sum,
        count(*) filter (where status_name like '%үр дүн%' or status_name like '%дууссан%' or status_code = 'CLOSED')::integer as result_count,
        count(*) filter (where is_receiving and receive_date between now() and now() + interval '48 hours')::integer as closing_soon_count
      from normalized
      where industry in ('mining', 'it', 'construction', 'medical', 'food', 'transport', 'facility', 'stationery', 'consulting')
      group by industry
    ) by_industry
  )
  select jsonb_build_object(
    'totalCount', aggregate_stats.total_count,
    'totalBudgetSum', aggregate_stats.total_budget_sum,
    'activeTendersCount', aggregate_stats.active_count,
    'activeBudgetSum', aggregate_stats.active_budget_sum,
    'closingSoonCount', aggregate_stats.closing_soon_count,
    'noGuaranteeCount', aggregate_stats.no_guarantee_count,
    'resultCount', aggregate_stats.result_count,
    'newCount', aggregate_stats.new_count,
    'categoryCounts', jsonb_build_object(
      'product', aggregate_stats.product_count,
      'job', aggregate_stats.job_count,
      'service', aggregate_stats.service_count
    ),
    'topMinistries', top_agencies.value,
    'statsByIndustry', industry_stats.by_industry,
    'industryCounts', industry_stats.industry_counts,
    'lastUpdatedAt', aggregate_stats.last_updated_at
  )
  from aggregate_stats, top_agencies, industry_stats;
$$;

grant execute on function public.get_tender_analytics() to anon, authenticated;
