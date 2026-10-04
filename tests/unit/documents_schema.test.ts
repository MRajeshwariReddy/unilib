import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import type { Database } from "@/lib/types/database";

describe("T03 Migration & Schema Definitions", () => {
  it("migration file 0002_documents_blocks_storage.sql exists and contains required SQL statements", () => {
    const migrationPath = path.resolve(
      process.cwd(),
      "supabase/migrations/0002_documents_blocks_storage.sql"
    );
    expect(fs.existsSync(migrationPath)).toBe(true);

    const sqlContent = fs.readFileSync(migrationPath, "utf-8");

    // Tables
    expect(sqlContent).toContain("CREATE TABLE IF NOT EXISTS public.documents");
    expect(sqlContent).toContain("CREATE TABLE IF NOT EXISTS public.blocks");

    // Trigger & functions
    expect(sqlContent).toContain("FUNCTION public.set_updated_at()");
    expect(sqlContent).toContain("FUNCTION public.search_blocks");

    // Storage bucket
    expect(sqlContent).toContain("INSERT INTO storage.buckets");
    expect(sqlContent).toContain("'documents'");

    // RLS
    expect(sqlContent).toContain("ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;");
    expect(sqlContent).toContain("ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;");

    // Grants
    expect(sqlContent).toContain("REVOKE ALL ON public.documents FROM PUBLIC, anon, authenticated;");
    expect(sqlContent).toContain("GRANT UPDATE (status, error_code, error_message, block_count, char_count, parser_version, processed_at) ON public.documents TO authenticated;");
  });

  it("Database interface type structure allows document and block typing", () => {
    type DocumentsTable = Database["public"]["Tables"]["documents"];
    type BlocksTable = Database["public"]["Tables"]["blocks"];

    // Verify row types compile cleanly
    const sampleDocRow: DocumentsTable["Row"] = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      owner_id: "123e4567-e89b-12d3-a456-426614174001",
      title: "Sample Lecture Notes",
      description: "Introductory computer science lecture",
      subject: "Computer Science",
      license: "cc_by",
      rights_attested: true,
      source_format: "docx",
      original_filename: "lecture.docx",
      file_size_bytes: 1048576,
      storage_path: "owner/doc/original.docx",
      status: "ready",
      error_code: null,
      error_message: null,
      block_count: 10,
      char_count: 12000,
      parser_version: "1.0.0",
      processed_at: "2026-01-01T00:00:00Z",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    const sampleBlockRow: BlocksTable["Row"] = {
      id: "223e4567-e89b-12d3-a456-426614174000",
      document_id: "123e4567-e89b-12d3-a456-426614174000",
      position: 1,
      type: "paragraph",
      heading_level: null,
      text: "First paragraph text.",
      text_search: null,
      created_at: "2026-01-01T00:00:00Z",
    };

    expect(sampleDocRow.source_format).toBe("docx");
    expect(sampleBlockRow.position).toBe(1);
  });
});
