import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  const aiConfigured =
    serverEnv.AI_ENABLED &&
    (serverEnv.AI_PROVIDER === "mock" || Boolean(serverEnv.ANTHROPIC_API_KEY));

  const openAlexConfigured = Boolean(serverEnv.OPENALEX_API_KEY);

  return NextResponse.json({
    status: "ok",
    aiConfigured,
    openAlexConfigured,
  });
}
