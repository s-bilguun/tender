-- ==============================================================================
-- TenderHub MN: Supabase PostgreSQL & Search Engine Schema
-- Run this script in the Supabase SQL Editor to initialize your database tables.
-- ==============================================================================

-- 1. Enable Necessary Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Create Tenders Table with Full Scope & Search Indexing
CREATE TABLE IF NOT EXISTS public.tenders (
    id BIGSERIAL PRIMARY KEY,
    invitation_id TEXT UNIQUE NOT NULL,
    invitation_number TEXT,
    tender_code TEXT,
    tender_name TEXT NOT NULL,
    budget_entity_name TEXT,
    position_name TEXT,
    client_code TEXT,
    registration_number TEXT,
    total_budget NUMERIC DEFAULT 0,
    year_budget NUMERIC DEFAULT 0,
    tender_type_code TEXT DEFAULT 'JOB', -- 'PRODUCT' | 'JOB' | 'SERVICE'
    tender_type_name TEXT DEFAULT 'Ажил',
    rule_name TEXT,
    fund_name TEXT,
    publish_date TIMESTAMPTZ,
    receive_date TIMESTAMPTZ,
    open_date TIMESTAMPTZ,
    doc_status_code TEXT DEFAULT 'RECEIVE_TENDER',
    doc_status_name TEXT DEFAULT 'Тендер хүлээн авч байгаа',
    doc_status_color TEXT DEFAULT '#10b981',
    is_receiving INTEGER DEFAULT 1,
    
    -- Full Document Ingestion & Search Engine Fields
    full_scope_of_work TEXT,                 -- Full BoQ, technical specs & scope of work
    eligibility_requirements JSONB DEFAULT '[]'::jsonb, -- Array of qualification rules
    historical_flags TEXT,                   -- Recurring pattern notes & pricing trends
    raw_data JSONB DEFAULT '{}'::jsonb,      -- Complete extracted JSON & Live Bundle
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Core Relational & Filtering Indexes
CREATE INDEX IF NOT EXISTS idx_tenders_invitation_number ON public.tenders (invitation_number);
CREATE INDEX IF NOT EXISTS idx_tenders_tender_code ON public.tenders (tender_code);
CREATE INDEX IF NOT EXISTS idx_tenders_publish_date ON public.tenders (publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_tenders_receive_date ON public.tenders (receive_date ASC);
CREATE INDEX IF NOT EXISTS idx_tenders_total_budget ON public.tenders (total_budget DESC);
CREATE INDEX IF NOT EXISTS idx_tenders_is_receiving ON public.tenders (is_receiving);
CREATE INDEX IF NOT EXISTS idx_tenders_type_code ON public.tenders (tender_type_code);

-- 4. Deep Search Engine Trigram GIN Indexes (Sub-second Mongolian & English search)
CREATE INDEX IF NOT EXISTS idx_tenders_name_trgm ON public.tenders USING gin (tender_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tenders_entity_trgm ON public.tenders USING gin (budget_entity_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tenders_scope_trgm ON public.tenders USING gin (full_scope_of_work gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tenders_raw_data_gin ON public.tenders USING gin (raw_data);
CREATE INDEX IF NOT EXISTS idx_tenders_eligibility_gin ON public.tenders USING gin (eligibility_requirements);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;

-- Public read access for web users
DROP POLICY IF EXISTS "Public read access for tenders" ON public.tenders;
CREATE POLICY "Public read access for tenders" 
ON public.tenders FOR SELECT 
USING (true);

-- Service role / Admin write access
DROP POLICY IF EXISTS "Service role write access" ON public.tenders;
CREATE POLICY "Service role write access" 
ON public.tenders FOR ALL 
USING (auth.role() = 'service_role' OR auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');
