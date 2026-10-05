-- infrastructure/dev/verify-dev-run.sql
-- Read-only verification query for local dev database state (D26).
-- Returns table name, row count, and most recent timestamp for key tables.

SELECT 
    'assessment_sessions' AS table_name,
    COUNT(*) AS row_count,
    MAX(created_at) AS latest_timestamp
FROM public.assessment_sessions

UNION ALL

SELECT 
    'assessment_reports' AS table_name,
    COUNT(*) AS row_count,
    MAX(created_at) AS latest_timestamp
FROM public.assessment_reports

UNION ALL

SELECT 
    'assessments' AS table_name,
    COUNT(*) AS row_count,
    MAX(created_at) AS latest_timestamp
FROM public.assessments

UNION ALL

SELECT 
    'ai_usage_logs' AS table_name,
    COUNT(*) AS row_count,
    MAX(created_at) AS latest_timestamp
FROM public.ai_usage_logs

UNION ALL

SELECT 
    'generated_passages' AS table_name,
    COUNT(*) AS row_count,
    MAX(generated_at) AS latest_timestamp
FROM public.generated_passages

UNION ALL

SELECT 
    'passage_pool' AS table_name,
    COUNT(*) AS row_count,
    MAX(created_at) AS latest_timestamp
FROM public.passage_pool

UNION ALL

SELECT 
    'practice_sessions' AS table_name,
    COUNT(*) AS row_count,
    MAX(created_at) AS latest_timestamp
FROM public.practice_sessions

UNION ALL

SELECT 
    'daily_tips' AS table_name,
    COUNT(*) AS row_count,
    MAX(generated_at) AS latest_timestamp
FROM public.daily_tips

UNION ALL

SELECT 
    'storage.objects' AS table_name,
    COUNT(*) AS row_count,
    MAX(created_at) AS latest_timestamp
FROM storage.objects

ORDER BY table_name;
