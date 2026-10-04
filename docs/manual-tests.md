# Manual Testing Procedures

## Smoke Test Checklist

1. `/api/health` returns HTTP 200 with `{ "status": "ok", ... }`.
2. Sign up / Sign in flow.
3. Upload DOCX, MD, and TXT files.
4. Verify document status transitions to `ready`.
5. Open document in reader; verify paragraph numbers and anchors work.
6. Post a comment on a paragraph; verify author badge and delete functionality.
7. Ask UniLib AI a question; verify citations and click-to-scroll highlight.
8. View Related Readings tab; verify OpenAlex results load gracefully.
