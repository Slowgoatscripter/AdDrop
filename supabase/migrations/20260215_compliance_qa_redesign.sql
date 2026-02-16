-- Compliance QA Redesign: Replace regex-based test ads with property-based pipeline testing

-- Drop old test ads table
DROP TABLE IF EXISTS compliance_test_ads;

-- Create test properties table
CREATE TABLE compliance_test_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  state text NOT NULL,
  listing_data jsonb NOT NULL,
  risk_category text NOT NULL DEFAULT 'clean',
  is_seed boolean NOT NULL DEFAULT false,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create snapshots table
CREATE TABLE compliance_test_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES compliance_test_properties(id) ON DELETE CASCADE,
  generated_text jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  approved boolean NOT NULL DEFAULT false
);

-- Update test runs table
ALTER TABLE compliance_test_runs
  ADD COLUMN IF NOT EXISTS run_mode text NOT NULL DEFAULT 'snapshot'
    CHECK (run_mode IN ('snapshot', 'full-pipeline'));

-- Drop cross_state column (no longer applicable)
ALTER TABLE compliance_test_runs
  DROP COLUMN IF EXISTS cross_state;

-- Indexes
CREATE INDEX idx_compliance_test_properties_state ON compliance_test_properties(state);
CREATE INDEX idx_compliance_test_snapshots_property ON compliance_test_snapshots(property_id);

-- RLS for test properties
ALTER TABLE compliance_test_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin select test properties"
  ON compliance_test_properties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin insert test properties"
  ON compliance_test_properties FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin update test properties"
  ON compliance_test_properties FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin delete test properties"
  ON compliance_test_properties FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS for snapshots
ALTER TABLE compliance_test_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin select snapshots"
  ON compliance_test_snapshots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin insert snapshots"
  ON compliance_test_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin delete snapshots"
  ON compliance_test_snapshots FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
