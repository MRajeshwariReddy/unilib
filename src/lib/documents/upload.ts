import { createClient } from "@/lib/supabase/client";
import type { LicenseValue } from "@/lib/config/licenses";

export interface UploadDocumentParams {
  file: File;
  title: string;
  description?: string;
  subject?: string;
  license: LicenseValue;
  rightsAttested: true;
}

export interface UploadDocumentResult {
  success: boolean;
  documentId?: string;
  status?: string;
  errorCode?: string;
  errorMessage?: string;
}

export async function uploadAndProcessDocument(
  params: UploadDocumentParams
): Promise<UploadDocumentResult> {
  const { file, title, description, subject, license, rightsAttested } = params;

  // 1. Create document record via API
  const createRes = await fetch("/api/documents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      description: description || null,
      subject: subject || null,
      license,
      rightsAttested,
      originalFilename: file.name,
      fileSizeBytes: file.size,
    }),
  });

  if (!createRes.ok) {
    const errorJson = await createRes.json().catch(() => ({}));
    return {
      success: false,
      errorCode: errorJson?.error?.code || "create_failed",
      errorMessage: errorJson?.error?.message || "Failed to create document record.",
    };
  }

  const { id, storagePath } = await createRes.json();

  // 2. Direct upload to Supabase Storage
  const supabase = createClient();
  const { error: storageError } = await supabase.storage
    .from("documents")
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (storageError) {
    // Cleanup created document row
    await fetch(`/api/documents/${id}`, { method: "DELETE" }).catch(() => {});
    return {
      success: false,
      errorCode: "storage_error",
      errorMessage: "Failed to upload file to storage. Please try again.",
    };
  }

  // 3. Trigger processing
  const processRes = await fetch(`/api/documents/${id}/process`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const processJson = await processRes.json().catch(() => ({}));

  if (!processRes.ok) {
    return {
      success: false,
      documentId: id,
      errorCode: processJson?.error?.code || "processing_failed",
      errorMessage: processJson?.error?.message || "Document processing failed.",
    };
  }

  return {
    success: true,
    documentId: id,
    status: processJson?.status || "ready",
  };
}
