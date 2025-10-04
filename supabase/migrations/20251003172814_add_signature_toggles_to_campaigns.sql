/*
  # Add Signature and Logo Toggles to Campaigns Table

  1. Schema Changes
    - Add to `campaigns` table:
      - `include_signature` (boolean) - Whether to include signature in this campaign
      - `include_logo` (boolean) - Whether to include company logo in this campaign
      
  2. Default Values
    - Both fields default to true (enabled)
    - Users can disable per campaign if needed
    - Respects global profile settings first, then campaign-level overrides

  3. Important Notes
    - Campaign-level toggles override profile settings
    - If profile signature is disabled, campaign toggle has no effect
    - These settings are checked when generating and sending emails
*/

-- Add signature toggle fields to campaigns table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campaigns' AND column_name = 'include_signature'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN include_signature boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campaigns' AND column_name = 'include_logo'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN include_logo boolean DEFAULT true;
  END IF;
END $$;
