import "server-only";
import { AIProvider, ProviderUnavailable, StructuredOutputParams, StructuredOutputResult } from "../provider";

export class MockAIProvider implements AIProvider {
  private presetResponse: unknown | null = null;
  private shouldFailWith: Error | null = null;

  constructor(options?: { presetResponse?: unknown; shouldFailWith?: Error }) {
    if (process.env.VERCEL_ENV === "production") {
      throw new ProviderUnavailable("Mock AI provider is blocked in production environment.");
    }
    if (options?.presetResponse) {
      this.presetResponse = options.presetResponse;
    }
    if (options?.shouldFailWith) {
      this.shouldFailWith = options.shouldFailWith;
    }
  }

  setPresetResponse(response: unknown): void {
    this.presetResponse = response;
  }

  setFailure(error: Error | null): void {
    this.shouldFailWith = error;
  }

  async generateStructured(params: StructuredOutputParams): Promise<StructuredOutputResult> {
    void params;
    if (process.env.VERCEL_ENV === "production") {
      throw new ProviderUnavailable("Mock AI provider is blocked in production environment.");
    }

    if (this.shouldFailWith) {
      throw this.shouldFailWith;
    }

    if (this.presetResponse !== null) {
      return {
        json: this.presetResponse,
        usage: { inputTokens: 100, outputTokens: 50 },
        model: "mock-model",
        provider: "mock",
      };
    }

    // Default mock response: grounded sample
    return {
      json: {
        answerable: true,
        refusal_reason: null,
        segments: [
          {
            text: "This document describes the primary principles of UniLib.",
            citations: [1],
            evidence_quote: "primary principles of UniLib",
          },
        ],
      },
      usage: { inputTokens: 100, outputTokens: 50 },
      model: "mock-model",
      provider: "mock",
    };
  }
}
