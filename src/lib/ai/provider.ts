import "server-only";

export class ProviderTimeout extends Error {
  constructor(message = "AI provider timed out") {
    super(message);
    this.name = "ProviderTimeout";
  }
}

export class ProviderRateLimited extends Error {
  constructor(message = "AI provider rate limited") {
    super(message);
    this.name = "ProviderRateLimited";
  }
}

export class ProviderUnavailable extends Error {
  constructor(message = "AI provider unavailable") {
    super(message);
    this.name = "ProviderUnavailable";
  }
}

export class ProviderBadOutput extends Error {
  constructor(message = "AI provider returned invalid structured output") {
    super(message);
    this.name = "ProviderBadOutput";
  }
}

export interface StructuredOutputParams {
  system: string;
  user: string;
  jsonSchema: Record<string, unknown>;
  maxOutputTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface StructuredOutputResult {
  json: unknown;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;
  provider: string;
}

export interface AIProvider {
  generateStructured(params: StructuredOutputParams): Promise<StructuredOutputResult>;
}
