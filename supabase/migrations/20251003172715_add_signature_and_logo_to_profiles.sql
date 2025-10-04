/*
  # Add Email Signature and Company Logo Fields to User Profiles

  1. Schema Changes
    - Add signature fields to `user_profiles` table:
      - `signature_enabled` (boolean) - Global toggle to enable/disable signature
      - `signature_name` (text) - Name to display in signature
      - `signature_title` (text) - Job title to display in signature
      - `signature_phone` (text) - Phone number in signature
      - `signature_email` (text) - Email address in signature
      - `signature_website` (text) - Website URL in signature
      - `signature_linkedin` (text) - LinkedIn profile URL
      - `signature_custom_text` (text) - Custom tagline or additional text
      
    - Add logo fields to `user_profiles` table:
      - `company_logo_url` (text) - URL to uploaded company logo
      - `logo_enabled` (boolean) - Global toggle to enable/disable logo in signature

  2. Default Values
    - All signature fields default to empty string
    - Boolean fields default to false (disabled)
    - Users must explicitly enable signature and logo features

  3. Important Notes
    - Signature and logo are disabled by default
    - Users control global settings in profile, per-campaign settings in campaign builder
    - Logo URL will point to Supabase Storage after upload
    - All signature fields are optional to allow flexible signature configurations
*/

-- Add signature fields to user_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'signature_enabled'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN signature_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'signature_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN signature_name text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'signature_title'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN signature_title text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'signature_phone'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN signature_phone text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'signature_email'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN signature_email text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'signature_website'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN signature_website text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'signature_linkedin'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN signature_linkedin text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'signature_custom_text'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN signature_custom_text text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'company_logo_url'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN company_logo_url text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'logo_enabled'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN logo_enabled boolean DEFAULT false;
  END IF;
END $$;
