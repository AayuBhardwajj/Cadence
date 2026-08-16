-- Migration 028: Add tier column to profiles table
-- Live-applied on Supabase 2026-08-15. Added to repo for historical record.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'FREE'
CHECK (tier IN ('FREE', 'PRO', 'PREMIUM'));
