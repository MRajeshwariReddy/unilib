import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as createDocRoute } from "@/app/api/documents/route";
import { POST as processDocRoute } from "@/app/api/documents/[id]/process/route";
import { DELETE as deleteDocRoute } from "@/app/api/documents/[id]/route";

let mockUser: { id: string; email: string } | null = null;
let mockQuotaCount = 0;
let mockExistingDoc: { id: string; owner_id: string; status: string; storage_path: string } | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: vi.fn().mockImplementation(async () => ({
        data: { user: mockUser },
        error: null,
      })),
    },
    from: (table: string) => {
      if (table === "documents") {
        return {
          select: (cols: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.count === "exact") {
              return {
                eq: () => ({
                  count: mockQuotaCount,
                  error: null,
                }),
              };
            }
            return {
              eq: (col: string, val: string) => ({
                eq: (col2: string, val2: string) => ({
                  single: async () => {
                    if (mockExistingDoc && mockExistingDoc.id === val && mockExistingDoc.owner_id === val2) {
                      return { data: mockExistingDoc, error: null };
                    }
                    return { data: null, error: { message: "Not found" } };
                  },
                }),
                single: async () => {
                  if (mockExistingDoc && mockExistingDoc.id === val) {
                    return { data: mockExistingDoc, error: null };
                  }
                  return { data: null, error: { message: "Not found" } };
                },
              }),
            };
          },
          insert: async () => ({ error: null }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                or: () => ({
                  select: async () => {
                    if (mockExistingDoc && mockExistingDoc.status === "processing") {
                      return { data: [], error: null };
                    }
                    if (mockExistingDoc) {
                      return {
                        data: [
                          {
                            id: mockExistingDoc.id,
                            storage_path: mockExistingDoc.storage_path,
                            source_format: "md",
                          },
                        ],
                        error: null,
                      };
                    }
                    return { data: [], error: null };
                  },
                }),
              }),
            }),
          }),
          delete: () => ({
            eq: () => ({
              eq: async () => ({ error: null }),
            }),
          }),
        };
      }
      return {};
    },
    storage: {
      from: () => ({
        download: async () => ({
          arrayBuffer: async () => Buffer.from("# Test Document\n\nSome text."),
        }),
        remove: async () => ({ error: null }),
      }),
    },
  }),
}));

describe("T06 Document Lifecycle Routes & Business Logic", () => {
  beforeEach(() => {
    mockUser = null;
    mockQuotaCount = 0;
    mockExistingDoc = null;
  });

  it("POST /api/documents rejects unauthenticated request with 401", async () => {
    const req = new Request("http://localhost:3000/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await createDocRoute(req);
    expect(res.status).toBe(401);
  });

  it("POST /api/documents rejects unsupported file format (e.g. .pdf) with 400", async () => {
    mockUser = { id: "user-123", email: "user@example.com" };

    const req = new Request("http://localhost:3000/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test PDF",
        license: "cc_by",
        rightsAttested: true,
        originalFilename: "sample.pdf",
        fileSizeBytes: 1000,
      }),
    });

    const res = await createDocRoute(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("unsupported_format");
  });

  it("POST /api/documents enforces 20-doc quota with 409", async () => {
    mockUser = { id: "user-123", email: "user@example.com" };
    mockQuotaCount = 20;

    const req = new Request("http://localhost:3000/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Over Quota Doc",
        license: "cc_by",
        rightsAttested: true,
        originalFilename: "sample.md",
        fileSizeBytes: 1000,
      }),
    });

    const res = await createDocRoute(req);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe("quota_exceeded");
  });

  it("POST /api/documents/[id]/process returns 409 when document is already processing", async () => {
    mockUser = { id: "user-123", email: "user@example.com" };
    mockExistingDoc = {
      id: "doc-456",
      owner_id: "user-123",
      status: "processing",
      storage_path: "user-123/doc-456/original.md",
    };

    const req = new Request("http://localhost:3000/api/documents/doc-456/process", {
      method: "POST",
    });

    const params = Promise.resolve({ id: "doc-456" });
    const res = await processDocRoute(req, { params });

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe("already_processing");
  });

  it("DELETE /api/documents/[id] returns 404 for non-existent document", async () => {
    mockUser = { id: "user-123", email: "user@example.com" };

    const req = new Request("http://localhost:3000/api/documents/non-existent", {
      method: "DELETE",
    });

    const params = Promise.resolve({ id: "non-existent" });
    const res = await deleteDocRoute(req, { params });

    expect(res.status).toBe(404);
  });
});
