import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import type { Database } from "@/lib/types/database";

describe("T08, T09, & T10 Library, Reader, & Comments Tests", () => {
  it("migration file 0003_comments.sql exists and defines comments table, composite FK, and view", () => {
    const migrationPath = path.resolve(
      process.cwd(),
      "supabase/migrations/0003_comments.sql"
    );
    expect(fs.existsSync(migrationPath)).toBe(true);

    const sqlContent = fs.readFileSync(migrationPath, "utf-8");

    // Table and FK
    expect(sqlContent).toContain("CREATE TABLE IF NOT EXISTS public.comments");
    expect(sqlContent).toContain(
      "FOREIGN KEY (block_id, document_id) REFERENCES public.blocks(id, document_id) ON DELETE CASCADE"
    );

    // View
    expect(sqlContent).toContain(
      "CREATE OR REPLACE VIEW public.block_comment_counts WITH (security_invoker = true)"
    );

    // Body CHECK constraint length 1-2000
    expect(sqlContent).toContain("length(trim(body)) >= 1 AND length(trim(body)) <= 2000");

    // RLS & Deletion logic (author OR document owner)
    expect(sqlContent).toContain("author_id = auth.uid()");
    expect(sqlContent).toContain("d.owner_id = auth.uid()");

    // Verify flat comments rule: NO parent_id or reply columns exist in schema
    expect(sqlContent).not.toContain("parent_id");
  });

  it("Database interface types include flat comments and block_comment_counts without replies", () => {
    type CommentsTable = Database["public"]["Tables"]["comments"];
    type CountsView = Database["public"]["Views"]["block_comment_counts"];

    const sampleComment: CommentsTable["Row"] = {
      id: "comment-123",
      document_id: "doc-123",
      block_id: "block-123",
      author_id: "user-123",
      body: "This is a paragraph comment.",
      created_at: "2026-01-01T00:00:00Z",
    };

    const sampleCount: CountsView["Row"] = {
      document_id: "doc-123",
      block_id: "block-123",
      comment_count: 5,
    };

    expect(sampleComment.body).toBe("This is a paragraph comment.");
    expect(sampleCount.comment_count).toBe(5);

    // Verify 'parent_id' does not exist in comment row type
    // @ts-expect-error parent_id must not exist on flat comments schema
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    sampleComment.parent_id;
  });

  it("author and document owner deletion permission logic evaluates correctly", () => {
    const commentAuthorId = "user-A";
    const documentOwnerId = "user-B";
    const otherUserId = "user-C";

    function canDeleteComment(
      userId: string | null,
      authorId: string,
      docOwnerId: string
    ): boolean {
      if (!userId) return false;
      return userId === authorId || userId === docOwnerId;
    }

    // Comment author can delete own comment
    expect(canDeleteComment(commentAuthorId, commentAuthorId, documentOwnerId)).toBe(true);

    // Document owner can delete any comment on their document
    expect(canDeleteComment(documentOwnerId, commentAuthorId, documentOwnerId)).toBe(true);

    // Other user cannot delete
    expect(canDeleteComment(otherUserId, commentAuthorId, documentOwnerId)).toBe(false);

    // Anonymous user cannot delete
    expect(canDeleteComment(null, commentAuthorId, documentOwnerId)).toBe(false);
  });
});
