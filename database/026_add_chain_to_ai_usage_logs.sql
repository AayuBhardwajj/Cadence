-- Migration: 026_add_chain_to_ai_usage_logs.sql
-- Description: Add chain column to ai_usage_logs table to track diagnostic_tier vs volume_tier routing.

ALTER TABLE public.ai_usage_logs
ADD COLUMN IF NOT EXISTS chain VARCHAR(50);
