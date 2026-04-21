
create table if not exists public.daily_tips (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  tip_date      date not null,
  tip_text      text not null,
  is_personalized boolean not null default false,
  generated_at  timestamptz not null default now(),
 
  -- One tip per user per day
  unique (user_id, tip_date)
);
 
-- Index for fast daily lookup
create index if not exists idx_daily_tips_user_date
  on public.daily_tips (user_id, tip_date desc);
 
-- RLS: users can only read their own tips
alter table public.daily_tips enable row level security;
 
create policy "Users read own tips"
  on public.daily_tips for select
  using (auth.uid() = user_id);
 
-- Backend service role can write (your FastAPI uses service key)
create policy "Service role can upsert tips"
  on public.daily_tips for all
  using (true)
  with check (true);
 