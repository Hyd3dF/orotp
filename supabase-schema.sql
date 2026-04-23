-- ============================================
-- SOHBETAPP - COMPLETE DATABASE SCHEMA
-- Telegram + Twitter Social Chat Platform
-- ============================================

-- Clean up existing objects (safe to run multiple times)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.ensure_current_profile_exists(BOOLEAN);
DROP FUNCTION IF EXISTS public.is_room_participant(UUID);
DROP FUNCTION IF EXISTS public.create_room_with_owner_membership(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.join_room_by_invite_code(TEXT);
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.likes CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.room_members CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================
-- 1. PROFILES TABLE
-- Stores public user profile data plus app-managed password metadata.
-- ============================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT DEFAULT NULL,
  avatar_path TEXT DEFAULT NULL,
  avatar_bucket TEXT DEFAULT 'avatars',
  avatar_mime_type TEXT DEFAULT NULL,
  avatar_size_bytes BIGINT DEFAULT NULL,
  avatar_original_name TEXT DEFAULT NULL,
  bio TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  password_hash TEXT DEFAULT NULL,
  password_salt TEXT DEFAULT NULL,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE public.profiles IS 'User profile information linked to auth.users';

-- Create index for faster lookups
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_is_online ON public.profiles(is_online);

-- ============================================
-- 2. ROOMS TABLE
-- Chat rooms created by users
-- ============================================
CREATE TABLE public.rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
  description TEXT DEFAULT '',
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  room_type TEXT DEFAULT 'public' CHECK (room_type IN ('public', 'private')),
  max_members INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.rooms IS 'Chat rooms created by users';

CREATE INDEX idx_rooms_owner ON public.rooms(owner_id);
CREATE INDEX idx_rooms_invite_code ON public.rooms(invite_code);
CREATE INDEX idx_rooms_is_active ON public.rooms(is_active);

-- ============================================
-- 3. ROOM MEMBERS TABLE
-- Tracks which users are in which rooms
-- ============================================
CREATE TABLE public.room_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ DEFAULT NULL,
  UNIQUE(room_id, user_id)
);

COMMENT ON TABLE public.room_members IS 'Tracks room membership and active status';

CREATE INDEX idx_room_members_room ON public.room_members(room_id);
CREATE INDEX idx_room_members_user ON public.room_members(user_id);
CREATE INDEX idx_room_members_active ON public.room_members(room_id, is_active);

-- ============================================
-- 4. MESSAGES TABLE
-- All chat messages within rooms
-- ============================================
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT DEFAULT '',
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
  image_url TEXT DEFAULT NULL,
  image_path TEXT DEFAULT NULL,
  image_bucket TEXT DEFAULT 'chat-images',
  image_mime_type TEXT DEFAULT NULL,
  image_size_bytes BIGINT DEFAULT NULL,
  image_original_name TEXT DEFAULT NULL,
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.messages IS 'Chat messages within rooms';

CREATE INDEX idx_messages_room ON public.messages(room_id);
CREATE INDEX idx_messages_user ON public.messages(user_id);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);

-- ============================================
-- 5. POSTS TABLE
-- Social feed posts (Twitter-like)
-- ============================================
CREATE TABLE public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT DEFAULT '',
  image_url TEXT DEFAULT NULL,
  image_path TEXT DEFAULT NULL,
  image_bucket TEXT DEFAULT 'post-images',
  image_mime_type TEXT DEFAULT NULL,
  image_size_bytes BIGINT DEFAULT NULL,
  image_original_name TEXT DEFAULT NULL,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.posts IS 'Social feed posts';

CREATE INDEX idx_posts_user ON public.posts(user_id);
CREATE INDEX idx_posts_created ON public.posts(created_at DESC);

-- ============================================
-- 6. LIKES TABLE
-- Post likes tracking
-- ============================================
CREATE TABLE public.likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

COMMENT ON TABLE public.likes IS 'Post likes - one like per user per post';

CREATE INDEX idx_likes_post ON public.likes(post_id);
CREATE INDEX idx_likes_user ON public.likes(user_id);

