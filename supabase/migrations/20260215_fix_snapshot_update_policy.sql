-- Fix: Add missing UPDATE policy for compliance_test_snapshots
-- The original migration (20260215_compliance_qa_redesign.sql) defined SELECT, INSERT, DELETE
-- but omitted UPDATE, causing PGRST116 errors when approving/rejecting snapshots.

CREATE POLICY "Admin update snapshots"
  ON compliance_test_snapshots FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
