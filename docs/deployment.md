# UniLib Production Deployment Guide

This guide details the steps required to deploy UniLib to **Vercel** and **Supabase**.

---

## 1. Supabase Database & Storage Setup

1. **Create a Supabase Project:**
   - Sign in to [Supabase](https://supabase.com) and create a new project in your preferred region.

2. **Execute Database Migrations in Order:**
   Paste and run the migration files located in `supabase/migrations/` in order using the Supabase SQL Editor:
   - `0001_profiles.sql`: Creates `public.profiles` table and `handle_new_user` auth trigger.
   - `0002_documents_blocks_storage.sql`: Creates `documents`, `blocks`, storage bucket `documents`, and FTS search function `search_blocks`.
   - `0003_comments.sql`: Creates `public.comments` table and `block_comment_counts` view.
   - `0004_ai_requests.sql`: Creates `public.ai_requests` table, atomic concurrency lock trigger `enforce_ai_request_concurrency`, and `finalize_ai_request` RPC.

3. **Verify Row Level Security (RLS):**
   Confirm RLS is enabled on all 5 tables (`profiles`, `documents`, `blocks`, `comments`, `ai_requests`) and private bucket `documents`.

4. **Auth Settings:**
   - In Supabase Auth Settings, keep Email provider enabled and **Email Confirmation OFF** for MVP testing.

---

## 2. Vercel Deployment Setup

1. **Import Repository to Vercel:**
   - Connect your GitHub repository to Vercel. Select Next.js framework preset.

2. **Configure Environment Variables:**
   Set the following environment variables in Vercel project settings:

   | Variable | Value / Description |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase Anon/Publishable Key |
   | `NEXT_PUBLIC_SITE_URL` | Production Origin (e.g. `https://unilib.vercel.app`) |
   | `NEXT_PUBLIC_COPYRIGHT_CONTACT_EMAIL` | Contact email for takedown requests |
   | `AI_ENABLED` | `"true"` |
   | `AI_PROVIDER` | `"anthropic"` |
   | `AI_MODEL` | `claude-3-5-haiku-20241022` |
   | `ANTHROPIC_API_KEY` | Your Anthropic API Secret Key (Server-only) |
   | `OPENALEX_API_KEY` | Your OpenAlex API Key (Server-only) |

3. **Deploy:**
   - Trigger a deployment from the `main` branch.

---

## 3. Post-Deployment Verification

After deployment completes:
1. Visit `https://your-domain.vercel.app/api/health` and verify status returns `"ok"`.
2. Test user signup/signin.
3. Test uploading a `.docx`, `.md`, and `.txt` file.
4. Verify paragraph discussion and AI Ask functionality.
