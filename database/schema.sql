-- BrandTrace core schema (Postgres / Supabase compatible)
-- Designed for optional cloud use. Local-first client remains fully usable without it.
-- Status values keep verified data separate from community submissions.

-- Enable useful extensions when available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Reference / lookup tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS status_values (
  code text PRIMARY KEY,
  description text NOT NULL
);

INSERT INTO status_values (code, description) VALUES
  ('verified', 'Reviewed and accepted as sufficiently sourced'),
  ('pending_review', 'Awaiting human review'),
  ('community_submission', 'Submitted by a community member, not yet reviewed'),
  ('disputed', 'Conflicting evidence exists; shown with caution'),
  ('archived', 'No longer current but retained for history'),
  ('rejected', 'Reviewed and not accepted')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Core entities
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  legal_name text,
  parent_company_id uuid REFERENCES companies(id),
  headquarters text,
  website text,
  public_private text,
  status text NOT NULL DEFAULT 'pending_review' REFERENCES status_values(code),
  confidence text DEFAULT 'unknown',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name text NOT NULL,
  description text,
  website text,
  current_owner_company_id uuid REFERENCES companies(id),
  status text NOT NULL DEFAULT 'pending_review' REFERENCES status_values(code),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name text NOT NULL,
  barcode text, -- GTIN / UPC / EAN normalized digits
  brand_id uuid REFERENCES brands(id),
  category text,
  region_market text,
  status text NOT NULL DEFAULT 'pending_review' REFERENCES status_values(code),
  confidence text DEFAULT 'unknown',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_barcode_idx ON products (barcode) WHERE barcode IS NOT NULL;

CREATE TABLE IF NOT EXISTS ownership_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_company_id uuid NOT NULL REFERENCES companies(id),
  owned_entity_type text NOT NULL CHECK (owned_entity_type IN ('company', 'brand')),
  owned_company_id uuid REFERENCES companies(id),
  owned_brand_id uuid REFERENCES brands(id),
  ownership_type text NOT NULL, -- owned, licensed, distributed, acquired, unclear
  ownership_percentage numeric,
  effective_date date,
  end_date date,
  status text NOT NULL DEFAULT 'pending_review' REFERENCES status_values(code),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (owned_entity_type = 'company' AND owned_company_id IS NOT NULL AND owned_brand_id IS NULL) OR
    (owned_entity_type = 'brand' AND owned_brand_id IS NOT NULL AND owned_company_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS acquisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acquirer_company_id uuid NOT NULL REFERENCES companies(id),
  acquired_company_id uuid REFERENCES companies(id),
  acquired_brand_id uuid REFERENCES brands(id),
  announcement_date date,
  completion_date date,
  description text,
  status text NOT NULL DEFAULT 'pending_review' REFERENCES status_values(code),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  publisher text,
  url text,
  publication_date date,
  access_date date,
  source_type text, -- company statement, regulatory, news, academic, retail listing, etc.
  reliability_tier text, -- high, medium, low, unknown
  archived_copy_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Evidence / claims linking entities to sources
CREATE TABLE IF NOT EXISTS evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  claim text NOT NULL,
  summary text,
  quote_excerpt text,
  evidence_type text,
  status text NOT NULL DEFAULT 'pending_review' REFERENCES status_values(code),
  confidence text DEFAULT 'unknown',
  related_company_id uuid REFERENCES companies(id),
  related_brand_id uuid REFERENCES brands(id),
  related_product_id uuid REFERENCES products(id),
  source_id uuid REFERENCES sources(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Community submissions & review
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_label text, -- optional anonymous or display name; no required accounts for basic use
  claim text NOT NULL,
  payload jsonb NOT NULL, -- flexible package of product/company/evidence drafts from the client
  related_product_id uuid REFERENCES products(id),
  related_company_id uuid REFERENCES companies(id),
  status text NOT NULL DEFAULT 'community_submission' REFERENCES status_values(code),
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id bigserial PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  change_type text NOT NULL, -- create, update, status_change, etc.
  previous_value jsonb,
  new_value jsonb,
  actor_label text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Helper: keep updated_at fresh
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['companies','brands','products','ownership_relationships','acquisitions','evidence','submissions']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;

-- Notes for implementers:
-- 1. Row Level Security (RLS) should be enabled in Supabase.
--    Public read can be limited to status = 'verified'.
--    Inserts into submissions can be allowed anonymously or with light auth.
-- 2. Never expose pending or rejected records as verified in the public API.
-- 3. The client remains fully functional with localStorage only.
