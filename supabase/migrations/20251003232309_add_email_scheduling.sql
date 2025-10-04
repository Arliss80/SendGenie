/*
  # Add Email Scheduling Support

  1. Changes to Tables
    - `campaigns` table
      - Add `scheduled_send_date` (timestamptz, nullable) - When to send the campaign emails
      - Add `is_scheduled` (boolean, default false) - Whether this campaign is scheduled
      - Add `status` (text, default 'draft') - Campaign status: draft, scheduled, sending, sent, cancelled
    
    - `follow_up_campaigns` table
      - Add `scheduled_send_date` (timestamptz, nullable) - When to send follow-up emails
      - Add `is_scheduled` (boolean, default false) - Whether this follow-up is scheduled
      - Add `status` (text, default 'draft') - Follow-up status: draft, scheduled, sending, sent, cancelled
  
  2. Notes
    - Scheduled emails will be processed by a background edge function
    - Status tracking allows users to see campaign progress
    - Nullable scheduled_send_date allows immediate sending (when null or past)
*/

-- Add scheduling columns to campaigns table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'scheduled_send_date'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN scheduled_send_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'is_scheduled'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN is_scheduled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'status'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN status text DEFAULT 'draft';
  END IF;
END $$;

-- Add scheduling columns to follow_up_campaigns table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'follow_up_campaigns' AND column_name = 'scheduled_send_date'
  ) THEN
    ALTER TABLE follow_up_campaigns ADD COLUMN scheduled_send_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'follow_up_campaigns' AND column_name = 'is_scheduled'
  ) THEN
    ALTER TABLE follow_up_campaigns ADD COLUMN is_scheduled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'follow_up_campaigns' AND column_name = 'status'
  ) THEN
    ALTER TABLE follow_up_campaigns ADD COLUMN status text DEFAULT 'draft';
  END IF;
END $$;