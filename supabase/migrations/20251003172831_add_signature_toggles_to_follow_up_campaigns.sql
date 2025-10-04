/*
  # Add Signature and Logo Toggles to Follow-Up Campaigns Table

  1. Schema Changes
    - Add to `follow_up_campaigns` table:
      - `include_signature` (boolean) - Whether to include signature in this follow-up campaign
      - `include_logo` (boolean) - Whether to include company logo in this follow-up campaign
      
  2. Default Values
    - Both fields default to true (enabled)
    - Users can disable per follow-up campaign if needed
    - Respects global profile settings first, then campaign-level overrides

  3. Important Notes
    - Follow-up campaign-level toggles override profile settings
    - If profile signature is disabled, campaign toggle has no effect
    - These settings are checked when generating and sending follow-up emails
*/

-- Add signature toggle fields to follow_up_campaigns table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'follow_up_campaigns' AND column_name = 'include_signature'
  ) THEN
    ALTER TABLE follow_up_campaigns ADD COLUMN include_signature boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'follow_up_campaigns' AND column_name = 'include_logo'
  ) THEN
    ALTER TABLE follow_up_campaigns ADD COLUMN include_logo boolean DEFAULT true;
  END IF;
END $$;
