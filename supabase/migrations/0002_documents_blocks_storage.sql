-- Migration: 0002_documents_blocks_storage.sql
-- Description: Create documents and blocks tables, set_updated_at trigger, search_blocks function, storage bucket, RLS policies, and grants.

-- 1. Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(title) >= 1 AND length(title) <= 200),
  description text NULL CHECK (description IS NULL OR length(description) <= 1000),
  subject text NULL CHECK (subject IS NULL OR length(subject) <= 100),
  license text NOT NULL CHECK (license IN ('all_rights_reserved', 'public_domain', 'cc_by', 'cc_by_sa', 'cc_by_nc', 'cc_by_nd', 'cc_by_nc_sa', 'cc_by_nc_nd')),
  rights_attested boolean NOT NULL CHECK (rights_attested = true),
  source_format text NOT NULL CHECK (source_format IN ('docx', 'md', 'txt')),
  original_filename text NOT NULL CHECK (length(original_filename) <= 255),
  file_size_bytes integer NOT NULL CHECK (file_size_bytes >= 1 AND file_size_bytes <= 10485760),
  storage_path text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'ready', 'failed')),
  error_code text NULL,
  error_message text NULL,
  block_count integer NOT NULL DEFAULT 0 CHECK (block_count >= 0),
  char_count integer NOT NULL DEFAULT 0 CHECK (char_count >= 0),
  parser_version text NULL,
  processed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_created_at_ready ON public.documents (created_at DESC) WHERE status = 'ready';
CREATE INDEX IF NOT EXISTS idx_documents_owner_created_at ON public.documents (owner_id, created_at DESC);

-- Trigger for set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at := now();
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS set_documents_updated_at ON public.documents;
CREATE TRIGGER set_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 2. Create blocks table
CREATE TABLE IF NOT EXISTS public.blocks (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 1),
  type text NOT NULL DEFAULT 'paragraph' CHECK (type IN ('heading', 'paragraph', 'list_item', 'quote', 'code', 'table_row')),
  heading_level smallint NULL CHECK (heading_level IS NULL OR (heading_level >= 1 AND heading_level <= 6)),
  text text NOT NULL CHECK (length(text) >= 1 AND length(text) <= 8000),
  text_search tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blocks_document_id_position_key UNIQUE (document_id, position),
  CONSTRAINT blocks_id_document_id_key UNIQUE (id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_text_search ON public.blocks USING GIN (text_search);

-- 3. Create search_blocks function
CREATE OR REPLACE FUNCTION public.search_blocks(
  p_document_id uuid,
  p_query text,
  p_limit int DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  "position" int,
  rank real
)
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT
    b.id,
    b.position,
    ts_rank_cd(b.text_search, websearch_to_tsquery('english', p_query)) AS rank
  FROM public.blocks b
  WHERE b.document_id = p_document_id
    AND b.text_search @@ websearch_to_tsquery('english', p_query)
  ORDER BY rank DESC
  LIMIT p_limit;
$$;

-- 4. Storage configuration (documents bucket)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760,
  ARRAY[
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/markdown',
    'text/plain',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/markdown',
    'text/plain',
    'application/octet-stream'
  ];

-- Storage RLS policies
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
CREATE POLICY "Users can upload to their own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can read objects in their own folder" ON storage.objects;
CREATE POLICY "Users can read objects in their own folder"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete objects in their own folder" ON storage.objects;
CREATE POLICY "Users can delete objects in their own folder"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5. Row Level Security: documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Documents viewable if ready or owned" ON public.documents;
CREATE POLICY "Documents viewable if ready or owned"
  ON public.documents FOR SELECT TO anon, authenticated
  USING (status = 'ready' OR owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
CREATE POLICY "Users can insert own documents"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND status = 'uploaded' AND rights_attested = true);

DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
CREATE POLICY "Users can update own documents"
  ON public.documents FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
CREATE POLICY "Users can delete own documents"
  ON public.documents FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- 6. Row Level Security: blocks
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Blocks viewable if document is viewable" ON public.blocks;
CREATE POLICY "Blocks viewable if document is viewable"
  ON public.blocks FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = blocks.document_id
        AND (d.status = 'ready' OR d.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owner can insert blocks during processing" ON public.blocks;
CREATE POLICY "Owner can insert blocks during processing"
  ON public.blocks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = blocks.document_id
        AND d.owner_id = auth.uid()
        AND d.status = 'processing'
    )
  );

DROP POLICY IF EXISTS "Owner can delete blocks during processing or failed" ON public.blocks;
CREATE POLICY "Owner can delete blocks during processing or failed"
  ON public.blocks FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = blocks.document_id
        AND d.owner_id = auth.uid()
        AND d.status IN ('processing', 'failed')
    )
  );

-- 7. Grants
REVOKE ALL ON public.documents FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.blocks FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.documents TO anon, authenticated;
GRANT INSERT, DELETE ON public.documents TO authenticated;
GRANT UPDATE (status, error_code, error_message, block_count, char_count, parser_version, processed_at) ON public.documents TO authenticated;

GRANT SELECT ON public.blocks TO anon, authenticated;
GRANT INSERT, DELETE ON public.blocks TO authenticated;
