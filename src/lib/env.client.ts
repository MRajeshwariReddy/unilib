import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().catch("https://placeholder.supabase.co"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().catch("placeholder-anon-key"),
  NEXT_PUBLIC_SITE_URL: z.string().catch("http://localhost:3000"),
  NEXT_PUBLIC_COPYRIGHT_CONTACT_EMAIL: z.string().email().catch("copyright@unilib.local"),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

function getClientEnv(): ClientEnv {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_COPYRIGHT_CONTACT_EMAIL: process.env.NEXT_PUBLIC_COPYRIGHT_CONTACT_EMAIL,
  });

  if (!parsed.success) {
    console.error("Invalid client environment variables:", parsed.error.format());
    throw new Error("Invalid client environment variables");
  }
  return parsed.data;
}

export const clientEnv = getClientEnv();
