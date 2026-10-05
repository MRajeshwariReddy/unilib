# UniLib MVP Known Limitations

This document lists accepted architectural and product limitations for the UniLib MVP.

---

1. **Supported Formats:**
   - MVP supports `.docx`, `.md`, and `.txt` files only.
   - PDF files are **post-MVP** (upload form explicitly prompts users to convert PDFs to DOCX or Markdown).

2. **Summarize Preset Threshold:**
   - Document summarization is available for documents up to **100,000 characters** (~25,000 tokens).
   - For larger documents, summarization is disabled in the UI and returns `preset_unavailable` from the API. Users can ask specific targeted questions using FTS retrieval.

3. **Flat Paragraph Comments:**
   - Comments on paragraphs are flat lists (no nested replies or threading in MVP).

4. **Single-Turn AI Assistant:**
   - Ask UniLib AI operates on a single-turn request basis. There is no multi-turn chat history or conversation memory persisted across requests.

5. **Authentication:**
   - Email + Password authentication via Supabase Auth. Email confirmation is disabled by default for MVP demos to prevent email service rate limits.
