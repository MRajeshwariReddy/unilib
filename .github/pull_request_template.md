## Task Summary
- **Task ID:** T00
- **Description:** Scaffold & CI setup

## Changes Included
- [x] Initialized Next.js/React/TypeScript/Tailwind scaffold
- [x] Set up ESLint, Vitest, and TypeScript checks
- [x] Added `/api/health` route
- [x] Added environment loaders (`src/lib/env.ts` and `src/lib/env.client.ts`)
- [x] Created CI workflow `.github/workflows/ci.yml`
- [x] Created secret leak scan script `scripts/check-secret-leak.sh`

## Verification Checklist
- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] `npm run test` passes
- [x] `npm run build` passes
- [x] `npm run secret-scan` passes
- [x] `/api/health` verified
- [x] No secrets committed
- [x] No out-of-scope/future task code included
