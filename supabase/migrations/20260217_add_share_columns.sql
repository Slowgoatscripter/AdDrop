-- Add share link columns to campaigns table
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Unique index for fast token lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_share_token
  ON campaigns (share_token)
  WHERE share_token IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN campaigns.share_token IS 'Public share link token, nullable. Set when agent shares campaign.';
COMMENT ON COLUMN campaigns.share_expires_at IS 'Share link expiry timestamp. Default 7 days from creation.';
