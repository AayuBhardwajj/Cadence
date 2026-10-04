-- infrastructure/dev/bootstrap/00_default_privileges.sql
-- Default privileges parity for local dev stack (role postgres in schema public).
-- Executed before Flyway migrations so that tables/sequences/functions created by
-- postgres inherit access for Supabase platform roles (anon, authenticated, service_role).
-- NOT part of Flyway history. Idempotent.

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
