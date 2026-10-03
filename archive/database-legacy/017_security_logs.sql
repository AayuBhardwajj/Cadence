-- Create Security Logs table
CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own security logs" ON public.security_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own security logs" ON public.security_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable Realtime for logs
alter publication supabase_realtime add table security_logs;