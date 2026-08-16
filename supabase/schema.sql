-- ==============================================================================
-- Chronicle Noir Glass Microblog - Complete Supabase Database Schema
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Profiles Table (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    banner_url TEXT,
    bio TEXT,
    website TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Posts Table
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Replies / Threaded Comments Table
CREATE TABLE IF NOT EXISTS public.replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_reply_id UUID REFERENCES public.replies(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Likes Table
CREATE TABLE IF NOT EXISTS public.likes (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, post_id)
);

-- 6. Reposts Table
CREATE TABLE IF NOT EXISTS public.reposts (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, post_id)
);

-- 7. Bookmarks Table
CREATE TABLE IF NOT EXISTS public.bookmarks (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, post_id)
);

-- 8. Follows Table
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (follower_id, following_id)
);

-- 9. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('like', 'repost', 'reply', 'mention', 'follow')),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Conversations & Direct Messages
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_one UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    participant_two UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_conversation UNIQUE(participant_one, participant_two)
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_replies_post_id ON public.replies(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS idx_reposts_post_id ON public.reposts(post_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id, created_at ASC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles: Public read, User can update their own
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Posts: Public read, Authenticated users can insert, Users can delete/update their own
CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- Replies: Public read, Authenticated users can reply
CREATE POLICY "Replies are viewable by everyone" ON public.replies FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create replies" ON public.replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own replies" ON public.replies FOR DELETE USING (auth.uid() = user_id);

-- Likes / Reposts / Bookmarks
CREATE POLICY "Likes are viewable by everyone" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can toggle likes" ON public.likes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Reposts are viewable by everyone" ON public.reposts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can toggle reposts" ON public.reposts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own bookmarks" ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can manage bookmarks" ON public.bookmarks FOR ALL USING (auth.uid() = user_id);

-- Follows
CREATE POLICY "Follows are viewable by everyone" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage follows" ON public.follows FOR ALL USING (auth.uid() = follower_id);

-- Notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can create notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Messages & Conversations
CREATE POLICY "Users can view their conversations" ON public.conversations FOR SELECT 
USING (auth.uid() = participant_one OR auth.uid() = participant_two);
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT 
WITH CHECK (auth.uid() = participant_one OR auth.uid() = participant_two);

CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE conversations.id = messages.conversation_id 
    AND (conversations.participant_one = auth.uid() OR conversations.participant_two = auth.uid())
));
CREATE POLICY "Users can send messages to their conversations" ON public.messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update messages in their conversations" ON public.messages FOR UPDATE 
USING (EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE conversations.id = messages.conversation_id 
    AND (conversations.participant_one = auth.uid() OR conversations.participant_two = auth.uid())
));

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP / GOOGLE OAUTH
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    clean_username TEXT;
    base_username TEXT;
    avatar TEXT;
    fname TEXT;
BEGIN
    -- Extract full name from Google metadata or raw user metadata
    fname := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1),
        'Chronicle User'
    );

    -- Extract avatar url from Google metadata (picture / avatar_url)
    avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        '/default-avatar.jpg'
    );

    -- Generate a clean unique username
    base_username := COALESCE(
        NEW.raw_user_meta_data->>'username',
        lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g')),
        'user'
    );
    
    clean_username := base_username;

    -- Ensure uniqueness in profiles
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = clean_username AND id != NEW.id) THEN
        clean_username := base_username || '_' || substr(NEW.id::text, 1, 4);
    END IF;

    INSERT INTO public.profiles (id, username, full_name, avatar_url, bio)
    VALUES (
        NEW.id,
        clean_username,
        fname,
        avatar,
        COALESCE(NEW.raw_user_meta_data->>'bio', 'Exploring the digital noir.')
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        avatar_url = CASE 
            WHEN public.profiles.avatar_url = '/default-avatar.jpg' OR public.profiles.avatar_url IS NULL 
            THEN EXCLUDED.avatar_url 
            ELSE public.profiles.avatar_url 
        END;
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- REALTIME ENABLEMENT (OPTIONAL)
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
