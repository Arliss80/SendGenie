/*
  # Add Timezone to User Profiles

  1. Changes to Tables
    - `user_profiles` table
      - Add `timezone` (text, default 'UTC') - User's preferred timezone for scheduling
  
  2. Notes
    - Timezone field will store IANA timezone identifiers (e.g., 'America/New_York')
    - Default is set to 'UTC' for existing users
    - This ensures scheduled emails are sent at the correct local time for each user
*/

-- Add timezone column to user_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN timezone text DEFAULT 'UTC';
  END IF;
END $$;