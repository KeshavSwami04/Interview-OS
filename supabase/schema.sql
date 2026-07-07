-- Create ENUM types for database states
CREATE TYPE interview_status AS ENUM ('active', 'completed');

-- 1. Create public.users table (extends auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    github_username TEXT,
    github_access_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to users"
    ON public.users FOR SELECT
    USING (true);

CREATE POLICY "Allow users to update their own record"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- Trigger to automatically mirror new auth.users signup to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
        new.raw_user_meta_data->>'avatar_url'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. Create public.user_profiles table
CREATE TABLE public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    resume_url TEXT,
    profile_summary JSONB DEFAULT '{}'::jsonb, -- Store parsed resume metrics
    github_summary JSONB DEFAULT '{}'::jsonb,  -- Store analyzed repo results
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = user_id);


-- 3. Create public.interviews table
CREATE TABLE public.interviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    role TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    type TEXT NOT NULL,
    status interview_status DEFAULT 'active' NOT NULL,
    agenda JSONB NOT NULL DEFAULT '[]'::jsonb, -- Stored list of structural milestones
    scorecard JSONB,      -- Overall, technical, communication scores
    roadmap JSONB,        -- AI-generated study timelines
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on interviews
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own interviews"
    ON public.interviews FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interviews"
    ON public.interviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interviews"
    ON public.interviews FOR UPDATE
    USING (auth.uid() = user_id);


-- 4. Create public.interview_messages table
CREATE TABLE public.interview_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE NOT NULL,
    sender TEXT NOT NULL CHECK (sender IN ('interviewer', 'candidate')),
    message_text TEXT NOT NULL,
    code_submission TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on messages
ALTER TABLE public.interview_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access messages for their own interviews"
    ON public.interview_messages FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE interviews.id = interview_messages.interview_id
            AND interviews.user_id = auth.uid()
        )
    );
