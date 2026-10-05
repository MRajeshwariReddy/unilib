import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { askInputSchema, executeAskPipeline } from "@/lib/ai/ask";
import { MockAIProvider } from "@/lib/ai/providers/mock";
import { ContextBlock } from "@/lib/ai/types";

export const maxDuration = 60;

function isOriginAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try {
      const siteOrigin = new URL(siteUrl).origin;
      if (origin === siteOrigin) return true;
    } catch {
      // ignore
    }
  }

  const host = request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") || "http";
    const expectedOrigin = `${proto}://${host}`;
    if (origin === expectedOrigin) return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  // 1. Origin Check (CSRF defense)
  if (!isOriginAllowed(request)) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Invalid request origin." } },
      { status: 403 }
    );
  }

  // 2. Content-Type Check
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      { error: { code: "unsupported_media_type", message: "Content-Type must be application/json." } },
      { status: 415 }
    );
  }

  // 3. Supabase Auth Verification
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component context
          }
        },
      },
    }
  );

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user) {
    return NextResponse.json(
      { error: { code: "unauthenticated", message: "Sign in to use UniLib AI." } },
      { status: 401 }
    );
  }

  const userId = authData.user.id;

  // 4. Input Validation
  let bodyJson: unknown;
  try {
    bodyJson = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Invalid JSON body." } },
      { status: 400 }
    );
  }

  const parseInput = askInputSchema.safeParse(bodyJson);
  if (!parseInput.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: parseInput.error.errors[0]?.message || "Invalid request payload." } },
      { status: 400 }
    );
  }

  const input = parseInput.data;

  // 5. Execute Pipeline with Real Supabase Client
  const pipelineResult = await executeAskPipeline({
    input,
    userId,
    deps: {
      provider: new MockAIProvider(),
      async fetchUserRequests({ userId: uid, since }) {
        const { data } = await supabase
          .from("ai_requests")
          .select("id, created_at, status")
          .eq("user_id", uid)
          .gte("created_at", since.toISOString());
        return data || [];
      },
      async createStartLog(params) {
        const { data, error } = await supabase
          .from("ai_requests")
          .insert({
            user_id: params.userId,
            document_id: params.documentId,
            question: params.question,
            preset: params.preset,
            focus_block_id: params.focusBlockId,
            status: "pending",
          })
          .select("id")
          .single();
        if (error || !data) throw new Error(error?.message || "Insert failed");
        return data.id;
      },
      async updateLogResult(params) {
        // Securely finalize request via RPC function (prevents direct client table updates)
        await supabase.rpc("finalize_ai_request", {
          p_request_id: params.requestId,
          p_status: params.status,
          p_retrieval_mode: params.retrievalMode,
          p_context_block_count: params.contextBlockCount,
          p_refusal_reason: params.refusalReason,
          p_error_code: params.errorCode,
          p_provider: params.provider,
          p_model: params.model,
          p_input_tokens: params.inputTokens,
          p_output_tokens: params.outputTokens,
          p_latency_ms: params.latencyMs,
          p_citations_returned: params.citationsReturned,
          p_segments_dropped: params.segmentsDropped,
          p_response: params.response,
        });
      },
      async getDocumentInfo(docId) {
        const { data } = await supabase
          .from("documents")
          .select("id, char_count, status, title")
          .eq("id", docId)
          .single();
        return data || null;
      },
      async fetchAllBlocks(docId) {
        const { data } = await supabase
          .from("blocks")
          .select("id, document_id, position, type, heading_level, text")
          .eq("document_id", docId)
          .order("position", { ascending: true });
        return (data as ContextBlock[]) || [];
      },
      async searchFtsBlocks(docId, query, topK) {
        const { data } = await supabase.rpc("search_blocks", {
          p_document_id: docId,
          p_query: query,
          p_limit: topK,
        });
        return data || [];
      },
    },
  });

  return NextResponse.json(pipelineResult.body, { status: pipelineResult.httpStatus });
}
