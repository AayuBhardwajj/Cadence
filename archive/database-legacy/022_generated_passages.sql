-- Migration: Create generated_passages table to store generated passages and their target word character mappings.
CREATE TABLE IF NOT EXISTS public.generated_passages (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passage_text  TEXT NOT NULL,
    difficulty    VARCHAR(50) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    topic         VARCHAR(100),
    target_words  JSONB NOT NULL DEFAULT '[]'::jsonb,
    word_count    INTEGER NOT NULL,
    generated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.generated_passages ENABLE ROW LEVEL SECURITY;

-- Allow read-only access to anyone
CREATE POLICY "Users can view generated passages"
  ON public.generated_passages FOR SELECT USING (TRUE);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_generated_passages_difficulty ON public.generated_passages (difficulty);
