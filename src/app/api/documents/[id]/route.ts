import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/http/errors";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("unauthenticated", "Sign in required to delete documents", 401);
  }

  // 1. Fetch document under ownership filter
  const { data: doc, error: fetchError } = await supabase
    .from("documents")
    .select("id, storage_path, owner_id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (fetchError || !doc) {
    return jsonError("document_not_found", "Document not found.", 404);
  }

  // 2. Delete object from storage bucket
  const { error: storageError } = await supabase.storage
    .from("documents")
    .remove([doc.storage_path]);

  if (storageError) {
    // Log error, continue deleting DB row to avoid orphaned record
  }

  // 3. Delete document row from DB (cascades blocks and comments)
  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (deleteError) {
    return jsonError("internal", "Failed to delete document record.", 500);
  }

  return new NextResponse(null, { status: 204 });
}
