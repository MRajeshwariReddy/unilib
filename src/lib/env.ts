import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  AI_ENABLED: z
    .string()
    .transform((val) => val === "true")
    .default("false"),
  AI_PROVIDER: z.enum(["anthropic", "mock"]).default("mock"),
  AI_MODEL: z.string().optional().default("mock-model"),
  ANTHROPIC_API_KEY: z.string().optional().default(""),
  OPENALEX_API_KEY: z.string().optional().default(""),

  AI_FULL_CONTEXT_MAX_CHARS: z.coerce.number().default(100000),
  AI_RETRIEVAL_TOP_K: z.coerce.number().default(8),
  AI_RATE_LIMIT_PER_HOUR: z.coerce.number().default(15),
  AI_RATE_LIMIT_PER_DAY: z.coerce.number().default(60),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().default(1500),
  AI_TIMEOUT_MS: z.coerce.number().default(45000),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function getServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid server environment variables:", parsed.error.format());
    throw new Error("Invalid server environment variables");
  }
  return parsed.data;
}

export const serverEnv = getServerEnv();
