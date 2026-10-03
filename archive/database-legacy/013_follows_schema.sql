-- 1. Create the follows table
CREATE TABLE public.follows (
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'accepted')) DEFAULT 'accepted',
    PRIMARY KEY (follower_id, following_id)
);

-- 2. Enable RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- 3. SELECT policy — everyone can view follows
CREATE POLICY "Follows are viewable by everyone"
ON public.follows FOR SELECT
USING (true);

-- 4. INSERT policy — users can only insert their own follow
CREATE POLICY "Users can follow others"
ON public.follows FOR INSERT
WITH CHECK (auth.uid() = follower_id);

-- 5. UPDATE policy — users can only update their own follow row (MISSING in audit)
CREATE POLICY "Users can update follow status"
ON public.follows FOR UPDATE
USING (auth.uid() = follower_id OR auth.uid() = following_id)
WITH CHECK (auth.uid() = follower_id OR auth.uid() = following_id);

-- 6. DELETE policy — users can only unfollow themselves
CREATE POLICY "Users can unfollow"
ON public.follows FOR DELETE
USING (auth.uid() = follower_id);

-- 7. BEFORE INSERT trigger — enforce pending for private accounts
-- Uses profiles.visibility column (confirmed in your schema)
CREATE OR REPLACE FUNCTION public.enforce_follow_status()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = NEW.following_id
        AND visibility = 'private'
    ) THEN
        NEW.status := 'pending';
    ELSE
        NEW.status := 'accepted';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_follow_status_trigger
BEFORE INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.enforce_follow_status();