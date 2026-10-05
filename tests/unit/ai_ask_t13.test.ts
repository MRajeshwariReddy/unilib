import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { askInputSchema, executeAskPipeline } from "@/lib/ai/ask";
import { checkAIRateLimit } from "@/lib/ai/rateLimit";
import { MockAIProvider } from "@/lib/ai/providers/mock";
import { ContextBlock } from "@/lib/ai/types";

interface PipelineResponseBody {
  status?: string;
  segments?: Array<{ text: string; citations: unknown[] }>;
  refusal?: { reason: string; message: string };
  error?: { code: string; message: string };
}

describe("T13: Ask Input Zod Schema", () => {
  const validUuid = "11111111-1111-1111-1111-111111111111";

  it("validates valid question request", () => {
    const res = askInputSchema.safeParse({
      documentId: validUuid,
      question: "What is UniLib?",
    });
    expect(res.success).toBe(true);
  });

  it("validates valid explain paragraph request with focusBlockId", () => {
    const res = askInputSchema.safeParse({
      documentId: validUuid,
      question: "Explain this paragraph.",
      focusBlockId: validUuid,
    });
    expect(res.success).toBe(true);
  });

  it("validates valid summarize preset request", () => {
    const res = askInputSchema.safeParse({
      documentId: validUuid,
      preset: "summarize",
    });
    expect(res.success).toBe(true);
  });

  it("rejects request containing both question and preset", () => {
    const res = askInputSchema.safeParse({
      documentId: validUuid,
      question: "What is UniLib?",
      preset: "summarize",
    });
    expect(res.success).toBe(false);
  });

  it("rejects request containing neither question nor preset", () => {
    const res = askInputSchema.safeParse({
      documentId: validUuid,
    });
    expect(res.success).toBe(false);
  });

  it("rejects focusBlockId when paired with preset", () => {
    const res = askInputSchema.safeParse({
      documentId: validUuid,
      preset: "summarize",
      focusBlockId: validUuid,
    });
    expect(res.success).toBe(false);
  });
});

describe("T13: AI Rate Limiting", () => {
  const userId = "user-123";

  it("allows requests under the limits", async () => {
    const res = await checkAIRateLimit({
      userId,
      fetchUserRequests: async () => [],
    });
    expect(res.allowed).toBe(true);
  });

  it("blocks 16th request in rolling hour with 429 rate_limited", async () => {
    const now = new Date();
    const requests = Array.from({ length: 15 }, (_, i) => ({
      id: `req-${i}`,
      created_at: new Date(now.getTime() - i * 60 * 1000).toISOString(),
      status: "answered",
    }));

    const res = await checkAIRateLimit({
      userId,
      now,
      fetchUserRequests: async () => requests,
    });

    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("hourly_limit");
    expect(res.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("blocks concurrency limit if 2 requests are pending in last 2 minutes", async () => {
    const now = new Date();
    const requests = [
      { id: "p1", created_at: new Date(now.getTime() - 10 * 1000).toISOString(), status: "pending" },
      { id: "p2", created_at: new Date(now.getTime() - 30 * 1000).toISOString(), status: "pending" },
    ];

    const res = await checkAIRateLimit({
      userId,
      now,
      fetchUserRequests: async () => requests,
    });

    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("concurrency_limit");
    expect(res.retryAfterSeconds).toBe(30);
  });
});

describe("T13: Ask Pipeline Execution", () => {
  const envOriginal = process.env.AI_ENABLED;

  beforeEach(() => {
    process.env.AI_ENABLED = "true";
  });

  afterEach(() => {
    process.env.AI_ENABLED = envOriginal;
  });

  const validDocId = "22222222-2222-2222-2222-222222222222";
  const userId = "user-test-1";

  const sampleBlocks: ContextBlock[] = [
    {
      id: "b-1",
      document_id: validDocId,
      position: 1,
      type: "paragraph",
      heading_level: null,
      text: "UniLib is an academic reading platform designed for students.",
    },
    {
      id: "b-2",
      document_id: validDocId,
      position: 2,
      type: "paragraph",
      heading_level: null,
      text: "Every factual answer must be backed up by verifiable citations.",
    },
  ];

  it("returns 503 ai_disabled if AI_ENABLED is not true", async () => {
    process.env.AI_ENABLED = "false";
    const res = await executeAskPipeline({
      input: { documentId: validDocId, question: "Test" },
      userId,
      deps: {},
    });

    const body = res.body as PipelineResponseBody;
    expect(res.httpStatus).toBe(503);
    expect(body.error?.code).toBe("ai_disabled");
  });

  it("returns 404 document_not_found if document is absent or not ready", async () => {
    const res = await executeAskPipeline({
      input: { documentId: validDocId, question: "Test" },
      userId,
      deps: {
        getDocumentInfo: async () => null,
        fetchAllBlocks: async () => [],
      },
    });

    const body = res.body as PipelineResponseBody;
    expect(res.httpStatus).toBe(404);
    expect(body.error?.code).toBe("document_not_found");
  });

  it("executes successful question pipeline with mock provider", async () => {
    const mockProvider = new MockAIProvider({
      presetResponse: {
        answerable: true,
        refusal_reason: null,
        segments: [
          {
            text: "UniLib is an academic reading platform [1].",
            citations: [1],
            evidence_quote: "reading platform designed for students",
          },
        ],
      },
    });

    let loggedStatus = "";
    const res = await executeAskPipeline({
      input: { documentId: validDocId, question: "What is UniLib?" },
      userId,
      deps: {
        provider: mockProvider,
        createStartLog: async () => "req-1",
        updateLogResult: async (p) => {
          loggedStatus = p.status;
        },
        getDocumentInfo: async () => ({
          id: validDocId,
          char_count: 500,
          status: "ready",
          title: "Test Document",
        }),
        fetchAllBlocks: async () => sampleBlocks,
      },
    });

    const body = res.body as PipelineResponseBody;
    expect(res.httpStatus).toBe(200);
    expect(body.status).toBe("answered");
    expect(body.segments).toHaveLength(1);
    expect(loggedStatus).toBe("answered");
  });

  it("returns 400 preset_unavailable on large document (>100k chars) with summarize preset", async () => {
    const res = await executeAskPipeline({
      input: { documentId: validDocId, preset: "summarize" },
      userId,
      deps: {
        getDocumentInfo: async () => ({
          id: validDocId,
          char_count: 150000,
          status: "ready",
          title: "Large Book",
        }),
        fetchAllBlocks: async () => sampleBlocks,
      },
    });

    const body = res.body as PipelineResponseBody;
    expect(res.httpStatus).toBe(400);
    expect(body.error?.code).toBe("preset_unavailable");
  });

  it("returns 200 refusal no_context when FTS finds no hits and no focus block", async () => {
    const res = await executeAskPipeline({
      input: { documentId: validDocId, question: "Quantum physics" },
      userId,
      deps: {
        getDocumentInfo: async () => ({
          id: validDocId,
          char_count: 150000, // FTS mode
          status: "ready",
          title: "Large Book",
        }),
        fetchAllBlocks: async () => sampleBlocks,
        searchFtsBlocks: async () => [], // 0 hits
      },
    });

    const body = res.body as PipelineResponseBody;
    expect(res.httpStatus).toBe(200);
    expect(body.status).toBe("refused");
    expect(body.refusal?.reason).toBe("no_context");
  });
});
