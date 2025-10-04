/*
  # Email Open Tracking System

  1. New Tables
    - `email_opens`
      - `id` (uuid, primary key) - Unique identifier for each open event
      - `email_log_id` (uuid, references email_logs) - Link to the specific email that was opened
      - `campaign_id` (uuid, references campaigns) - Campaign for quick filtering
      - `contact_id` (uuid, references contacts) - Contact who opened the email
      - `user_id` (uuid, references auth.users) - Owner of the campaign
      - `opened_at` (timestamptz) - Timestamp when email was opened
      - `created_at` (timestamptz) - Record creation time

  2. Schema Updates
    - Add `tracking_pixel_id` (uuid) to email_logs - Unique ID for tracking pixel URL
    - Add `opened_count` (integer) to email_logs - Total number of times email was opened
    - Add `first_opened_at` (timestamptz) to email_logs - Timestamp of first open
    - Add `last_opened_at` (timestamptz) to email_logs - Timestamp of most recent open

  3. Indexes
    - Index on email_opens(email_log_id) for quick lookup by email
    - Index on email_opens(campaign_id) for campaign-level analytics
    - Index on email_opens(contact_id) for contact-level analytics
    - Index on email_logs(tracking_pixel_id) for fast tracking pixel lookups

  4. Security
    - Enable RLS on email_opens table
    - Users can only view and manage their own tracking data
    - Policies for select, insert operations
*/

-- Add new columns to email_logs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_logs' AND column_name = 'tracking_pixel_id'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN tracking_pixel_id uuid UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_logs' AND column_name = 'opened_count'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN opened_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_logs' AND column_name = 'first_opened_at'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN first_opened_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_logs' AND column_name = 'last_opened_at'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN last_opened_at timestamptz;
  END IF;
END $$;

-- Create email_opens table
CREATE TABLE IF NOT EXISTS email_opens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_log_id uuid REFERENCES email_logs(id) ON DELETE CASCADE NOT NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  opened_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_email_opens_email_log_id ON email_opens(email_log_id);
CREATE INDEX IF NOT EXISTS idx_email_opens_campaign_id ON email_opens(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_opens_contact_id ON email_opens(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_opens_user_id ON email_opens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_opens_opened_at ON email_opens(opened_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_tracking_pixel_id ON email_logs(tracking_pixel_id);

-- Enable Row Level Security
ALTER TABLE email_opens ENABLE ROW LEVEL SECURITY;

-- Email opens policies
CREATE POLICY "Users can view own email opens"
  ON email_opens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own email opens"
  ON email_opens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can create email opens"
  ON email_opens FOR INSERT
  TO authenticated
  WITH CHECK (true);
