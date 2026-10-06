import { createClient } from "@/lib/supabase/server";
import { parseDocument } from "./parsers";
import { getErrorMessage } from "./errors";
import type { SourceFormat } from "@/lib/types/database";

export interface ProcessDocumentResult {
  success: boolean;
  conflict?: boolean;
  notFound?: boolean;
  status?: string;
  blockCount?: number;
  charCount?: number;
  errorCode?: string;
  errorMessage?: string;
}

export async function processDocument(
  documentId: string,
  userId: string
): Promise<ProcessDocumentResult> {
  const supabase = await createClient();

  // 1. Atomic claim check and update
  const reclaimThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: claimedDocs, error: claimError } = await supabase
    .from("documents")
    .update({
      status: "processing",
      error_code: null,
      error_message: null,
    })
    .eq("id", documentId)
    .eq("owner_id", userId)
    .or(`status.in.(uploaded,failed),and(status.eq.processing,updated_at.lt.${reclaimThreshold})`)
    .select("id, storage_path, source_format");

  if (claimError || !claimedDocs || claimedDocs.length === 0) {
    // Check if document exists at all or is already processing/ready
    const { data: existing } = await supabase
      .from("documents")
      .select("status, owner_id")
      .eq("id", documentId)
      .single();

    if (!existing || existing.owner_id !== userId) {
      return { success: false, notFound: true, errorCode: "not_found", errorMessage: "Document not found." };
    }

    return {
      success: false,
      conflict: true,
      errorCode: "conflict",
      errorMessage: `Document is already ${existing.status}.`,
    };
  }

  const doc = claimedDocs[0];
  const storagePath = doc.storage_path;
  const sourceFormat = doc.source_format as SourceFormat;

  try {
    // 2. Clear any existing blocks (retry cleanup)
    await supabase.from("blocks").delete().eq("document_id", documentId);

    // 3. Download object from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(storagePath);

    if (downloadError || !fileData) {
      const errCode = "storage_error";
      const errMsg = getErrorMessage(errCode);
      await markFailed(supabase, documentId, errCode, errMsg);
      return { success: false, errorCode: errCode, errorMessage: errMsg };
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Parse document
    const parseResult = await parseDocument(buffer, sourceFormat);

    if (!parseResult.success) {
      await markFailed(supabase, documentId, parseResult.errorCode, parseResult.errorMessage);
      return {
        success: false,
        errorCode: parseResult.errorCode,
        errorMessage: parseResult.errorMessage,
      };
    }

    // 5. Bulk insert blocks
    const blockInserts = parseResult.blocks.map((b) => ({
      document_id: documentId,
      position: b.position,
      type: b.type,
      heading_level: b.headingLevel || null,
      text: b.text,
    }));

    const { error: insertBlocksError } = await supabase.from("blocks").insert(blockInserts);

    if (insertBlocksError) {
      const errCode = "internal";
      const errMsg = getErrorMessage(errCode);
      await markFailed(supabase, documentId, errCode, errMsg);
      return { success: false, errorCode: errCode, errorMessage: errMsg };
    }

    // 6. Finalize document as ready
    const { error: finalizeError } = await supabase
      .from("documents")
      .update({
        status: "ready",
        block_count: parseResult.blockCount,
        char_count: parseResult.charCount,
        parser_version: "1.0.0",
        processed_at: new Date().toISOString(),
        error_code: null,
        error_message: null,
      })
      .eq("id", documentId)
      .eq("owner_id", userId);

    if (finalizeError) {
      const errCode = "internal";
      const errMsg = getErrorMessage(errCode);
      await markFailed(supabase, documentId, errCode, errMsg);
      return { success: false, errorCode: errCode, errorMessage: errMsg };
    }

    return {
      success: true,
      status: "ready",
      blockCount: parseResult.blockCount,
      charCount: parseResult.charCount,
    };
  } catch {
    const errCode = "internal";
    const errMsg = getErrorMessage(errCode);
    await markFailed(supabase, documentId, errCode, errMsg);
    return { success: false, errorCode: errCode, errorMessage: errMsg };
  }
}

async function markFailed(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  documentId: string,
  errorCode: string,
  errorMessage: string
) {
  try {
    await supabase.from("blocks").delete().eq("document_id", documentId);
    await supabase
      .from("documents")
      .update({
        status: "failed",
        error_code: errorCode,
        error_message: errorMessage,
      })
      .eq("id", documentId);
  } catch {
    // Ignore secondary cleanup error
  }
}