-- ============================================
-- 7. COMMENTS TABLE
-- Post comments
-- ============================================
CREATE TABLE public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) >= 1),
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.comments IS 'Comments on social posts';

CREATE INDEX idx_comments_post ON public.comments(post_id);
CREATE INDEX idx_comments_user ON public.comments(user_id);

-- ============================================
-- TRIGGER: Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    username,
    full_name,
    avatar_url,
    password_hash,
    password_salt
  )
  VALUES (
    NEW.id,
    NEW.email,
    lower(COALESCE(NULLIF(NEW.raw_user_meta_data->>'username', ''), split_part(NEW.email, '@', 1))),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'username', ''), split_part(NEW.email, '@', 1))
    ),
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
    NULLIF(NEW.raw_user_meta_data->>'password_hash', ''),
    NULLIF(NEW.raw_user_meta_data->>'password_salt', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================
-- FUNCTION: Ensure current authenticated user has a profile row
-- ============================================
CREATE OR REPLACE FUNCTION public.ensure_current_profile_exists(
  p_mark_online BOOLEAN DEFAULT false
)
RETURNS public.profiles AS $$
DECLARE
  auth_user auth.users%ROWTYPE;
  profile_row public.profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO auth_user
  FROM auth.users
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auth user not found';
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    username,
    full_name,
    avatar_url,
    password_hash,
    password_salt,
    is_online,
    last_seen
  )
  VALUES (
    auth_user.id,
    auth_user.email,
    lower(COALESCE(NULLIF(auth_user.raw_user_meta_data->>'username', ''), split_part(auth_user.email, '@', 1))),
    COALESCE(
      NULLIF(auth_user.raw_user_meta_data->>'full_name', ''),
      COALESCE(NULLIF(auth_user.raw_user_meta_data->>'username', ''), split_part(auth_user.email, '@', 1))
    ),
    NULLIF(auth_user.raw_user_meta_data->>'avatar_url', ''),
    NULLIF(auth_user.raw_user_meta_data->>'password_hash', ''),
    NULLIF(auth_user.raw_user_meta_data->>'password_salt', ''),
    COALESCE(p_mark_online, false),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    password_hash = COALESCE(EXCLUDED.password_hash, public.profiles.password_hash),
    password_salt = COALESCE(EXCLUDED.password_salt, public.profiles.password_salt),
    is_online = CASE
      WHEN p_mark_online THEN true
      ELSE public.profiles.is_online
    END,
    last_seen = CASE
      WHEN p_mark_online THEN NOW()
      ELSE public.profiles.last_seen
    END
  RETURNING * INTO profile_row;

  RETURN profile_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- ============================================
-- FUNCTION: Check whether the current user belongs to a room
-- ============================================
CREATE OR REPLACE FUNCTION public.is_room_participant(p_room_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.rooms r
    WHERE r.id = p_room_id
      AND (
        r.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.room_members rm
          WHERE rm.room_id = p_room_id
            AND rm.user_id = auth.uid()
            AND rm.is_active = true
        )
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- ============================================
-- FUNCTION: Create room and owner membership atomically
-- ============================================
CREATE OR REPLACE FUNCTION public.create_room_with_owner_membership(
  p_name TEXT,
  p_invite_code TEXT,
  p_description TEXT DEFAULT ''
)
RETURNS public.rooms AS $$
DECLARE
  new_room public.rooms%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM public.ensure_current_profile_exists();

  INSERT INTO public.rooms (
    name,
    description,
    owner_id,
    invite_code
  )
  VALUES (
    trim(p_name),
    COALESCE(p_description, ''),
    auth.uid(),
    trim(p_invite_code)
  )
  RETURNING * INTO new_room;

  INSERT INTO public.room_members (
    room_id,
    user_id,
    role,
    is_active,
    left_at
  )
  VALUES (
    new_room.id,
    auth.uid(),
    'owner',
    true,
    NULL
  )
  ON CONFLICT (room_id, user_id) DO UPDATE SET
    role = 'owner',
    is_active = true,
    left_at = NULL;

  RETURN new_room;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- ============================================
-- FUNCTION: Join a room by invite code atomically
-- ============================================
CREATE OR REPLACE FUNCTION public.join_room_by_invite_code(
  p_invite_code TEXT
)
RETURNS public.rooms AS $$
DECLARE
  target_room public.rooms%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM public.ensure_current_profile_exists();

  SELECT *
  INTO target_room
  FROM public.rooms
  WHERE invite_code = trim(p_invite_code)
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.room_members (
    room_id,
    user_id,
    role,
    is_active,
    left_at
  )
  VALUES (
    target_room.id,
    auth.uid(),
    'member',
    true,
    NULL
  )
  ON CONFLICT (room_id, user_id) DO UPDATE SET
    is_active = true,
    left_at = NULL;

  RETURN target_room;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- ============================================
-- TRIGGER: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

-- ============================================
-- TRIGGER: Auto-update likes_count on posts
-- ============================================
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE PROCEDURE public.update_post_likes_count();

-- ============================================
-- TRIGGER: Auto-update comments_count on posts
-- ============================================
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE PROCEDURE public.update_post_comments_count();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- ---- PROFILES Policies ----
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ---- ROOMS Policies ----
CREATE POLICY "rooms_select" ON public.rooms
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (
      room_type = 'public'
      OR owner_id = auth.uid()
      OR public.is_room_participant(id)
    )
  );

CREATE POLICY "rooms_insert" ON public.rooms
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "rooms_update" ON public.rooms
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "rooms_delete" ON public.rooms
  FOR DELETE USING (auth.uid() = owner_id);

-- ---- ROOM MEMBERS Policies ----
CREATE POLICY "room_members_select" ON public.room_members
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND public.is_room_participant(room_id)
  );

