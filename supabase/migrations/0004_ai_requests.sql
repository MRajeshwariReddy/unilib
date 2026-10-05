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

-- Atomic transaction-level advisory lock function to enforce max 2 concurrent requests
CREATE OR REPLACE FUNCTION public.enforce_ai_request_concurrency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    pending_count integer;
BEGIN
    -- Transaction-level advisory lock keyed on user_id hash to serialize inserts per user
    PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id::text));

    SELECT count(*) INTO pending_count
    FROM public.ai_requests
    WHERE user_id = NEW.user_id
      AND status = 'pending'
      AND created_at >= (now() - interval '2 minutes');

    IF pending_count >= 2 THEN
        RAISE EXCEPTION 'concurrency_limit_exceeded'
            USING HINT = 'Maximum 2 concurrent AI requests allowed per user.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_enforce_ai_request_concurrency ON public.ai_requests;
CREATE TRIGGER tr_enforce_ai_request_concurrency
    BEFORE INSERT ON public.ai_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_ai_request_concurrency();

-- SECURITY DEFINER function to securely finalize/update AI request results
-- Enforces:
-- 1. Caller must be authenticated (auth.uid() IS NOT NULL).
-- 2. Request id must belong to auth.uid().
-- 3. Request status must be 'pending'.
-- 4. Transition status must be 'answered', 'refused', or 'error'.
-- 5. Only result/audit fields are updated; immutable identity fields are untouched.
CREATE OR REPLACE FUNCTION public.finalize_ai_request(
    p_request_id uuid,
    p_status text,
    p_retrieval_mode text DEFAULT NULL,
    p_context_block_count integer DEFAULT NULL,
    p_refusal_reason text DEFAULT NULL,
    p_error_code text DEFAULT NULL,
    p_provider text DEFAULT NULL,
    p_model text DEFAULT NULL,
    p_input_tokens integer DEFAULT NULL,
    p_output_tokens integer DEFAULT NULL,
    p_latency_ms integer DEFAULT NULL,
    p_citations_returned integer DEFAULT NULL,
    p_segments_dropped integer DEFAULT NULL,
    p_response jsonb DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_current_status text;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'unauthenticated_ai_request_update';
    END IF;

    IF p_status NOT IN ('answered', 'refused', 'error') THEN
        RAISE EXCEPTION 'invalid_final_status';
    END IF;

    SELECT user_id, status INTO v_user_id, v_current_status
    FROM public.ai_requests
    WHERE id = p_request_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ai_request_not_found';
    END IF;

    IF v_user_id <> auth.uid() THEN
        RAISE EXCEPTION 'unauthorized_ai_request_update';
    END IF;

    IF v_current_status <> 'pending' THEN
        RAISE EXCEPTION 'ai_request_already_finalized';
    END IF;

    UPDATE public.ai_requests
    SET
        status = p_status,
        retrieval_mode = p_retrieval_mode,
        context_block_count = p_context_block_count,
        refusal_reason = p_refusal_reason,
        error_code = p_error_code,
        provider = p_provider,
        model = p_model,
        input_tokens = p_input_tokens,
        output_tokens = p_output_tokens,
        latency_ms = p_latency_ms,
        citations_returned = p_citations_returned,
        segments_dropped = p_segments_dropped,
        response = p_response
    WHERE id = p_request_id;

    RETURN true;
END;
$$;

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
END $$;

-- Drop any UPDATE policies on public.ai_requests
DROP POLICY IF EXISTS "Users can update own ai_requests results" ON public.ai_requests;

-- Revoke all UPDATE privileges on table public.ai_requests from anon and authenticated
REVOKE ALL ON public.ai_requests FROM anon, authenticated;
GRANT SELECT ON public.ai_requests TO authenticated;

-- Tightened column grants: INSERT only allows input fields; NO UPDATE GRANTS on table
GRANT INSERT (
    id,
    user_id,
    document_id,
    preset,
    question,
    focus_block_id,
    status
) ON public.ai_requests TO authenticated;

-- Grant EXECUTE on finalize_ai_request function to authenticated role
GRANT EXECUTE ON FUNCTION public.finalize_ai_request TO authenticated;
