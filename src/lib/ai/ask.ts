import "server-only";
import { z } from "zod";
import { AIProvider, ProviderRateLimited, ProviderTimeout, ProviderUnavailable } from "./provider";
import { MockAIProvider } from "./providers/mock";
import { aiOutputSchema } from "./schema";
import { buildUserMessage } from "./prompt";
import { validateCitationsAndEvidence } from "./validate";
import { getRetrievalContext, PresetUnavailableError } from "./retrieval";
import { checkAIRateLimit } from "./rateLimit";
import { getRefusalMessage, RefusalReason } from "./messages";
import { ContextBlock } from "./types";

export const askInputSchema = z
  .object({
    documentId: z.string().uuid(),
    question: z.string().min(1).max(500).optional(),
    preset: z.enum(["summarize"]).optional(),
    focusBlockId: z.string().uuid().optional(),
  })
  .strict()
  .refine(
    (data) => {
      const hasQuestion = Boolean(data.question);
      const hasPreset = Boolean(data.preset);
      if (hasQuestion === hasPreset) return false;
      if (data.focusBlockId && !hasQuestion) return false;
      return true;
    },
    {
      message:
        "Invalid AI request: must supply exactly one of question or preset. focusBlockId is only allowed when question is supplied.",
    }
  );

export type AskInput = z.infer<typeof askInputSchema>;

export interface AskPipelineDependencies {
  provider?: AIProvider;
  fetchUserRequests?: (params: { userId: string; since: Date }) => Promise<Array<{ id: string; created_at: string; status: string }>>;
  createStartLog?: (params: {
    userId: string;
    documentId: string;
    question: string | null;
    preset: "summarize" | null;
    focusBlockId: string | null;
  }) => Promise<string>;
  updateLogResult?: (params: {
    requestId: string;
    status: "answered" | "refused" | "error";
    retrievalMode?: "full" | "fts";
    contextBlockCount?: number;
    refusalReason?: string | null;
    errorCode?: string | null;
    provider?: string;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    latencyMs?: number;
    citationsReturned?: number;
    segmentsDropped?: number;
    response?: Record<string, unknown>;
  }) => Promise<void>;
  getDocumentInfo?: (docId: string) => Promise<{ id: string; char_count: number; status: string; title: string } | null>;
  fetchAllBlocks?: (docId: string) => Promise<ContextBlock[]>;
  searchFtsBlocks?: (docId: string, query: string, topK: number) => Promise<Array<{ id: string; position: number; rank: number }>>;
}

export interface AskPipelineOptions {
  input: AskInput;
  userId: string;
  deps: AskPipelineDependencies;
}

export interface AskPipelineResponse {
  httpStatus: number;
  body: Record<string, unknown>;
}

