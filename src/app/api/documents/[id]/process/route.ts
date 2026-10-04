import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processDocument } from "@/lib/documents/process";
import { jsonError } from "@/lib/http/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("unauthenticated", "Sign in required to process documents", 401);
  }

  const result = await processDocument(id, user.id);

  if (!result.success) {
    if (result.notFound) {
      return jsonError("document_not_found", "Document not found.", 404);
    }
    if (result.conflict) {
      return jsonError(
        "already_processing",
        result.errorMessage || "Document is already processing or ready.",
        409
      );
    }
    return jsonError(
      result.errorCode || "processing_failed",
      result.errorMessage || "Failed to process document.",
      422
    );
  }

  return NextResponse.json({
    status: "ready",
    blockCount: result.blockCount,
  });
}
