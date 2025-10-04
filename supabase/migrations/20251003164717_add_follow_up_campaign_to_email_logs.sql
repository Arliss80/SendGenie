/*
  # Add Follow-up Campaign Tracking to Email Logs

  1. Changes
    - Add `follow_up_campaign_id` column to `email_logs` table
    - Add foreign key constraint to `follow_up_campaigns` table
    - Create index for better query performance

  2. Purpose
    - Track which email logs belong to follow-up campaigns vs original campaigns
    - Enable separate analytics for follow-up campaign performance
    - Maintain data integrity with proper foreign key relationships
*/

-- Add follow_up_campaign_id column to email_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_logs' AND column_name = 'follow_up_campaign_id'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN follow_up_campaign_id uuid REFERENCES follow_up_campaigns(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_email_logs_follow_up_campaign_id ON email_logs(follow_up_campaign_id);
