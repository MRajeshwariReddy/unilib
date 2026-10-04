# UniLib

UniLib is an AI-powered academic reading and collaboration platform designed for students, researchers, and educators.

## Features (MVP Scope)
- **Document Reading:** Clean browser reader for Markdown, DOCX, and TXT documents with permanent paragraph IDs.
- **Paragraph Discussion:** Granular inline comments on individual document paragraphs.
- **Grounded AI Assistant:** Grounded document assistance (Ask questions, Explain paragraphs, Summarize documents) with clickable citation chips verified against document content.
- **Related Readings:** External scholarly reading suggestions from OpenAlex.

## Tech Stack
- **Framework:** Next.js (App Router), React, TypeScript, Tailwind CSS
- **Backend & Database:** Supabase (PostgreSQL, Supabase Auth, Supabase Storage)
- **Testing:** Vitest, ESLint, TypeScript (`tsc`)

## Getting Started Locally

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Quality & Checks
- **Lint:** `npm run lint`
- **Typecheck:** `npm run typecheck`
- **Unit Tests:** `npm run test`
- **Production Build:** `npm run build`
- **Secret Scan:** `npm run secret-scan`

## Known Limitations
See [docs/known-limitations.md](docs/known-limitations.md) for current scope boundaries and design decisions.
