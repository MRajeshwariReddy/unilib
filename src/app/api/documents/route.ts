import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/http/errors";
import { LICENSES } from "@/lib/config/licenses";
import { LIMITS } from "@/lib/config/limits";
import type { SourceFormat, DocumentLicense } from "@/lib/types/database";

export const runtime = "nodejs";

const createDocSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).nullable().optional(),
  subject: z.string().trim().max(100).nullable().optional(),
  license: z.enum(
    LICENSES.map((l) => l.value) as [DocumentLicense, ...DocumentLicense[]]
  ),
  rightsAttested: z.literal(true),
  originalFilename: z.string().trim().min(1).max(255),
  fileSizeBytes: z.number().int().min(1).max(LIMITS.MAX_FILE_SIZE_BYTES),
});

export async function POST(request: Request) {
  // 1. Verify content-type
  const contentType = request.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return jsonError("unsupported_media_type", "Content-Type must be application/json", 415);
  }

  // 2. Verify authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("unauthenticated", "Sign in required to create documents", 401);
  }

  // 3. Parse body
  let body;
  try {
    const raw = await request.json();
    body = createDocSchema.parse(raw);
  } catch {
    return jsonError("invalid_request", "Invalid document metadata or rights attestation missing", 400);
  }

  // 4. Derive source_format from filename
  const extMatch = body.originalFilename.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : "";

  let sourceFormat: SourceFormat;
  if (ext === "docx") {
    sourceFormat = "docx";
  } else if (ext === "md" || ext === "markdown") {
    sourceFormat = "md";
  } else if (ext === "txt") {
    sourceFormat = "txt";
  } else {
    return jsonError(
      "unsupported_format",
      "This file type isn't supported. Upload DOCX, Markdown or TXT (convert PDFs first).",
      400
    );
  }

  // 5. Enforce 20-doc user quota
  const { count, error: countError } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if (countError) {
    return jsonError("internal", "Failed to verify document quota", 500);
  }

  if (count !== null && count >= LIMITS.MAX_DOCUMENTS_PER_USER) {
    return jsonError(
      "quota_exceeded",
      `You have reached the maximum quota of ${LIMITS.MAX_DOCUMENTS_PER_USER} documents.`,
      409
    );
  }

  // 6. Generate UUID and compute storage path
  const docId = crypto.randomUUID();
  const storagePath = `${user.id}/${docId}/original.${ext}`;

  // 7. Insert documents row
  const { error: insertError } = await supabase.from("documents").insert({
    id: docId,
    owner_id: user.id,
    title: body.title,
    description: body.description || null,
    subject: body.subject || null,
    license: body.license,
    rights_attested: true,
    source_format: sourceFormat,
    original_filename: body.originalFilename,
    file_size_bytes: body.fileSizeBytes,
    storage_path: storagePath,
    status: "uploaded",
  });

  if (insertError) {
    return jsonError("internal", "Failed to create document record", 500);
  }

  return NextResponse.json(
    {
      id: docId,
      storagePath,
    },
    { status: 201 }
  );
}
