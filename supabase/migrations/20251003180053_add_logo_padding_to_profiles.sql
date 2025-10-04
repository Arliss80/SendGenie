/*
  # Add Logo Padding Preference to User Profiles

  1. Schema Changes
    - Add `logo_padding` field to `user_profiles` table
    - Values: 'none', 'small', 'medium', 'large'
    - Default to 'medium'

  2. Important Notes
    - Users can choose padding around their logo in email signatures
    - None: 0px, Small: 5px, Medium: 10px, Large: 15px
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'logo_padding'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN logo_padding text DEFAULT 'medium';
  END IF;
END $$;
