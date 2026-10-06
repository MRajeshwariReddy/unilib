-- Migration: 0003_comments.sql
-- Description: Create comments table, composite FK, block_comment_counts view, RLS policies, and grants.

-- 1. Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  block_id uuid NOT NULL,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(trim(body)) >= 1 AND length(trim(body)) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comments_block_document_fkey FOREIGN KEY (block_id, document_id) REFERENCES public.blocks(id, document_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_block_created_at ON public.comments (block_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_document_id ON public.comments (document_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON public.comments (author_id);

-- 2. Create block_comment_counts view
CREATE OR REPLACE VIEW public.block_comment_counts WITH (security_invoker = true) AS
SELECT
  document_id,
  block_id,
  COUNT(*)::integer AS comment_count
FROM public.comments
GROUP BY document_id, block_id;

-- 3. Row Level Security
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments viewable if document is ready" ON public.comments;
CREATE POLICY "Comments viewable if document is ready"
  ON public.comments FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = comments.document_id
        AND d.status = 'ready'
    )
  );

DROP POLICY IF EXISTS "Authenticated users can post comments on ready documents" ON public.comments;
CREATE POLICY "Authenticated users can post comments on ready documents"
  ON public.comments FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = comments.document_id
        AND d.status = 'ready'
    )
  );

DROP POLICY IF EXISTS "Comment author or document owner can delete comments" ON public.comments;
CREATE POLICY "Comment author or document owner can delete comments"
  ON public.comments FOR DELETE TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = comments.document_id
        AND d.owner_id = auth.uid()
    )
  );

-- 4. Grants
REVOKE ALL ON public.comments FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.block_comment_counts FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.comments TO anon, authenticated;
GRANT INSERT, DELETE ON public.comments TO authenticated;

GRANT SELECT ON public.block_comment_counts TO anon, authenticated;
