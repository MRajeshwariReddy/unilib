# UniLib Post-Deployment Manual Verification & Smoke Test Checklist

Use this checklist to manually verify post-deployment releases.

---

## Smoke Test Results Checklist

1. `/api/health` returns status `"ok"` and configuration booleans: `PASS`
2. User sign up with display name and user type: `MANUAL REQUIRED`
3. User sign in and session persistence: `MANUAL REQUIRED`
4. Upload `.docx` document: `MANUAL REQUIRED`
5. Upload `.md` document: `MANUAL REQUIRED`
6. Upload `.txt` document: `MANUAL REQUIRED`
7. Document processing reaches `ready` state: `MANUAL REQUIRED`
8. Reader displays canonical paragraph blocks with gutter numbers: `PASS`
9. Post a paragraph comment: `MANUAL REQUIRED`
10. Delete own comment: `MANUAL REQUIRED`
11. Summarize document preset: `PASS`
12. Explain paragraph button: `PASS`
13. Supported document-grounded question: `PASS`
14. AI citation chip scrolls to and highlights corresponding paragraph: `PASS`
15. Unsupported/off-topic question returns refusal: `PASS`
16. Related readings panel displays OpenAlex results: `PASS`
17. Related readings graceful fallback on error/timeout: `PASS`
18. PDF upload attempt displays unsupported format error: `PASS`
19. User sign out: `MANUAL REQUIRED`
20. Anonymous user public library browse and reader: `MANUAL REQUIRED`
21. Anonymous users blocked from AI and commenting: `PASS`

---

## Production Deployment Status

`Production deployment: MANUAL REQUIRED`

### Manual Deployment Steps:
1. Link your GitHub repository to Vercel.
2. Apply migrations `0001` through `0004` to your Supabase project SQL Editor.
3. Configure Vercel environment variables as listed in `docs/deployment.md`.
4. Deploy to Vercel and verify `/api/health`.
