import { describe, expect, it, vi, afterEach } from "vitest";
import { AnthropicProvider } from "@/lib/ai/providers/anthropic";
import { MockAIProvider } from "@/lib/ai/providers/mock";
import { getAIProvider } from "@/lib/ai";
import {
  ProviderBadOutput,
  ProviderRateLimited,
  ProviderTimeout,
  ProviderUnavailable,
} from "@/lib/ai/provider";
import { validateCitationsAndEvidence } from "@/lib/ai/validate";
import { ContextBlock } from "@/lib/ai/types";

describe("T15: Anthropic AI Provider Adapter", () => {
  it("throws ProviderUnavailable when ANTHROPIC_API_KEY is missing", async () => {
    const provider = new AnthropicProvider({ apiKey: "" });

    await expect(
      provider.generateStructured({
        system: "sys",
        user: "usr",
        jsonSchema: {},
      })
    ).rejects.toThrow(ProviderUnavailable);
  });

  it("constructs correct Anthropic Messages API request payload and headers", async () => {
    let capturedUrl = "";
    let capturedOptions: RequestInit | undefined;

    const mockFetch = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
      capturedUrl = url;
      capturedOptions = options;
      return new Response(
        JSON.stringify({
          content: [
            {
              text: JSON.stringify({
                answerable: true,
                refusal_reason: null,
                segments: [
                  {
                    text: "UniLib is for reading.",
                    citations: [1],
                    evidence_quote: "academic reading platform designed",
                  },
                ],
              }),
            },
          ],
          usage: { input_tokens: 120, output_tokens: 45 },
        }),
        { status: 200 }
      );
    });

    const provider = new AnthropicProvider({
      apiKey: "test-anthropic-key",
      model: "claude-3-5-haiku-20241022",
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const result = await provider.generateStructured({
      system: "System prompt instructions",
      user: "User query context",
      jsonSchema: {},
      maxOutputTokens: 1000,
      temperature: 0.2,
    });

    expect(capturedUrl).toBe("https://api.anthropic.com/v1/messages");
    const headers = capturedOptions?.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("test-anthropic-key");
    expect(headers["anthropic-version"]).toBe("2023-06-01");

    const payload = JSON.parse(capturedOptions?.body as string);
    expect(payload.model).toBe("claude-3-5-haiku-20241022");
    expect(payload.system).toBe("System prompt instructions");
    expect(payload.messages[0].content).toBe("User query context");

    expect(result.provider).toBe("anthropic");
    expect(result.usage.inputTokens).toBe(120);
    expect(result.usage.outputTokens).toBe(45);
  });

  it("strips markdown code fence wrappers from raw output text", async () => {
    const rawJsonWithFence = "```json\n{\n  \"answerable\": false,\n  \"refusal_reason\": \"not_in_document\",\n  \"segments\": []\n}\n```";

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ text: rawJsonWithFence }],
          usage: { input_tokens: 50, output_tokens: 20 },
        }),
        { status: 200 }
      )
    );

    const provider = new AnthropicProvider({
      apiKey: "test-key",
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const result = await provider.generateStructured({
      system: "sys",
      user: "usr",
      jsonSchema: {},
    });

    const json = result.json as { answerable: boolean; refusal_reason: string };
    expect(json.answerable).toBe(false);
    expect(json.refusal_reason).toBe("not_in_document");
  });

  it("maps HTTP 429 to ProviderRateLimited", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("Rate limited", { status: 429 }));
    const provider = new AnthropicProvider({ apiKey: "test-key", fetchFn: mockFetch as unknown as typeof fetch });

    await expect(
      provider.generateStructured({ system: "sys", user: "usr", jsonSchema: {} })
    ).rejects.toThrow(ProviderRateLimited);
  });

  it("maps HTTP 500 to ProviderUnavailable", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("Server Error", { status: 500 }));
    const provider = new AnthropicProvider({ apiKey: "test-key", fetchFn: mockFetch as unknown as typeof fetch });

    await expect(
      provider.generateStructured({ system: "sys", user: "usr", jsonSchema: {} })
    ).rejects.toThrow(ProviderUnavailable);
  });

  it("maps non-JSON output to ProviderBadOutput", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ text: "Invalid non-JSON response string" }],
        }),
        { status: 200 }
      )
    );
    const provider = new AnthropicProvider({ apiKey: "test-key", fetchFn: mockFetch as unknown as typeof fetch });

    await expect(
      provider.generateStructured({ system: "sys", user: "usr", jsonSchema: {} })
    ).rejects.toThrow(ProviderBadOutput);
  });

  it("maps fetch AbortError timeout to ProviderTimeout", async () => {
    const mockFetch = vi.fn().mockImplementation(() => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      throw err;
    });
    const provider = new AnthropicProvider({ apiKey: "test-key", fetchFn: mockFetch as unknown as typeof fetch });

    await expect(
      provider.generateStructured({ system: "sys", user: "usr", jsonSchema: {} })
    ).rejects.toThrow(ProviderTimeout);
  });
});

describe("T15: Provider Factory getAIProvider", () => {
  const originalEnv = process.env.AI_PROVIDER;

  afterEach(() => {
    process.env.AI_PROVIDER = originalEnv;
  });

  it("returns AnthropicProvider when AI_PROVIDER=anthropic", () => {
    process.env.AI_PROVIDER = "anthropic";
    const provider = getAIProvider();
    expect(provider).toBeInstanceOf(AnthropicProvider);
  });

  it("returns MockAIProvider when AI_PROVIDER=mock", () => {
    process.env.AI_PROVIDER = "mock";
    const provider = getAIProvider();
    expect(provider).toBeInstanceOf(MockAIProvider);
  });
});

describe("T15: Citation Validation through Real Output Pipeline", () => {
  const docId = "doc-t15-1";
  const contextBlocks: ContextBlock[] = [
    {
      id: "b-1",
      document_id: docId,
      position: 1,
      type: "paragraph",
      heading_level: null,
      text: "UniLib uses strict server-side validation to verify every AI citation and evidence quote.",
    },
  ];

  it("validates grounded provider output and rejects ungrounded quotes", () => {
    const validOutput = {
      answerable: true,
      refusal_reason: null,
      segments: [
        {
          text: "UniLib verifies every citation [1].",
          citations: [1],
          evidence_quote: "strict server-side validation to verify",
        },
      ],
    };

    const resValid = validateCitationsAndEvidence(validOutput, {
      documentId: docId,
      contextBlocks,
    });

    expect(resValid.status).toBe("answered");
    expect(resValid.segments![0].citations[0].blockId).toBe("b-1");

    const invalidOutput = {
      answerable: true,
      refusal_reason: null,
      segments: [
        {
          text: "UniLib uses neural networks for translation.",
          citations: [1],
          evidence_quote: "neural networks for translation",
        },
      ],
    };

    const resInvalid = validateCitationsAndEvidence(invalidOutput, {
      documentId: docId,
      contextBlocks,
    });

    expect(resInvalid.status).toBe("refused");
    expect(resInvalid.refusalReason).toBe("unverifiable");
  });
});
