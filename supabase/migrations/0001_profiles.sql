-- Migration: 0001_profiles.sql
-- Description: Create profiles table, trigger on auth.users insert, RLS policies, and grants.

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (length(trim(display_name)) >= 2 AND length(trim(display_name)) <= 50),
  user_type text NOT NULL DEFAULT 'student' CHECK (user_type IN ('student', 'professor', 'author', 'publisher')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Trigger function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name text;
  v_user_type text;
  v_email_local text;
BEGIN
  -- Extract display_name metadata or derive from email
  v_display_name := trim(coalesce(new.raw_user_meta_data->>'display_name', ''));
  IF length(v_display_name) < 2 OR length(v_display_name) > 50 THEN
    v_email_local := split_part(new.email, '@', 1);
    IF length(v_email_local) >= 2 AND length(v_email_local) <= 50 THEN
      v_display_name := v_email_local;
    ELSE
      v_display_name := 'User_' || substr(new.id::text, 1, 8);
    END IF;
  END IF;

  -- Extract user_type metadata or default to student
  v_user_type := coalesce(new.raw_user_meta_data->>'user_type', 'student');
  IF v_user_type NOT IN ('student', 'professor', 'author', 'publisher') THEN
    v_user_type := 'student';
  END IF;

  INSERT INTO public.profiles (id, display_name, user_type)
  VALUES (new.id, v_display_name, v_user_type)
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: anyone (anon, authenticated) can read profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- UPDATE: authenticated users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 4. Revoke default privileges and grant required ones
REVOKE ALL ON public.profiles FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT UPDATE (display_name, user_type) ON public.profiles TO authenticated;
