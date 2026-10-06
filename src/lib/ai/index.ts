import "server-only";
import { AIProvider, ProviderUnavailable } from "./provider";
import { AnthropicProvider } from "./providers/anthropic";
import { MockAIProvider } from "./providers/mock";

export function getAIProvider(): AIProvider {
  const providerType = (process.env.AI_PROVIDER || "mock").toLowerCase();

  if (providerType === "anthropic") {
    return new AnthropicProvider();
  }

  if (process.env.VERCEL_ENV === "production") {
    throw new ProviderUnavailable("Mock AI provider cannot be used in production environment.");
  }

  return new MockAIProvider();
}

export * from "./provider";
export * from "./types";
