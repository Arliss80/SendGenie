/*
  # Add Follow-up Campaign Tracking to Email Opens

  1. Changes
    - Add `follow_up_campaign_id` column to `email_opens` table
    - Add foreign key constraint to `follow_up_campaigns` table
    - Create index for better query performance

  2. Purpose
    - Track which email opens belong to follow-up campaigns vs original campaigns
    - Enable proper analytics separation for follow-up campaign performance
    - Maintain data integrity with proper foreign key relationships
*/

-- Add follow_up_campaign_id column to email_opens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_opens' AND column_name = 'follow_up_campaign_id'
  ) THEN
    ALTER TABLE email_opens ADD COLUMN follow_up_campaign_id uuid REFERENCES follow_up_campaigns(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_email_opens_follow_up_campaign_id ON email_opens(follow_up_campaign_id);
