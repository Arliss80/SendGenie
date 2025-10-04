/*
  # Add AI Context Fields to User Profiles

  1. Changes
    - Add `what_you_do` (text) - Description of what the user does professionally
    - Add `product_description` (text) - Description of the product/service they're selling
    - Add `campaign_goals` (text) - Their goals for using this email platform
    - Add `target_audience` (text) - Who they're trying to reach
    - Add `value_proposition` (text) - Their unique value proposition

  2. Purpose
    - These fields provide context to the AI for generating more relevant, personalized emails
    - Users describe their business once, then AI uses this context automatically
    - Saves time by not having to re-explain their product/goals for each campaign
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'what_you_do'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN what_you_do text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'product_description'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN product_description text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'campaign_goals'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN campaign_goals text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'target_audience'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN target_audience text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'value_proposition'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN value_proposition text DEFAULT '';
  END IF;
END $$;