export async function executeAskPipeline(
  options: AskPipelineOptions
): Promise<AskPipelineResponse> {
  const { input, userId, deps } = options;
  const startTime = Date.now();

  // 1. Feature Flag Check
  if (process.env.AI_ENABLED !== "true") {
    return {
      httpStatus: 503,
      body: { error: { code: "ai_disabled", message: "AI assistant is currently disabled." } },
    };
  }

  // 2. Rate Limit Check
  if (deps.fetchUserRequests) {
    const rateCheck = await checkAIRateLimit({
      userId,
      fetchUserRequests: deps.fetchUserRequests,
    });

    if (!rateCheck.allowed) {
      return {
        httpStatus: 429,
        body: {
          error: {
            code: "rate_limited",
            message: "You have reached your AI request limit. Please try again later.",
            retryAfterSeconds: rateCheck.retryAfterSeconds,
          },
        },
      };
    }
  }

  // 3. Log Start
  let requestId: string | null = null;
  if (deps.createStartLog) {
    try {
      requestId = await deps.createStartLog({
        userId,
        documentId: input.documentId,
        question: input.question || null,
        preset: input.preset || null,
        focusBlockId: input.focusBlockId || null,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("concurrency_limit_exceeded")) {
        return {
          httpStatus: 429,
          body: {
            error: {
              code: "rate_limited",
              message: "Maximum 2 concurrent AI requests allowed. Please wait for your previous request to finish.",
              retryAfterSeconds: 30,
            },
          },
        };
      }
      return {
        httpStatus: 500,
        body: { error: { code: "internal", message: "Failed to record AI request log." } },
      };
    }
  }

  const safeUpdateLog = async (data: Parameters<NonNullable<AskPipelineDependencies["updateLogResult"]>>[0]) => {
    if (requestId && deps.updateLogResult) {
      try {
        await deps.updateLogResult(data);
      } catch {
        // Log failure non-fatal to response
      }
    }
  };

  // 4. Load Document
  if (!deps.getDocumentInfo || !deps.fetchAllBlocks) {
    await safeUpdateLog({ requestId: requestId!, status: "error", errorCode: "internal" });
    return {
      httpStatus: 500,
      body: { error: { code: "internal", message: "Database dependency missing." } },
    };
  }

  const doc = await deps.getDocumentInfo(input.documentId);
  if (!doc || doc.status !== "ready") {
    await safeUpdateLog({ requestId: requestId!, status: "error", errorCode: "document_not_found" });
    return {
      httpStatus: 404,
      body: { error: { code: "document_not_found", message: "Document not found or not ready." } },
    };
  }

  // 5. Context Selection / Retrieval
  let retrievalResult;
  try {
    retrievalResult = await getRetrievalContext({
      documentId: doc.id,
      charCount: doc.char_count,
      question: input.question,
      preset: input.preset,
      focusBlockId: input.focusBlockId,
      fetchAllBlocks: deps.fetchAllBlocks,
      searchFtsBlocks: deps.searchFtsBlocks,
    });
  } catch (err) {
    if (err instanceof PresetUnavailableError) {
      await safeUpdateLog({ requestId: requestId!, status: "error", errorCode: "preset_unavailable" });
      return {
        httpStatus: 400,
        body: { error: { code: "preset_unavailable", message: err.message } },
      };
    }
    await safeUpdateLog({ requestId: requestId!, status: "error", errorCode: "internal" });
    return {
      httpStatus: 500,
      body: { error: { code: "internal", message: "Failed to retrieve document context." } },
    };
  }

  // FTS with no hits and no focus block -> Refusal no_context without model call
  if (retrievalResult.noContextHit) {
    const refusalMsg = getRefusalMessage("no_context");
    const responseBody = {
      status: "refused",
      refusal: { reason: "no_context", message: refusalMsg },
      meta: {
        retrievalMode: retrievalResult.retrievalMode,
        contextBlocks: 0,
        segmentsDropped: 0,
      },
    };

    await safeUpdateLog({
      requestId: requestId!,
      status: "refused",
      refusalReason: "no_context",
      retrievalMode: retrievalResult.retrievalMode,
      contextBlockCount: 0,
      latencyMs: Date.now() - startTime,
      response: responseBody,
    });

    return { httpStatus: 200, body: responseBody };
  }

  // 6. Prompt Construction
  let taskDescription = input.question || "";
  if (input.preset === "summarize") {
    taskDescription = "Summarize the key points of this document.";
  } else if (input.focusBlockId) {
    taskDescription = input.question || "Explain this paragraph in simple terms.";
  }

  let focusPosition: number | undefined;
  if (input.focusBlockId) {
    const focusBlock = retrievalResult.blocks.find((b) => b.id === input.focusBlockId);
    if (focusBlock) {
      focusPosition = focusBlock.position;
    }
  }

  const promptBlocks = retrievalResult.blocksWithGaps.map((b) => ({
    position: b.position,
    type: b.type,
    text: b.text,
    isGap: b.isGap,
  }));

  const userPrompt = buildUserMessage({
    title: doc.title,
    blocks: promptBlocks,
    task: taskDescription,
    focusPosition,
  });

  // 7. Provider Execution
  const provider = deps.provider || new MockAIProvider();
  let providerResult;
  let attempts = 0;

  while (attempts < 2) {
    attempts++;
    try {
      providerResult = await provider.generateStructured({
        system: "UniLib Assistant System Prompt",
        user: userPrompt,
        jsonSchema: {},
        timeoutMs: 45000,
        temperature: 0.2,
        maxOutputTokens: 1500,
      });
      break;
    } catch (err) {
      if (attempts >= 2) {
        let errorCode = "ai_provider_error";
        let status = 502;
        let msg = "AI provider encountered an error.";

        if (err instanceof ProviderTimeout) {
          errorCode = "ai_timeout";
          status = 504;
          msg = "AI provider timed out.";
        } else if (err instanceof ProviderRateLimited || err instanceof ProviderUnavailable) {
          errorCode = "ai_provider_error";
          status = 502;
          msg = "AI service is currently busy or unavailable.";
        }

        await safeUpdateLog({ requestId: requestId!, status: "error", errorCode });
        return { httpStatus: status, body: { error: { code: errorCode, message: msg } } };
      }
      await new Promise((res) => setTimeout(res, 1000));
    }
  }

  if (!providerResult) {
    await safeUpdateLog({ requestId: requestId!, status: "error", errorCode: "ai_provider_error" });
    return {
      httpStatus: 502,
      body: { error: { code: "ai_provider_error", message: "AI provider failed to generate response." } },
    };
  }

  // 8. Schema Parsing & Repair Retry
  let parseResult = aiOutputSchema.safeParse(providerResult.json);
  if (!parseResult.success) {
    try {
      const repairPrompt = `${userPrompt}\n\nNote: Your previous output was invalid JSON/schema; return ONLY valid JSON matching the schema.`;
      const repairResult = await provider.generateStructured({
        system: "UniLib Assistant System Prompt",
        user: repairPrompt,
        jsonSchema: {},
        timeoutMs: 45000,
        temperature: 0.2,
        maxOutputTokens: 1500,
      });
      parseResult = aiOutputSchema.safeParse(repairResult.json);
    } catch {
      // ignore
    }
  }

  if (!parseResult.success) {
    await safeUpdateLog({ requestId: requestId!, status: "error", errorCode: "ai_invalid_output" });
    return {
      httpStatus: 502,
      body: { error: { code: "ai_invalid_output", message: "AI produced malformed output." } },
    };
  }

  const rawAiOutput = parseResult.data;

  // 9. Citation & Evidence Validation
  const validation = validateCitationsAndEvidence(rawAiOutput, {
    documentId: doc.id,
    contextBlocks: retrievalResult.blocks,
  });

  const latencyMs = Date.now() - startTime;

  if (validation.status === "refused") {
    const reasonKey = (validation.refusalReason || "not_in_document") as RefusalReason;
    const refusalMsg = getRefusalMessage(reasonKey);

    const responseBody = {
      status: "refused",
      refusal: { reason: reasonKey, message: refusalMsg },
      meta: {
        retrievalMode: retrievalResult.retrievalMode,
        contextBlocks: retrievalResult.blocks.length,
        segmentsDropped: validation.segmentsDropped,
      },
    };

    await safeUpdateLog({
      requestId: requestId!,
      status: "refused",
      refusalReason: reasonKey,
      retrievalMode: retrievalResult.retrievalMode,
      contextBlockCount: retrievalResult.blocks.length,
      provider: providerResult.provider,
      model: providerResult.model,
      inputTokens: providerResult.usage.inputTokens,
      outputTokens: providerResult.usage.outputTokens,
      latencyMs,
      citationsReturned: 0,
      segmentsDropped: validation.segmentsDropped,
      response: responseBody,
    });

    return { httpStatus: 200, body: responseBody };
  }

  // Answered
  const totalCitations = validation.segments!.reduce(
    (acc, seg) => acc + seg.citations.length,
    0
  );

  const responseBody = {
    status: "answered",
    segments: validation.segments,
    meta: {
      retrievalMode: retrievalResult.retrievalMode,
      contextBlocks: retrievalResult.blocks.length,
      segmentsDropped: validation.segmentsDropped,
    },
  };

  await safeUpdateLog({
    requestId: requestId!,
    status: "answered",
    retrievalMode: retrievalResult.retrievalMode,
    contextBlockCount: retrievalResult.blocks.length,
    provider: providerResult.provider,
    model: providerResult.model,
    inputTokens: providerResult.usage.inputTokens,
    outputTokens: providerResult.usage.outputTokens,
    latencyMs,
    citationsReturned: totalCitations,
    segmentsDropped: validation.segmentsDropped,
    response: responseBody,
  });

  return { httpStatus: 200, body: responseBody };
}
