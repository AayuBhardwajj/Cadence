-- Enable RLS just in case it isn't already enabled
ALTER TABLE speech_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they overlap, or to start fresh (optional, you can remove these drops if you prefer)
DROP POLICY IF EXISTS "Enable insert for all users" ON speech_profiles;
DROP POLICY IF EXISTS "Enable update for all users" ON speech_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON speech_profiles;

-- Create policy to allow inserts
CREATE POLICY "Enable insert for all users"
ON speech_profiles FOR INSERT
TO public
WITH CHECK (true);

-- Create policy to allow updates
CREATE POLICY "Enable update for all users"
ON speech_profiles FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Create policy to allow selects
CREATE POLICY "Enable read access for all users"
ON speech_profiles FOR SELECT
TO public
USING (true);
