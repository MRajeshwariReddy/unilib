# UniLib — AI-Powered Academic Reading & Collaboration Platform

**UniLib** is an open educational platform designed to make academic reading collaborative, accessible, and grounded. Educational documents are parsed into **permanent paragraph blocks**, enabling **paragraph-level discussions** and a **document-grounded AI assistant** that answers questions with clickable paragraph citations while refusing off-topic or unsupported claims.

---

## 🌟 Key MVP Features

1. **Structured Document Reading:**
   - Supports Markdown (`.md`), Word (`.docx`), and Plain Text (`.txt`).
   - Normalizes text into immutable, UUID-identified paragraph blocks.
2. **Paragraph-Level Discussion:**
   - Readers can comment directly on specific paragraphs.
   - Author badges distinguish the original uploader on their own documents.
3. **Grounded AI Assistant ("Ask UniLib AI"):**
   - **Ask a question:** Typed questions answered exclusively from document content.
   - **Explain this paragraph:** Simple explanations for selected paragraphs.
   - **Summarize document:** Available for documents under 100,000 characters.
   - **Citation Grounding:** Every statement contains clickable citation chips `[n]` that scroll to and highlight the corresponding paragraph.
4. **Scholarly Discovery (OpenAlex):**
   - Displays up to 5 open-access related scholarly works retrieved server-side from OpenAlex with a 24-hour cache.
5. **Copyright & Rights Attestation:**
   - Explicit rights attestation and license selection (`CC-BY`, `Public Domain`, `All Rights Reserved`, etc.) displayed on all documents.

---

## 🛠️ Technology Stack

- **Framework:** Next.js 15 (App Router, Server Components, Route Handlers)
- **Frontend:** React 19, Tailwind CSS, TypeScript (`strict: true`)
- **Backend & Database:** Supabase (PostgreSQL, Supabase Auth, Storage)
- **AI Integration:** Server-side AI abstraction (`AIProvider`) supporting Anthropic Claude API (`claude-3-5-haiku`) and Mock provider for offline testing.
- **External Scholarly API:** OpenAlex REST API with server-side 24-hour caching.
- **Testing & Quality:** Vitest, ESLint, TypeScript `tsc --noEmit`, custom secret-leak scanner script.

---

## 📐 Application Architecture

```
Browser (React Client Components)
   │  Supabase Client (Anon Key + Session Cookie) ── Reads under RLS, comments, profiles
   │  Fetch API ──────────────────────────────── text route handlers (/api/*)
   ▼
Next.js on Vercel
   ├─ Server Components (SSR of Library & Reader pages)
   ├─ Route Handlers (/api/ai/ask, /api/documents/[id]/related, /api/health)
   ▼
Supabase Postgres (Row Level Security enabled on all tables)
   ▼ (Server-side only)
AI Provider API (Anthropic)    OpenAlex API
```

### Security Highlights
- **No Service Role Key:** All server operations run under the user's session context with strict RLS enforcement.
- **Atomic Concurrency Control:** PostgreSQL advisory-lock trigger `enforce_ai_request_concurrency` enforces a maximum of 2 concurrent AI requests per user atomically.
- **Server-Controlled AI Auditing:** Result and audit fields on `public.ai_requests` cannot be updated directly by clients; updates occur strictly via the `SECURITY DEFINER` function `finalize_ai_request`.
- **Open Redirect Protection:** All `next` query parameters are validated with `getSafeNextPath` to enforce relative internal paths.
- **Server Secret Isolation:** `ANTHROPIC_API_KEY` and `OPENALEX_API_KEY` are imported with `"server-only"` and never exposed to browser bundles.

---

## 🔐 Environment Variables

| Variable | Scope | Required | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Client | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public / Client | Yes | Supabase anonymous key |
| `NEXT_PUBLIC_SITE_URL` | Public / Client | Yes | Site origin for CSRF checks and redirects |
| `NEXT_PUBLIC_COPYRIGHT_CONTACT_EMAIL` | Public / Client | Yes | Target email for "Report this resource" |
| `AI_ENABLED` | Server-only | Yes | `"true"` or `"false"` kill switch |
| `AI_PROVIDER` | Server-only | Yes | `"anthropic"` or `"mock"` |
| `AI_MODEL` | Server-only | Optional | AI model name (default: `claude-3-5-haiku-20241022`) |
| `ANTHROPIC_API_KEY` | Server-only Secret | Optional | Required if `AI_PROVIDER=anthropic` |
| `OPENALEX_API_KEY` | Server-only Secret | Optional | Optional API key for OpenAlex higher rate limits |

---

## 🚀 Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/unilib/unilib.git
   cd unilib
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env.local` and set your credentials:
   ```bash
   cp .env.example .env.local
   ```

4. **Run Development Server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

5. **Run Verification Suite:**
   ```bash
   npm run test          # Run Vitest unit test suite (68 tests)
   npm run eval:ai       # Run AI grounding evaluation
   npm run lint          # Run ESLint
   npm run typecheck     # Run TypeScript checking
   npm run secret-scan   # Run build secret leak scan
   npm run build         # Next.js production build
   ```

---

## 🌐 Deployment Instructions

Refer to [`docs/deployment.md`](docs/deployment.md) for step-by-step instructions on setting up Supabase database migrations (`0001` through `0004`) and deploying the application to Vercel.

---

## 📋 Current MVP Status vs. Post-MVP Scope

### Implemented in MVP:
- Markdown, DOCX, and TXT upload and block parsing
- Reading interface with paragraph anchors and deep links
- Paragraph comments and author badges
- Grounded AI assistant with citation validation and refusal copy
- OpenAlex related readings with 24-hour caching
- RLS policies on all 5 tables (`profiles`, `documents`, `blocks`, `comments`, `ai_requests`)
- Atomic advisory lock concurrency limits and rate limiting

### Explicitly Out of Scope / Post-MVP:
- PDF upload and OCR processing
- Comment replies and threading
- Vector stores, embeddings, and semantic search
- Multi-turn AI chat history
- Study groups, bookmarking, and ratings
