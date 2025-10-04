/*
  # Create Follow-up Campaigns and Contact Exclusions Schema

  1. New Tables
    - `follow_up_campaigns`
      - `id` (uuid, primary key)
      - `campaign_id` (uuid, foreign key to campaigns)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text)
      - `subject` (text)
      - `body` (text)
      - `engagement_threshold` (integer) - minimum opens required
      - `total_selected` (integer) - contacts selected
      - `total_excluded` (integer) - contacts excluded
      - `sent_count` (integer)
      - `failed_count` (integer)
      - `status` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `contact_exclusions`
      - `id` (uuid, primary key)
      - `follow_up_campaign_id` (uuid, foreign key to follow_up_campaigns)
      - `contact_id` (uuid, foreign key to contacts)
      - `user_id` (uuid, foreign key to auth.users)
      - `reason` (text) - optional note about why excluded
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to manage their own data
*/

-- Create follow_up_campaigns table
CREATE TABLE IF NOT EXISTS follow_up_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  engagement_threshold integer DEFAULT 1,
  total_selected integer DEFAULT 0,
  total_excluded integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create contact_exclusions table
CREATE TABLE IF NOT EXISTS contact_exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follow_up_campaign_id uuid REFERENCES follow_up_campaigns(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(follow_up_campaign_id, contact_id)
);

-- Enable RLS
ALTER TABLE follow_up_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_exclusions ENABLE ROW LEVEL SECURITY;

-- Policies for follow_up_campaigns
CREATE POLICY "Users can view own follow-up campaigns"
  ON follow_up_campaigns FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own follow-up campaigns"
  ON follow_up_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own follow-up campaigns"
  ON follow_up_campaigns FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own follow-up campaigns"
  ON follow_up_campaigns FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for contact_exclusions
CREATE POLICY "Users can view own contact exclusions"
  ON contact_exclusions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contact exclusions"
  ON contact_exclusions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contact exclusions"
  ON contact_exclusions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own contact exclusions"
  ON contact_exclusions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_follow_up_campaigns_campaign_id ON follow_up_campaigns(campaign_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_campaigns_user_id ON follow_up_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_exclusions_follow_up_campaign_id ON contact_exclusions(follow_up_campaign_id);
CREATE INDEX IF NOT EXISTS idx_contact_exclusions_contact_id ON contact_exclusions(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_exclusions_user_id ON contact_exclusions(user_id);
