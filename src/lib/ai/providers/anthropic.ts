import "server-only";
import {
  AIProvider,
  ProviderBadOutput,
  ProviderRateLimited,
  ProviderTimeout,
  ProviderUnavailable,
  StructuredOutputParams,
  StructuredOutputResult,
} from "../provider";

export interface AnthropicProviderOptions {
  apiKey?: string;
  model?: string;
  fetchFn?: typeof fetch;
}

interface AnthropicResponseBody {
  content?: Array<{ text?: string }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

export class AnthropicProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private customFetch: typeof fetch;

  constructor(options?: AnthropicProviderOptions) {
    this.apiKey = options?.apiKey || process.env.ANTHROPIC_API_KEY || "";
    this.model = options?.model || process.env.AI_MODEL || "claude-3-5-haiku-20241022";
    this.customFetch = options?.fetchFn || fetch;
  }

  async generateStructured(params: StructuredOutputParams): Promise<StructuredOutputResult> {
    if (!this.apiKey) {
      throw new ProviderUnavailable("Anthropic API key is not configured.");
    }

    const timeoutMs = params.timeoutMs || 45000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const payload = {
      model: this.model,
      max_tokens: params.maxOutputTokens || 1500,
      temperature: params.temperature ?? 0.2,
      system: params.system,
      messages: [{ role: "user", content: params.user }],
    };

    let response: Response;
    try {
      response = await this.customFetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        throw new ProviderTimeout("Anthropic API request timed out.");
      }
      throw new ProviderUnavailable("Failed to connect to Anthropic API.");
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 429) {
      throw new ProviderRateLimited("Anthropic API rate limit exceeded.");
    }

    if (response.status >= 500) {
      throw new ProviderUnavailable("Anthropic API service error.");
    }

    if (!response.ok) {
      throw new ProviderUnavailable(`Anthropic API request failed with status ${response.status}.`);
    }

    let responseData: AnthropicResponseBody;
    try {
      responseData = (await response.json()) as AnthropicResponseBody;
    } catch {
      throw new ProviderBadOutput("Anthropic API returned invalid non-JSON response body.");
    }

    const rawText = responseData?.content?.[0]?.text || "";
    if (!rawText) {
      throw new ProviderBadOutput("Anthropic API response contained no text content.");
    }

    // Strip Markdown ```json ... ``` code fence wrappers if present
    const cleanedText = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(cleanedText);
    } catch {
      throw new ProviderBadOutput("Anthropic API text output failed JSON schema parsing.");
    }

    const inputTokens = responseData?.usage?.input_tokens || 0;
    const outputTokens = responseData?.usage?.output_tokens || 0;

    return {
      json: parsedJson,
      usage: {
        inputTokens,
        outputTokens,
      },
      model: this.model,
      provider: "anthropic",
    };
  }
}
