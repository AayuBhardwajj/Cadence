-- =============================================================================
-- auth_stub.sql
-- Minimal local stub for the Supabase-managed `auth` schema.
--
-- Purpose: Satisfies foreign key constraints and RLS policy function calls that
--   reference `auth.*` objects, during local development with a plain Postgres
--   container. This is NOT a replica of Supabase's production auth internals —
--   it omits GoTrue triggers, encrypted columns, multi-factor auth state, etc.
--
-- What IS included:
--   - auth schema
--   - auth.users table (only id + email — the only columns referenced by FKs
--     in public.* tables)
--   - auth.uid() stub function that returns NULL (sufficient for containers
--     that don't use RLS enforcement locally)
--
-- What is NOT included:
--   - auth.sessions, auth.refresh_tokens, auth.identities, auth.mfa_*,
--     auth.audit_log_entries, auth.flow_state — none of these are referenced
--     by FK constraints in the public schema dump.
--   - Any Supabase GoTrue triggers or security-definer functions.
--
-- Generated as part of Phase 0.1 hotfix on 2026-07-02.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS auth;

-- Minimal auth.users stub.
-- The public schema has foreign keys pointing at auth.users(id):
--   - public.profiles.id  (via Supabase convention)
--   - public.daily_tips.user_id
-- Only the columns needed to satisfy those FK definitions are included.
CREATE TABLE IF NOT EXISTS auth.users (
    id    UUID PRIMARY KEY,
    email TEXT
);

COMMENT ON TABLE auth.users IS
    'Minimal local stub for Supabase-managed auth.users. NOT a replica of '
    'production auth internals — exists only to satisfy foreign key constraints '
    'from public.profiles and public.daily_tips during local development. '
    'Generated as part of Phase 0.1 hotfix.';

-- Stub for auth.uid() — returns NULL locally.
-- In Supabase production this returns the UUID of the currently authenticated
-- PostgREST user. RLS policies that call auth.uid() compile but are effectively
-- no-ops in the local container (which does not run PostgREST).
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
    SELECT NULL::UUID;
$$;

COMMENT ON FUNCTION auth.uid() IS
    'Stub implementation of Supabase auth.uid(). Always returns NULL in local '
    'development. In production this is provided by Supabase/GoTrue.';
