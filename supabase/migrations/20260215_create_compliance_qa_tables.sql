-- Create compliance_test_ads table for storing test ad listings
CREATE TABLE compliance_test_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL,
  name text NOT NULL,
  text text NOT NULL,
  expected_violations jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_clean boolean NOT NULL DEFAULT false,
  tags text[] NOT NULL DEFAULT '{}',
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create compliance_test_runs table for tracking QA test runs
CREATE TABLE compliance_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type text NOT NULL CHECK (run_type IN ('single-state', 'full-suite', 'ad-hoc')),
  state text,
  triggered_by text NOT NULL DEFAULT 'manual' CHECK (triggered_by IN ('manual', 'scheduled')),
  run_by uuid REFERENCES auth.users(id),
  run_at timestamptz DEFAULT now(),
  duration_ms integer,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  cross_state jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security on both tables
ALTER TABLE compliance_test_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_test_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for compliance_test_ads
CREATE POLICY "Admin users can view test ads"
  ON compliance_test_ads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can create test ads"
  ON compliance_test_ads
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can update test ads"
  ON compliance_test_ads
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete test ads"
  ON compliance_test_ads
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for compliance_test_runs
CREATE POLICY "Admin users can view test runs"
  ON compliance_test_runs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can create test runs"
  ON compliance_test_runs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for better query performance
CREATE INDEX idx_compliance_test_ads_state ON compliance_test_ads(state);
CREATE INDEX idx_compliance_test_runs_state ON compliance_test_runs(state);
CREATE INDEX idx_compliance_test_runs_run_at ON compliance_test_runs(run_at DESC);