CREATE POLICY "room_members_insert" ON public.room_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "room_members_delete" ON public.room_members
  FOR DELETE USING (auth.uid() = user_id);

-- ---- MESSAGES Policies ----
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND public.is_room_participant(room_id)
  );

CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND public.is_room_participant(room_id)
  );

-- ---- POSTS Policies ----
CREATE POLICY "posts_select" ON public.posts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "posts_insert" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_update" ON public.posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "posts_delete" ON public.posts
  FOR DELETE USING (auth.uid() = user_id);

-- ---- LIKES Policies ----
CREATE POLICY "likes_select" ON public.likes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "likes_insert" ON public.likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "likes_delete" ON public.likes
  FOR DELETE USING (auth.uid() = user_id);

-- ---- COMMENTS Policies ----
CREATE POLICY "comments_select" ON public.comments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "comments_insert" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_delete" ON public.comments
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- ============================================
-- STORAGE BUCKETS
-- These buckets are created here so self-hosted environments stay in sync.
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('chat-images', 'chat-images', true),
  ('post-images', 'post-images', true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public;

DROP POLICY IF EXISTS "avatars_select_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "chat_images_select_own" ON storage.objects;
DROP POLICY IF EXISTS "chat_images_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "chat_images_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "post_images_select_own" ON storage.objects;
DROP POLICY IF EXISTS "post_images_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "post_images_delete_own" ON storage.objects;

CREATE POLICY "avatars_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 2) = auth.uid()::text
  );

CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 2) = auth.uid()::text
  );

CREATE POLICY "chat_images_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'chat-images');

CREATE POLICY "chat_images_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-images'
    AND split_part(name, '/', 2) = auth.uid()::text
  );

CREATE POLICY "chat_images_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND split_part(name, '/', 2) = auth.uid()::text
  );

CREATE POLICY "post_images_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'post-images');

CREATE POLICY "post_images_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'post-images'
    AND split_part(name, '/', 2) = auth.uid()::text
  );

CREATE POLICY "post_images_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'post-images'
    AND split_part(name, '/', 2) = auth.uid()::text
  );

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;

GRANT SELECT, INSERT, DELETE ON public.room_members TO authenticated;

GRANT SELECT, INSERT ON public.messages TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;

GRANT SELECT, INSERT, DELETE ON public.likes TO authenticated;

GRANT SELECT, INSERT, DELETE ON public.comments TO authenticated;

GRANT EXECUTE ON FUNCTION public.ensure_current_profile_exists(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_participant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_room_with_owner_membership(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_room_by_invite_code(TEXT) TO authenticated;
