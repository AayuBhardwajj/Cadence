-- Drop the problematic foreign key constraint
ALTER TABLE speech_profiles 
DROP CONSTRAINT IF EXISTS speech_profiles_created_from_assessment_id_fkey;

-- (Optional) If you want to allow nulls instead of forcing it to link to an assessment right away
ALTER TABLE speech_profiles 
ALTER COLUMN created_from_assessment_id DROP NOT NULL;
