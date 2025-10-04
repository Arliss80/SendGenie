/*
  # Add Logo Size Preference to User Profiles

  1. Schema Changes
    - Add `logo_size` field to `user_profiles` table
    - Values: 'small', 'medium', 'large'
    - Default to 'medium'

  2. Important Notes
    - Users can choose their preferred logo size in email signatures
    - Small: 100px, Medium: 150px, Large: 200px max width
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'logo_size'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN logo_size text DEFAULT 'medium';
  END IF;
END $$;
