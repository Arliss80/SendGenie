/*
  # Create Storage Policies for Company Logos

  1. Security Policies
    - Allow authenticated users to upload their own logos
    - Allow public read access for all logos (needed for email display)
    - Allow authenticated users to update their own logos
    - Allow authenticated users to delete their own logos

  2. Important Notes
    - File naming convention: {user_id}/logo.{extension}
    - Public read access allows logos to be displayed in emails
    - Users can only manage files in their own folder
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload own logo" ON storage.objects;
DROP POLICY IF EXISTS "Public can read all logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own logo" ON storage.objects;

-- Policy: Allow authenticated users to upload their own logos
CREATE POLICY "Users can upload own logo"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos' AND
    (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- Policy: Allow public read access for all logos
CREATE POLICY "Public can read all logos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'company-logos');

-- Policy: Allow authenticated users to update their own logos
CREATE POLICY "Users can update own logo"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-logos' AND
    (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- Policy: Allow authenticated users to delete their own logos
CREATE POLICY "Users can delete own logo"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-logos' AND
    (string_to_array(name, '/'))[1] = auth.uid()::text
  );
