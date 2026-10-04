# Deployment Guide

## Overview
UniLib is designed to be deployed on **Vercel** with **Supabase** providing PostgreSQL, Auth, and Storage.

## Environment Variables
Set the following environment variables in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_COPYRIGHT_CONTACT_EMAIL`
- `AI_ENABLED` (`true` or `false`)
- `AI_PROVIDER` (`anthropic` or `mock`)
- `AI_MODEL` (e.g., `claude-3-5-sonnet-20241022`)
- `ANTHROPIC_API_KEY` (Sensitive)
- `OPENALEX_API_KEY` (Sensitive)

## Supabase Setup
1. Apply migrations in `supabase/migrations/` in sequential order.
2. Ensure the `documents` storage bucket is set to **private** with 10MB limit.
3. Verify Row Level Security (RLS) is enabled on all tables.
