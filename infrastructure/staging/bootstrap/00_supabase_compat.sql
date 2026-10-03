-- 00_supabase_compat.sql
-- Supabase-compatibility bootstrap for the staging PostgreSQL 17 container.
-- Mounted to /docker-entrypoint-initdb.d/ and executed ONCE at first container init,
-- BEFORE Flyway runs. This file is NOT part of Flyway history.
--
-- Purpose: provide the minimal auth, storage, and realtime stubs that the Flyway
-- V1-V3 migrations reference (auth.users, storage.buckets, storage.objects,
-- auth.uid(), storage.foldername(), supabase_realtime publication, and the three
-- Supabase roles). The staging container does not run a real Supabase stack.


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Supabase roles (NOLOGIN — they are referenced by RLS policies)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT;
  END IF;
END
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. auth schema + auth.users + auth.uid()
-- ─────────────────────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id                  uuid        PRIMARY KEY,
  email               text,
  raw_user_meta_data  jsonb       DEFAULT '{}'::jsonb
);

-- Real Supabase behaviour: returns the JWT claim 'sub' as uuid, NULL if unset.
CREATE OR REPLACE FUNCTION auth.uid()
  RETURNS uuid
  LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. storage schema + storage.buckets + storage.objects + storage.foldername()
-- ─────────────────────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id                  text        PRIMARY KEY,
  name                text        NOT NULL,
  public              boolean     NOT NULL DEFAULT false,
  file_size_limit     bigint,
  allowed_mime_types  text[]
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id   text        REFERENCES storage.buckets(id),
  name        text,
  owner       uuid,
  metadata    jsonb,
  created_at  timestamptz DEFAULT now()
);

-- Enable RLS on storage.objects so that the RLS policies in V2 can be created.
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Real Supabase behaviour: splits `name` on '/' and returns all segments except the last.
-- e.g. 'abc-uuid/photo.jpg' -> ARRAY['abc-uuid']
CREATE OR REPLACE FUNCTION storage.foldername(name text)
  RETURNS text[]
  LANGUAGE sql IMMUTABLE
AS $$
  SELECT
    CASE
      WHEN array_length(string_to_array(name, '/'), 1) <= 1 THEN ARRAY[]::text[]
      ELSE (string_to_array(name, '/'))[1 : array_length(string_to_array(name, '/'), 1) - 1]
    END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. supabase_realtime publication (for V2's ALTER PUBLICATION statement)
-- ─────────────────────────────────────────────────────────────────────────────
-- Note: In Supabase, supabase_realtime is created empty, and specific tables are
-- added via ALTER PUBLICATION ... ADD TABLE (as done in V2).
CREATE PUBLICATION supabase_realtime
  WITH (publish = 'insert, update, delete, truncate');


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Default privileges for the Flyway user (cadence_staging) in public schema
--    so that after Flyway creates tables, the Supabase roles can access them.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER DEFAULT PRIVILEGES
  FOR ROLE cadence_staging
  IN SCHEMA public
  GRANT ALL ON TABLES    TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES
  FOR ROLE cadence_staging
  IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES
  FOR ROLE cadence_staging
  IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. GRANT USAGE on schemas to the three roles
-- ─────────────────────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA public  TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth    TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
