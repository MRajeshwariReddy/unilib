-- Migration 0004_ai_requests.sql

CREATE TABLE IF NOT EXISTS public.ai_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    preset text CHECK (preset IN ('summarize')),
    question text CHECK (char_length(question) <= 500),
    focus_block_id uuid,
    retrieval_mode text CHECK (retrieval_mode IN ('full', 'fts')),
    context_block_count integer,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'refused', 'error')),
    refusal_reason text CHECK (refusal_reason IN ('not_in_document', 'off_topic', 'no_context', 'unverifiable')),
    error_code text,
    provider text,
    model text,
    input_tokens integer,
    output_tokens integer,
    latency_ms integer,
    citations_returned integer,
    segments_dropped integer,
    response jsonb,
    CONSTRAINT ai_requests_preset_or_question_check CHECK (preset IS NOT NULL OR question IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS ai_requests_user_created_at_idx ON public.ai_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_requests_document_id_idx ON public.ai_requests (document_id);

ALTER TABLE public.ai_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'ai_requests' AND policyname = 'Users can read own ai_requests'
    ) THEN
        CREATE POLICY "Users can read own ai_requests" ON public.ai_requests
            FOR SELECT TO authenticated
            USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'ai_requests' AND policyname = 'Users can insert own pending ai_requests'
    ) THEN
        CREATE POLICY "Users can insert own pending ai_requests" ON public.ai_requests
            FOR INSERT TO authenticated
            WITH CHECK (user_id = auth.uid() AND status = 'pending');
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'ai_requests' AND policyname = 'Users can update own ai_requests results'
    ) THEN
        CREATE POLICY "Users can update own ai_requests results" ON public.ai_requests
            FOR UPDATE TO authenticated
            USING (user_id = auth.uid());
    END IF;
END $$;

REVOKE ALL ON public.ai_requests FROM anon, authenticated;
GRANT SELECT, INSERT ON public.ai_requests TO authenticated;
GRANT UPDATE (
    status,
    refusal_reason,
    error_code,
    retrieval_mode,
    context_block_count,
    provider,
    model,
    input_tokens,
    output_tokens,
    latency_ms,
    citations_returned,
    segments_dropped,
    response
) ON public.ai_requests TO authenticated;
