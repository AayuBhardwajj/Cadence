-- 1. Create Profiles Table (Linked to Auth)
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade primary key,
  username text unique,
  full_name text,
  avatar_url text,
  email text,
  
  -- Signup Fields
  age text, 
  native_language text,
  primary_goal text,
  english_proficiency text, 
  region text,
  phone_number text,
  referral_code text,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Enable Security
alter table public.profiles enable row level security;

-- 3. Allow users to see and update their own profile
create policy "Public profiles are viewable by everyone." on profiles for select using ( true );
create policy "Users can insert their own profile." on profiles for insert with check ( auth.uid() = id );
create policy "Users can update own profile." on profiles for update using ( auth.uid() = id );

-- 4. Auto-Create Profile on Signup (Trigger)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, username)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'username'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Create Assessments Table
create table public.assessments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  -- AI Metrics
  overall_score integer,
  wpm integer,
  eye_contact_score integer,
  filler_word_count integer,
  feedback text, 
  transcription text,
  
  -- Metadata
  video_url text,
  created_at timestamptz default now()
);

-- 6. Enable Security for Assessments
alter table public.assessments enable row level security;
create policy "Users can view own assessments." on assessments for select using ( auth.uid() = user_id );
create policy "Users can insert own assessments." on assessments for insert with check ( auth.uid() = user_id );