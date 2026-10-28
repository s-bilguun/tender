create table if not exists public.subscription_leads (
  id bigint generated always as identity primary key,
  plan text not null,
  billing_cycle text not null default 'annual' check (billing_cycle in ('annual', 'monthly')),
  contact text not null,
  company text,
  locale text,
  user_agent text,
  status text not null default 'new' check (status in ('new', 'contacted', 'converted', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists subscription_leads_created_idx on public.subscription_leads (created_at desc);

alter table public.subscription_leads enable row level security;
revoke all on table public.subscription_leads from public, anon, authenticated;
grant all on table public.subscription_leads to service_role;
